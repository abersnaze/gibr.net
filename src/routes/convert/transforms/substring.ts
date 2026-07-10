import { type Transform, type Content } from "../model"

const transforms: Record<string, Transform> = {
  substring_select: {
    name: "Substring",
    prev: "TextDisplay",
    // No optionsComponent - substring is selected by highlighting text in TextDisplay
    defaults: JSON.stringify({ start: 0, end: 0 }),
    analyze: (data: unknown, options?: string) => {
      try {
        // Parse options to get start and end indices
        const { start, end } = options ? JSON.parse(options) : { start: 0, end: 0 }

        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }

        // Extract substring
        const content = data.substring(start, end)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
    // substring -> full original string with the substring replaced
    invert: (output: Content, originalInput: Content, options?: string) => {
      if (typeof output !== "string") {
        throw new Error("Expected string for substring replacement")
      }
      if (typeof originalInput !== "string") {
        throw new Error("Expected string as the original input")
      }

      const { start, end } = options ? JSON.parse(options) : { start: 0, end: 0 }
      return originalInput.substring(0, start) + output + originalInput.substring(end)
    },
  },
}

export default transforms
