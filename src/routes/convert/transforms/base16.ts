import { type Content, type Transform } from "../model"

function fromHexString(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
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
        const content = fromHexString(data.replace(/[\s]*/g, ""))
        return { score: 1.0, content }
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
