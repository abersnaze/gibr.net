import { type Transform, type Content } from "../model"
import { alphabetConfidence } from "./scoring"

// Schemaless protobuf decode: without a .proto file we only have the wire
// format to go on, so field names are unknowable — messages are decoded to a
// tree keyed by raw field number instead. Wire type is *mostly* unambiguous
// (it's on the wire), except: length-delimited (wire type 2) could be a
// nested message, a UTF-8 string, or raw bytes, and 32/64-bit values (wire
// types 5/1) could be an int or a float. Those get resolved by best-effort
// heuristics below and documented in the field value shapes.

const WIRETYPE_VARINT = 0
const WIRETYPE_FIXED64 = 1
const WIRETYPE_LENGTH_DELIMITED = 2
const WIRETYPE_FIXED32 = 5

const MAX_FIELD_NUMBER = 536870911 // 2^29 - 1, protobuf's field number ceiling

// Marker keys used to disambiguate values that a bare number/string can't
// represent unambiguously (see decodeLengthDelimited / decodeFixed32/64).
const MARKER_KEYS = ["varint", "bytes", "fixed64", "double", "fixed32", "float"]

class WireReader {
  private pos = 0
  constructor(private bytes: Uint8Array) {}

  get remaining(): number {
    return this.bytes.length - this.pos
  }

  private readByte(): number {
    if (this.pos >= this.bytes.length) {
      throw new Error("truncated")
    }
    return this.bytes[this.pos++]
  }

  readVarint(): bigint {
    let result = 0n
    let shift = 0n
    for (let i = 0; i < 10; i++) {
      const byte = this.readByte()
      result |= BigInt(byte & 0x7f) << shift
      if ((byte & 0x80) === 0) return result
      shift += 7n
    }
    throw new Error("varint too long")
  }

  readBytes(n: number): Uint8Array {
    if (n < 0 || this.pos + n > this.bytes.length) {
      throw new Error("truncated")
    }
    const out = this.bytes.subarray(this.pos, this.pos + n)
    this.pos += n
    return out
  }
}

class WireWriter {
  private bytesOut: number[] = []

  private writeByte(b: number): void {
    this.bytesOut.push(b & 0xff)
  }

  writeVarint(value: bigint): void {
    if (value < 0n) {
      throw new Error("varint must be non-negative")
    }
    let v = value
    for (;;) {
      const byte = Number(v & 0x7fn)
      v >>= 7n
      if (v === 0n) {
        this.writeByte(byte)
        return
      }
      this.writeByte(byte | 0x80)
    }
  }

  writeBytes(bytes: Uint8Array): void {
    for (const b of bytes) this.writeByte(b)
  }

  writeTag(fieldNumber: number, wireType: number): void {
    this.writeVarint((BigInt(fieldNumber) << 3n) | BigInt(wireType))
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytesOut)
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "")
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`Invalid hex in bytes marker: "${hex}"`)
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bigintToNumberOrString(v: bigint): number | string {
  return v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString()
}

// A varint decodes to a plain number for round-trippability, except when it
// exceeds Number's safe integer range — then it's wrapped so invert knows to
// go back through BigInt instead of a lossy float.
function decodeVarintValue(v: bigint): number | { varint: string } {
  return v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : { varint: v.toString() }
}

// Reasonable-looking float heuristic: reject NaN/Infinity and magnitudes far
// outside what real-world measurements/coordinates use. This is a guess, not
// a proof — ambiguous cases fall back to the integer interpretation.
function looksLikeReasonableFloat(v: number): boolean {
  if (!Number.isFinite(v)) return false
  if (v === 0) return true
  const abs = Math.abs(v)
  return abs >= 1e-10 && abs <= 1e10
}

function decodeFixed64(bytes: Uint8Array): { double: number } | { fixed64: number | string } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, 8)
  const asDouble = view.getFloat64(0, true)
  if (looksLikeReasonableFloat(asDouble)) {
    return { double: asDouble }
  }
  return { fixed64: bigintToNumberOrString(view.getBigUint64(0, true)) }
}

function decodeFixed32(bytes: Uint8Array): { float: number } | { fixed32: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, 4)
  const asFloat = view.getFloat32(0, true)
  if (looksLikeReasonableFloat(asFloat)) {
    return { float: asFloat }
  }
  return { fixed32: view.getUint32(0, true) }
}

function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    // Reject control characters other than tab/newline/CR: real text rarely
    // has them, and it keeps this from claiming obviously-binary payloads.
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)) return null
    return text
  } catch {
    return null
  }
}

interface ParsedMessage {
  fields: Record<string, unknown>
  fieldCount: number
}

// Strict parse: every tag must have a plausible field number and wire type,
// and the whole buffer must be consumed with nothing left over. Garbage
// bytes are unlikely to satisfy this for more than a field or two by chance
// (see the scoring comment in protobuf_decode below), so a clean parse is
// itself a signal that this really is a nested message.
function tryDecodeMessage(bytes: Uint8Array): ParsedMessage | null {
  const reader = new WireReader(bytes)
  const fields: Record<string, unknown[]> = {}
  let fieldCount = 0
  try {
    while (reader.remaining > 0) {
      const tag = reader.readVarint()
      const fieldNumber = Number(tag >> 3n)
      const wireType = Number(tag & 7n)
      if (fieldNumber < 1 || fieldNumber > MAX_FIELD_NUMBER) return null

      let value: unknown
      switch (wireType) {
        case WIRETYPE_VARINT:
          value = decodeVarintValue(reader.readVarint())
          break
        case WIRETYPE_FIXED64:
          value = decodeFixed64(reader.readBytes(8))
          break
        case WIRETYPE_FIXED32:
          value = decodeFixed32(reader.readBytes(4))
          break
        case WIRETYPE_LENGTH_DELIMITED: {
          const len = Number(reader.readVarint())
          value = decodeLengthDelimited(reader.readBytes(len))
          break
        }
        default:
          // Wire types 3/4 (deprecated groups) or anything else: not
          // something a schemaless decode can make sense of.
          return null
      }

      const key = String(fieldNumber)
      ;(fields[key] ??= []).push(value)
      fieldCount++
    }
  } catch {
    return null
  }
  if (reader.remaining !== 0) return null

  const flattened: Record<string, unknown> = {}
  for (const [key, values] of Object.entries(fields)) {
    flattened[key] = values.length === 1 ? values[0] : values
  }
  return { fields: flattened, fieldCount }
}

// Length-delimited payloads are the truly ambiguous case: try the most
// structured interpretation first (a real nested message parses strictly, so
// false positives are rare), then text, then give up and keep raw bytes.
function decodeLengthDelimited(bytes: Uint8Array): unknown {
  if (bytes.length > 0) {
    const asMessage = tryDecodeMessage(bytes)
    if (asMessage && asMessage.fieldCount > 0) return asMessage.fields
  }
  const asText = tryDecodeUtf8(bytes)
  if (asText !== null) return asText
  return { bytes: toHex(bytes) }
}

function isMarkerObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value as object)
  return keys.length === 1 && MARKER_KEYS.includes(keys[0])
}

function encodeValue(w: WireWriter, fieldNumber: number, value: unknown): void {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(
        `Field ${fieldNumber}: plain numbers encode as a varint and must be non-negative integers — ` +
          `wrap other numbers as { double: n }, { float: n }, or { varint: "n" } for large integers`
      )
    }
    w.writeTag(fieldNumber, WIRETYPE_VARINT)
    w.writeVarint(BigInt(value))
    return
  }

  if (typeof value === "string") {
    w.writeTag(fieldNumber, WIRETYPE_LENGTH_DELIMITED)
    const bytes = new TextEncoder().encode(value)
    w.writeVarint(BigInt(bytes.length))
    w.writeBytes(bytes)
    return
  }

  if (isMarkerObject(value)) {
    const [key] = Object.keys(value)
    switch (key) {
      case "varint":
        w.writeTag(fieldNumber, WIRETYPE_VARINT)
        w.writeVarint(BigInt(value.varint as string))
        return
      case "bytes": {
        w.writeTag(fieldNumber, WIRETYPE_LENGTH_DELIMITED)
        const bytes = fromHex(value.bytes as string)
        w.writeVarint(BigInt(bytes.length))
        w.writeBytes(bytes)
        return
      }
      case "fixed64": {
        w.writeTag(fieldNumber, WIRETYPE_FIXED64)
        const n = value.fixed64 as number | string
        const buf = new ArrayBuffer(8)
        new DataView(buf).setBigUint64(0, typeof n === "string" ? BigInt(n) : BigInt(n), true)
        w.writeBytes(new Uint8Array(buf))
        return
      }
      case "double": {
        w.writeTag(fieldNumber, WIRETYPE_FIXED64)
        const buf = new ArrayBuffer(8)
        new DataView(buf).setFloat64(0, value.double as number, true)
        w.writeBytes(new Uint8Array(buf))
        return
      }
      case "fixed32": {
        w.writeTag(fieldNumber, WIRETYPE_FIXED32)
        const buf = new ArrayBuffer(4)
        new DataView(buf).setUint32(0, value.fixed32 as number, true)
        w.writeBytes(new Uint8Array(buf))
        return
      }
      case "float": {
        w.writeTag(fieldNumber, WIRETYPE_FIXED32)
        const buf = new ArrayBuffer(4)
        new DataView(buf).setFloat32(0, value.float as number, true)
        w.writeBytes(new Uint8Array(buf))
        return
      }
    }
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    w.writeTag(fieldNumber, WIRETYPE_LENGTH_DELIMITED)
    const bytes = encodeMessage(value as Record<string, unknown>)
    w.writeVarint(BigInt(bytes.length))
    w.writeBytes(bytes)
    return
  }

  throw new Error(`Field ${fieldNumber}: unsupported value type for protobuf encoding`)
}

function encodeMessage(fields: Record<string, unknown>): Uint8Array {
  const w = new WireWriter()
  for (const key of Object.keys(fields)) {
    const fieldNumber = Number(key)
    if (!Number.isInteger(fieldNumber) || fieldNumber < 1 || fieldNumber > MAX_FIELD_NUMBER) {
      throw new Error(`Invalid protobuf field number key: "${key}"`)
    }
    const value = fields[key]
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) {
      encodeValue(w, fieldNumber, v)
    }
  }
  return w.toUint8Array()
}

const transforms: Record<string, Transform> = {
  protobuf_decode: {
    name: "Protobuf (schemaless)",
    prev: "BinaryDisplay",
    analyze: (data: unknown) => {
      try {
        if (!(data instanceof Uint8Array)) {
          return { score: 0.0, message: `Expected Uint8Array, got ${typeof data}` }
        }
        if (data.length === 0) {
          return { score: 0.0, message: "Empty input" }
        }
        const parsed = tryDecodeMessage(data)
        if (!parsed || parsed.fieldCount === 0) {
          return {
            score: 0.0,
            message:
              "Bytes do not decode as a protobuf message (bad tag, wire type, or truncated field)",
          }
        }
        // Each field requires its tag byte to land on a plausible wire type
        // (4 of 8 possible 3-bit patterns) and, for length-delimited fields,
        // a length that actually fits the remaining buffer. A random byte
        // stream is unlikely to satisfy that for every field all the way to
        // the end, and less so the more fields there are — same shape as
        // alphabetConfidence's "narrow alphabet + more matches = less likely
        // coincidence" reasoning, just with a per-field coin flip instead of
        // a per-character alphabet check.
        const score = alphabetConfidence(parsed.fieldCount, 4, 8)
        return { score, content: parsed.fields }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
    // tree (field number -> value) -> raw protobuf bytes
    invert: (output: Content) => {
      if (typeof output !== "object" || output === null || Array.isArray(output)) {
        throw new Error("Expected an object keyed by field number for protobuf encoding")
      }
      return encodeMessage(output as Record<string, unknown>)
    },
  },
  protobuf_encode: {
    name: "Protobuf (schemaless)",
    prev: "TreeDisplay",
    analyze: (data: unknown) => {
      try {
        if (typeof data !== "object" || data === null || Array.isArray(data)) {
          return {
            score: 0.0,
            message: `Expected an object of field-number keys, got ${typeof data}`,
          }
        }
        const content = encodeMessage(data as Record<string, unknown>)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
    // raw protobuf bytes -> tree (field number -> value)
    invert: (output: Content) => {
      if (!(output instanceof Uint8Array)) {
        throw new Error("Expected Uint8Array for protobuf decoding")
      }
      const parsed = tryDecodeMessage(output)
      if (!parsed) {
        throw new Error("Bytes do not decode as a protobuf message")
      }
      return parsed.fields
    },
  },
}

export default transforms
