import { type Transform, type Content } from "../model"

const transforms: Record<string, Transform> = {
  json_stringify: {
    name: "JSON",
    prev: "TreeDisplay",
    analyze: (data: any) => {
      try {
        const content = JSON.stringify(data, undefined, 2)

        // Provide the inverse function: JSON text -> object
        const inverse = (content: Content, options?: string) => {
          if (typeof content === "string") {
            return JSON.parse(content)
          }
          throw new Error("Expected string for JSON parsing")
        }

        return {
          score: 1.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
  },
  json_parse: {
    name: "JSON",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        const content = JSON.parse(data)

        // Provide the inverse function: object -> JSON text
        const inverse = (content: Content, options?: string) => {
          return JSON.stringify(content, undefined, 2)
        }

        return {
          score: 2.0,
          content,
          inverse,
        }
      } catch (error) {
        // Extract position from error message
        const errorMessage = error instanceof Error ? error.message : String(error)
        let detailedMessage = errorMessage
        let position: number | null = null

        // Try different error message formats
        // Format 1: "... at position 123"
        const positionMatch = errorMessage.match(/position (\d+)/)
        if (positionMatch) {
          position = parseInt(positionMatch[1])
        }

        // Format 2: Modern format like "Unexpected token 'd', \"[d]\" is not valid JSON"
        // Try to re-parse to get position info using binary search
        if (position === null) {
          try {
            let left = 0
            let right = data.length

            // Binary search to find the error position
            while (left < right) {
              const mid = Math.floor((left + right) / 2)

              try {
                JSON.parse(data.substring(0, mid + 1))
                // Parsing succeeded or got "unexpected end", error is later
                left = mid + 1
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                // Check if this is an "unexpected end" error
                if (msg.includes("end of JSON input") || msg.includes("Unexpected end")) {
                  // Need more characters
                  left = mid + 1
                } else {
                  // Found a real error, it's at or before this position
                  right = mid
                }
              }
            }

            // left is now pointing to the error position
            if (left < data.length) {
              position = left
            }
          } catch (e) {
            // Ignore errors in our position detection
          }
        }

        if (position !== null) {
          const lines = data.split("\n")
          let currentPos = 0
          let lineNum = 0
          let colNum = 0

          // Find the line and column
          for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1 // +1 for newline
            if (currentPos + lineLength > position) {
              lineNum = i + 1
              colNum = position - currentPos + 1
              break
            }
            currentPos += lineLength
          }

          // Get context around the error
          const contextLines: string[] = []
          const startLine = Math.max(0, lineNum - 2)
          const endLine = Math.min(lines.length, lineNum + 1)

          for (let i = startLine; i < endLine; i++) {
            const prefix = i === lineNum - 1 ? "> " : "  "
            contextLines.push(`${prefix}${i + 1}: ${lines[i]}`)
            if (i === lineNum - 1) {
              // Add a pointer to the exact column
              contextLines.push(`  ${" ".repeat(String(i + 1).length + 2 + colNum - 1)}^`)
            }
          }

          detailedMessage = `${errorMessage}\nAt line ${lineNum}, column ${colNum}:\n${contextLines.join("\n")}`
        }

        return { score: 0.0, message: detailedMessage }
      }
    },
  },
}

export default transforms
