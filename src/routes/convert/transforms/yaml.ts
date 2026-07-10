import { type Transform, type Content } from "../model"
import yaml from "yaml"

const transforms: Record<string, Transform> = {
  yaml_stringify: {
    name: "YAML",
    prev: "TreeDisplay",
    analyze: (data: unknown) => {
      try {
        const content = yaml.stringify(data)
        return { score: 1.0, content }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
    // YAML text -> object
    invert: (output: Content) => {
      if (typeof output === "string") {
        let parsed = yaml.parseAllDocuments(output).map((doc) => doc.toJSON())
        if (parsed.length === 1) {
          parsed = parsed[0]
        }
        return parsed
      }
      throw new Error("Expected string for YAML parsing")
    },
  },
  yaml_parse: {
    name: "YAML",
    prev: "TextDisplay",
    analyze: (data: unknown) => {
      if (typeof data !== "string") {
        return { score: 0.0, message: `Expected string, got ${typeof data}` }
      }
      try {
        const score = data.includes("---\n") ? 2.0 : 0.75
        let content = yaml.parseAllDocuments(data).map((doc) => doc.toJSON())
        if (content.length === 1) {
          content = content[0]
        }
        return { score, content }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
    // object -> YAML text
    invert: (output: Content) => {
      return yaml.stringify(output)
    },
  },
}

export default transforms
