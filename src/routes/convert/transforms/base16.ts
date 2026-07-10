import { type Content, type Transform } from "../model"
import { alphabetConfidence } from "./scoring"

function fromHexString(hexString: string): Uint8Array {
  if (!/^[0-9a-fA-F]*$/.test(hexString)) {
    throw new Error("Invalid hex: contains non-hexadecimal characters")
  }
  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid hex: odd number of digits")
  }
  const bytes = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function toHexString(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "")
}

const transforms: Record<string, Transform> = {
  b16_decode: {
    name: "Base 16",
    prev: "TextDisplay",
    analyze: (data: unknown) => {
      try {
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }
        const stripped = data.replace(/[\s]*/g, "")
        const content = fromHexString(stripped)
        return { score: alphabetConfidence(stripped.length, 16), content }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
    // binary -> hex string
    invert: (output: Content) => {
      if (output instanceof Uint8Array) {
        return toHexString(output)
      }
      throw new Error("Expected Uint8Array for base16 encoding")
    },
  },
  b16_encode: {
    name: "Base 16",
    prev: "BinaryDisplay",
    analyze: (data: unknown) => {
      try {
        if (!(data instanceof Uint8Array)) {
          return { score: 0.0, message: `Expected Uint8Array, got ${typeof data}` }
        }
        const content = toHexString(data)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
    // hex string -> binary
    invert: (output: Content) => {
      if (typeof output === "string") {
        return fromHexString(output.replace(/[\s]*/g, ""))
      }
      throw new Error("Expected string for base16 encoding")
    },
  },
}

export default transforms
