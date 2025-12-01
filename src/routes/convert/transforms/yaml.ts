import { type Transform, type Content } from "../model"
import yaml from "yaml"

const transforms: Record<string, Transform> = {
  yaml_stringify: {
    name: "YAML",
    prev: "TreeDisplay",
    analyze: (data: any) => {
      try {
        const content = yaml.stringify(data)

        // Provide the inverse function: YAML text -> object
        const inverse = (content: Content, options?: string) => {
          if (typeof content === "string") {
            let parsed = yaml.parseAllDocuments(content).map((doc) => doc.toJSON())
            if (parsed.length === 1) {
              parsed = parsed[0]
            }
            return parsed
          }
          throw new Error("Expected string for YAML parsing")
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
  yaml_parse: {
    name: "YAML",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        const score = data.includes("---\n") ? 2.0 : 0.75
        let content = yaml.parseAllDocuments(data).map((doc) => doc.toJSON())
        if (content.length === 1) {
          content = content[0]
        }

        // Provide the inverse function: object -> YAML text
        const inverse = (content: Content, options?: string) => {
          return yaml.stringify(content)
        }

        return {
          score,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
  },
}

export default transforms
