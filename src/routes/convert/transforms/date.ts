import { type Transform } from "../model"

const transforms: Record<string, Transform> = {
  // Parse epoch time to Date object with configurable unit
  epoch_to_date: {
    name: "Date (from epoch)",
    prev: "TextDisplay",
    // Options component will be set later to avoid circular dependency issues with workers
    optionsComponent: undefined,
    defaults: "ms",
    analyze: (data: string | number, options?: string) => {
      try {
        const display = "DateDisplay" as const

        // Reject empty input
        if (typeof data === "string" && data.trim() === "") {
          return { score: 0, message: "Empty input", display }
        }

        const num = typeof data === "string" ? Number(data) : data

        if (isNaN(num)) {
          return { score: 0, message: "Not a valid number", display }
        }

        // Auto-detect unit based on number magnitude
        // Current time in seconds: ~1.7e9 (10 digits)
        // Current time in milliseconds: ~1.7e12 (13 digits)
        // Current time in nanoseconds: ~1.7e18 (19 digits)
        let unit = options || "ms"
        if (num >= 1e17) {
          unit = "ns"
        } else if (num >= 1e12) {
          unit = "ms"
        } else {
          unit = "sec"
        }

        // Convert to milliseconds based on detected unit
        let ms: number
        if (unit === "sec") {
          ms = num * 1000
        } else if (unit === "ns") {
          ms = num / 1000000
        } else {
          // Milliseconds (default)
          ms = num
        }

        // Check if result is a valid JavaScript Date (must be within ±8.64e15 ms from epoch)
        if (ms < -8.64e15 || ms > 8.64e15) {
          return { score: 0.1, message: `Date out of valid range`, display }
        }

        const date = new Date(ms)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date", display }
        }

        // Inverse: convert Date back to epoch in the specified unit
        const inverse = (dateInput: Date | string, opts?: string) => {
          const inverseUnit = opts || options || "ms"
          const epochMs =
            dateInput instanceof Date ? dateInput.getTime() : new Date(dateInput).getTime()

          // If the date is invalid, return empty string to avoid NaN propagation
          if (isNaN(epochMs)) {
            return ""
          }

          if (inverseUnit === "sec") {
            return Math.floor(epochMs / 1000).toString()
          } else if (inverseUnit === "ns") {
            return (epochMs * 1000000).toString()
          } else {
            return epochMs.toString()
          }
        }

        return { score: 1.5, content: date, inverse, options: unit }
      } catch (error: any) {
        return { score: 0, message: error.message, display: "DateDisplay" }
      }
    },
  },

  // Parse ISO date string to Date object
  date_from_iso: {
    name: "Date (from ISO)",
    prev: "TextDisplay",
    analyze: (data: string | number) => {
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

        // Inverse: return the Date object as-is (DateDisplay handles formatting)
        const inverse = (dateInput: Date | string) => {
          return dateInput instanceof Date ? dateInput : new Date(dateInput)
        }

        return { score: 2.0, content: date, inverse }
      } catch (error: any) {
        return { score: 0, message: error.message, display: "DateDisplay" }
      }
    },
  },

  // Convert ISO date string to epoch milliseconds
  date_to_epoch_ms: {
    name: "Epoch (milliseconds)",
    prev: "DateDisplay",
    analyze: (data: string | Date) => {
      try {
        const date = data instanceof Date ? data : new Date(data)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        const content = date.getTime().toString()

        // Inverse: convert epoch milliseconds back to Date
        const inverse = (epochMs: string) => {
          const ms = parseInt(epochMs, 10)
          if (isNaN(ms)) {
            return ""
          }
          const date = new Date(ms)
          if (isNaN(date.getTime())) {
            return ""
          }
          return date
        }

        return { score: 2.0, content, inverse }
      } catch (error: any) {
        return { score: 0, message: error.message, display: "DateDisplay" }
      }
    },
  },

  // Convert ISO date string to epoch seconds
  date_to_epoch_sec: {
    name: "Epoch (seconds)",
    prev: "DateDisplay",
    analyze: (data: string | Date) => {
      try {
        const date = data instanceof Date ? data : new Date(data)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        const content = Math.floor(date.getTime() / 1000).toString()

        // Inverse: convert epoch seconds back to Date
        const inverse = (epochSec: string) => {
          const sec = parseInt(epochSec, 10)
          if (isNaN(sec)) {
            return ""
          }
          const date = new Date(sec * 1000)
          if (isNaN(date.getTime())) {
            return ""
          }
          return date
        }

        return { score: 2.0, content, inverse }
      } catch (error: any) {
        return { score: 0, message: error.message, display: "DateDisplay" }
      }
    },
  },

  // Convert ISO date string to epoch nanoseconds
  date_to_epoch_ns: {
    name: "Epoch (nanoseconds)",
    prev: "DateDisplay",
    analyze: (data: string | Date) => {
      try {
        const date = data instanceof Date ? data : new Date(data)
        if (isNaN(date.getTime())) {
          return { score: 0, message: "Invalid date" }
        }

        const content = (date.getTime() * 1000000).toString()

        // Inverse: convert epoch nanoseconds back to Date
        const inverse = (epochNs: string) => {
          const ns = parseInt(epochNs, 10)
          if (isNaN(ns)) {
            return ""
          }
          const ms = ns / 1000000
          const date = new Date(ms)
          if (isNaN(date.getTime())) {
            return ""
          }
          return date
        }

        return { score: 2.0, content, inverse }
      } catch (error: any) {
        return { score: 0, message: error.message, display: "DateDisplay" }
      }
    },
  },
}

export default transforms
