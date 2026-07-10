import { type Transform, type Content } from "../model"

// Auto-detect epoch unit from magnitude:
// seconds ~1.7e9 (10 digits), milliseconds ~1.7e12 (13), nanoseconds ~1.7e18 (19)
function detectUnit(num: number): string {
  const abs = Math.abs(num)
  if (abs >= 1e17) {
    return "ns"
  } else if (abs >= 1e12) {
    return "ms"
  } else {
    return "sec"
  }
}

// Convert an epoch value to milliseconds. Nanosecond epochs exceed
// Number.MAX_SAFE_INTEGER, so integer strings go through BigInt.
function epochToMs(raw: string | number, num: number, unit: string): number {
  if (unit === "sec") {
    return num * 1000
  }
  if (unit === "ns") {
    if (typeof raw === "string" && /^-?\d+$/.test(raw.trim())) {
      return Number(BigInt(raw.trim()) / BigInt(1000000))
    }
    return num / 1000000
  }
  // Milliseconds (default)
  return num
}

const transforms: Record<string, Transform> = {
  // Parse epoch time to Date object with configurable unit
  epoch_to_date: {
    name: "Date (from epoch)",
    prev: "TextDisplay",
    // Options component will be set later to avoid circular dependency issues with workers
    optionsComponent: undefined,
    defaults: "auto",
    analyze: (data: unknown, options?: string) => {
      try {
        const display = "DateDisplay" as const

        if (typeof data !== "string" && typeof data !== "number") {
          return { score: 0, message: `Expected string or number, got ${typeof data}`, display }
        }

        // Reject empty input
        if (typeof data === "string" && data.trim() === "") {
          return { score: 0, message: "Empty input", display }
        }

        const num = typeof data === "string" ? Number(data) : data

        if (isNaN(num)) {
          return { score: 0, message: "Not a valid number", display }
        }

        // An explicit unit from the options wins; otherwise detect by magnitude
        const unit = options && options !== "auto" ? options : detectUnit(num)

        const ms = epochToMs(data, num, unit)

        // Check if result is a valid JavaScript Date (must be within ±8.64e15 ms from epoch)
        if (ms < -8.64e15 || ms > 8.64e15) {
          return { score: 0.1, message: `Date out of valid range`, display }
        }

        const date = new Date(ms)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date", display }
        }

        return { score: 1.5, content: date }
      } catch (error: unknown) {
        return {
          score: 0,
          message: error instanceof Error ? error.message : String(error),
          display: "DateDisplay",
        }
      }
    },
    // Date -> epoch string in the unit given by options; on "auto", detect
    // the unit from the original epoch value's magnitude
    invert: (output: Content, originalInput: Content, options?: string) => {
      const epochMs = output instanceof Date ? output.getTime() : new Date(String(output)).getTime()

      // If the date is invalid, return empty string to avoid NaN propagation
      if (isNaN(epochMs)) {
        return ""
      }

      let unit = options
      if (!unit || unit === "auto") {
        const num = typeof originalInput === "number" ? originalInput : Number(originalInput)
        unit = isNaN(num) ? "ms" : detectUnit(num)
      }

      if (unit === "sec") {
        return Math.floor(epochMs / 1000).toString()
      } else if (unit === "ns") {
        return (BigInt(epochMs) * BigInt(1000000)).toString()
      } else {
        return epochMs.toString()
      }
    },
  },

  // Parse ISO date string to Date object
  date_from_iso: {
    name: "Date (from ISO)",
    prev: "TextDisplay",
    analyze: (data: unknown) => {
      try {
        const display = "DateDisplay" as const

        // Type check - must be string
        if (typeof data !== "string") {
          return { score: 0, message: "Expected string", display }
        }

        const trimmed = data.trim()

        // Reject empty input
        if (trimmed === "") {
          return { score: 0, message: "Empty input", display }
        }

        // Reject pure numbers (should use epoch_to_date instead)
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
          return { score: 0, message: "Use Date (from epoch) for numeric timestamps", display }
        }

        // Try to parse as date
        const date = new Date(trimmed)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Not a valid date string", display }
        }

        return { score: 2.0, content: date }
      } catch (error: unknown) {
        return {
          score: 0,
          message: error instanceof Error ? error.message : String(error),
          display: "DateDisplay",
        }
      }
    },
    // Date -> Date as-is (DateDisplay handles formatting)
    invert: (output: Content) => {
      return output instanceof Date ? output : new Date(String(output))
    },
  },

  // Convert ISO date string to epoch milliseconds
  date_to_epoch_ms: {
    name: "Epoch (milliseconds)",
    prev: "DateDisplay",
    analyze: (data: unknown) => {
      try {
        const date = data instanceof Date ? data : new Date(data as string)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        const content = date.getTime().toString()
        return { score: 2.0, content }
      } catch (error: unknown) {
        return {
          score: 0,
          message: error instanceof Error ? error.message : String(error),
          display: "DateDisplay",
        }
      }
    },
    // epoch milliseconds -> Date
    invert: (output: Content) => {
      const ms = parseInt(String(output), 10)
      if (isNaN(ms)) {
        return ""
      }
      const date = new Date(ms)
      if (isNaN(date.getTime())) {
        return ""
      }
      return date
    },
  },

  // Convert ISO date string to epoch seconds
  date_to_epoch_sec: {
    name: "Epoch (seconds)",
    prev: "DateDisplay",
    analyze: (data: unknown) => {
      try {
        const date = data instanceof Date ? data : new Date(data as string)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        const content = Math.floor(date.getTime() / 1000).toString()
        return { score: 2.0, content }
      } catch (error: unknown) {
        return {
          score: 0,
          message: error instanceof Error ? error.message : String(error),
          display: "DateDisplay",
        }
      }
    },
    // epoch seconds -> Date
    invert: (output: Content) => {
      const sec = parseInt(String(output), 10)
      if (isNaN(sec)) {
        return ""
      }
      const date = new Date(sec * 1000)
      if (isNaN(date.getTime())) {
        return ""
      }
      return date
    },
  },

  // Convert ISO date string to epoch nanoseconds
  date_to_epoch_ns: {
    name: "Epoch (nanoseconds)",
    prev: "DateDisplay",
    analyze: (data: unknown) => {
      try {
        const date = data instanceof Date ? data : new Date(data as string)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        // getTime() * 1e6 exceeds Number.MAX_SAFE_INTEGER — use BigInt
        const content = (BigInt(date.getTime()) * BigInt(1000000)).toString()
        return { score: 2.0, content }
      } catch (error: unknown) {
        return {
          score: 0,
          message: error instanceof Error ? error.message : String(error),
          display: "DateDisplay",
        }
      }
    },
    // epoch nanoseconds -> Date (BigInt: ns values exceed MAX_SAFE_INTEGER)
    invert: (output: Content) => {
      let ns: bigint
      try {
        ns = BigInt(String(output).trim())
      } catch {
        return ""
      }
      const date = new Date(Number(ns / BigInt(1000000)))
      if (isNaN(date.getTime())) {
        return ""
      }
      return date
    },
  },
}

export default transforms
