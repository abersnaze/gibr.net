import { type Transform, type Content } from "../model"

const transforms: Record<string, Transform> = {
  utf8_decode: {
    name: "UTF-8",
    prev: "BinaryDisplay",
    analyze: (data: Uint8Array) => {
      try {
        // Type check - ensure data is a Uint8Array
        if (!(data instanceof Uint8Array)) {
          return { score: 0.0, message: `Expected Uint8Array, got ${typeof data}` }
        }

        const content = new TextDecoder("utf8", { fatal: true }).decode(data)

        // Provide the inverse function: text -> binary
        const inverse = (content: Content) => {
          if (typeof content === "string") {
            return new TextEncoder().encode(content)
          }
          throw new Error("Expected string for UTF-8 encoding")
        }

        return {
          score: 1.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
  utf8_encode: {
    name: "UTF-8",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        // Type check - ensure data is a string
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }

        const content = new TextEncoder().encode(data)

        // Provide the inverse function: binary -> text
        const inverse = (content: Content) => {
          if (content instanceof Uint8Array) {
            return new TextDecoder("utf8", { fatal: true }).decode(content)
          }
          throw new Error("Expected Uint8Array for UTF-8 decoding")
        }

        return {
          score: 1.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
}

export default transforms
