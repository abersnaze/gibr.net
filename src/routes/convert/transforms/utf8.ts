import { type Transform, type Content } from "../model"

const transforms: Record<string, Transform> = {
  utf8_decode: {
    name: "UTF-8",
    prev: "BinaryDisplay",
    analyze: (data: unknown) => {
      try {
        // Type check - ensure data is a Uint8Array
        if (!(data instanceof Uint8Array)) {
          return { score: 0.0, message: `Expected Uint8Array, got ${typeof data}` }
        }

        const content = new TextDecoder("utf8", { fatal: true }).decode(data)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
    // text -> binary
    invert: (output: Content) => {
      if (typeof output === "string") {
        return new TextEncoder().encode(output)
      }
      throw new Error("Expected string for UTF-8 encoding")
    },
  },
  utf8_encode: {
    name: "UTF-8",
    prev: "TextDisplay",
    analyze: (data: unknown) => {
      try {
        // Type check - ensure data is a string
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }

        const content = new TextEncoder().encode(data)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
    // binary -> text
    invert: (output: Content) => {
      if (output instanceof Uint8Array) {
        return new TextDecoder("utf8", { fatal: true }).decode(output)
      }
      throw new Error("Expected Uint8Array for UTF-8 decoding")
    },
  },
}

export default transforms
