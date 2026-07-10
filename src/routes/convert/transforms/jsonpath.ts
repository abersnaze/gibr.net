import { type Transform, type Content } from "../model"

function getValueByPath(obj: unknown, path: string): unknown {
  if (!path || path === ".") return obj

  // Split and filter out empty strings (from leading/trailing dots)
  const keys = path.split(".").filter((k) => k !== "")
  let current = obj

  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      throw new Error(`Cannot access property '${key}' on ${typeof current}`)
    }

    // Handle array indices
    if (Array.isArray(current)) {
      const index = parseInt(key)
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index '${key}' out of bounds`)
      }
      current = current[index]
    } else {
      if (!(key in current)) {
        throw new Error(`Property '${key}' not found`)
      }
      current = (current as Record<string, unknown>)[key]
    }
  }

  return current
}

function setValueByPath(obj: unknown, path: string, value: unknown): unknown {
  if (!path || path === ".") return value

  // Split and filter out empty strings (from leading/trailing dots)
  const keys = path.split(".").filter((k) => k !== "")
  const result = JSON.parse(JSON.stringify(obj)) // Deep clone
  let current = result

  // Navigate to the parent of the target
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]

    if (Array.isArray(current)) {
      const index = parseInt(key)
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index '${key}' out of bounds`)
      }
      current = current[index]
    } else {
      if (!(key in current)) {
        throw new Error(`Property '${key}' not found`)
      }
      current = current[key]
    }
  }

  // Set the final value
  const finalKey = keys[keys.length - 1]
  if (Array.isArray(current)) {
    const index = parseInt(finalKey)
    if (isNaN(index) || index < 0 || index >= current.length) {
      throw new Error(`Array index '${finalKey}' out of bounds`)
    }
    current[index] = value
  } else {
    current[finalKey] = value
  }

  return result
}

const transforms: Record<string, Transform> = {
  jsonpath_select: {
    name: "JSONPath",
    prev: "TreeDisplay",
    // No optionsComponent - path is selected by clicking in TreeDisplay
    defaults: ".",
    analyze: (data: unknown, path: string = ".") => {
      try {
        const content = getValueByPath(data, path)
        return { score: 1.0, content: content as Content }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
    // selected value -> original object with the value at the path updated
    invert: (output: Content, originalInput: Content, path: string = ".") => {
      // Get the original value to determine its type
      const originalValue = getValueByPath(originalInput, path)
      let parsedValue: unknown = output

      // If the new content is a string, try to convert it to match the original type
      if (typeof output === "string" && typeof originalValue === "number") {
        // Original was a number, try to parse the string as a number
        const num = Number(output)
        if (!isNaN(num)) {
          parsedValue = num
        }
      } else if (typeof output === "string" && typeof originalValue === "boolean") {
        // Original was a boolean, parse the string as boolean
        if (output === "true") parsedValue = true
        else if (output === "false") parsedValue = false
      }

      return setValueByPath(originalInput, path, parsedValue) as Content
    },
  },
}

export default transforms
