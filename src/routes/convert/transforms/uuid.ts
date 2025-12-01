import { type Transform, type Content } from "../model.js"

/**
 * Parse and decompose UUID into its component parts based on version
 * RFC 4122: https://www.rfc-editor.org/rfc/rfc4122
 * RFC 9562 (updated): https://www.rfc-editor.org/rfc/rfc9562
 */

interface UUIDComponents {
  version: number
  variant: string
  uuid: string
  [key: string]: any
}

function parseUUID(uuid: string): UUIDComponents {
  // Remove hyphens and normalize
  const normalized = uuid.replace(/-/g, "").toLowerCase()

  if (normalized.length !== 32 || !/^[0-9a-f]{32}$/.test(normalized)) {
    throw new Error(
      "Invalid UUID format. Expected 32 hexadecimal characters (with or without hyphens)."
    )
  }

  // Add hyphens back in standard format
  const formatted = `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`

  // Extract version from the 13th character (first hex of third group)
  const version = parseInt(normalized[12], 16)

  // Extract variant from the 17th character (first hex of fourth group)
  const variantBits = parseInt(normalized[16], 16)
  let variant: string
  if ((variantBits & 0x8) === 0x0) {
    variant = "NCS backward compatibility"
  } else if ((variantBits & 0xc) === 0x8) {
    variant = "RFC 4122/9562"
  } else if ((variantBits & 0xe) === 0xc) {
    variant = "Microsoft GUID"
  } else {
    variant = "Reserved for future"
  }

  const result: UUIDComponents = {
    uuid: formatted,
    version,
    variant,
  }

  // Parse based on version
  switch (version) {
    case 1:
      return parseVersion1(normalized, result)
    case 2:
      return parseVersion2(normalized, result)
    case 3:
      return parseVersion3(normalized, result)
    case 4:
      return parseVersion4(normalized, result)
    case 5:
      return parseVersion5(normalized, result)
    case 6:
      return parseVersion6(normalized, result)
    case 7:
      return parseVersion7(normalized, result)
    case 8:
      return parseVersion8(normalized, result)
    default:
      result.description = `Unknown version ${version}`
      return result
  }
}

function parseVersion1(hex: string, result: UUIDComponents): UUIDComponents {
  // Time fields: low (0-7), mid (8-11), high (12-15)
  const timeLow = hex.slice(0, 8)
  const timeMid = hex.slice(8, 12)
  const timeHigh = hex.slice(13, 16) // Skip version nibble at position 12

  // Reconstruct 60-bit timestamp (100-nanosecond intervals since 1582-10-15)
  const timestamp = BigInt("0x" + timeHigh + timeMid + timeLow)
  const gregorianEpoch = BigInt("122192928000000000") // Offset from Unix epoch to Gregorian epoch
  const unixTimestamp = (timestamp - gregorianEpoch) / BigInt(10000) // Convert to milliseconds

  // Store as nanoseconds (100-ns intervals * 100)
  result.timestamp_ns = (timestamp * BigInt(100)).toString()

  // Clock sequence (14 bits from positions 16-19, excluding top 2 variant bits)
  const clockSeqByte = parseInt(hex.slice(16, 18), 16)
  const clockSeqHigh = clockSeqByte & 0x3f // Mask out top 2 variant bits
  const clockSeqLow = parseInt(hex.slice(18, 20), 16)
  result.clock_sequence = (clockSeqHigh << 8) | clockSeqLow

  // Node (MAC address, 48 bits)
  const node = hex.slice(20)
  result.node = node.match(/.{2}/g)!.join(":").toUpperCase()

  return result
}

function parseVersion2(hex: string, result: UUIDComponents): UUIDComponents {
  // Similar to Version 1, but with local domain and local ID
  const localDomain = parseInt(hex.slice(18, 20), 16)
  const localId = parseInt(hex.slice(0, 8), 16)

  result.local_domain = getDomainName(localDomain)
  result.local_id = localId

  // Time fields (similar to v1, but with different layout)
  const timeMid = hex.slice(8, 12)
  const timeHigh = hex.slice(13, 16)

  // Approximate timestamp (less precise than v1 due to local ID replacement)
  const partialTimestamp = BigInt("0x" + timeHigh + timeMid + "00000000")
  // Store as nanoseconds (100-ns intervals * 100)
  result.timestamp_ns = (partialTimestamp * BigInt(100)).toString()

  // Clock sequence (partial - only high 6 bits available)
  const clockSeqByte = parseInt(hex.slice(16, 18), 16)
  const clockSeqHigh = clockSeqByte & 0x3f
  result.clock_sequence = clockSeqHigh

  // Node (MAC address)
  const node = hex.slice(20)
  result.node = node.match(/.{2}/g)!.join(":").toUpperCase()

  return result
}

function getDomainName(domain: number): string {
  const domains: Record<number, string> = {
    0: "PERSON",
    1: "GROUP",
    2: "ORG",
  }
  return domains[domain] || `Unknown (${domain})`
}

function parseVersion3(hex: string, result: UUIDComponents): UUIDComponents {
  result.hash_algorithm = "MD5"
  result.hash = hex

  return result
}

function parseVersion4(hex: string, result: UUIDComponents): UUIDComponents {
  // Extract random bits (122 bits total, excluding version and variant)
  const randomBits =
    hex.slice(0, 12) +
    hex.slice(13, 16) + // Skip version nibble
    hex.slice(17, 20) + // Skip variant bits (partial)
    hex.slice(20)

  result.random = randomBits

  return result
}

function parseVersion5(hex: string, result: UUIDComponents): UUIDComponents {
  result.hash_algorithm = "SHA-1"
  result.hash = hex

  return result
}

function parseVersion6(hex: string, result: UUIDComponents): UUIDComponents {
  // Version 6 is like version 1, but with reordered timestamp for better sorting
  // Time fields are in big-endian order: high (0-11), mid (12-15), low (16-19 + 20-23)
  const timeHigh = hex.slice(0, 12)
  const timeMid = hex.slice(12, 16)
  const timeLow = hex.slice(16, 20) + hex.slice(21, 24) // Skip version nibble at position 20

  // Reconstruct 60-bit timestamp
  const timestamp = BigInt("0x" + timeHigh + timeMid + timeLow)
  const gregorianEpoch = BigInt("122192928000000000")
  const unixTimestamp = (timestamp - gregorianEpoch) / BigInt(10000)

  // Store as nanoseconds (100-ns intervals * 100)
  result.timestamp_ns = (timestamp * BigInt(100)).toString()

  // Clock sequence (14 bits, excluding top 2 variant bits)
  const clockSeqByte = parseInt(hex.slice(24, 26), 16)
  const clockSeqHigh = clockSeqByte & 0x3f
  const clockSeqLow = parseInt(hex.slice(26, 28), 16)
  result.clock_sequence = (clockSeqHigh << 8) | clockSeqLow

  // Node (MAC address or random)
  const node = hex.slice(28)
  result.node = node.match(/.{2}/g)!.join(":").toUpperCase()

  return result
}

function parseVersion7(hex: string, result: UUIDComponents): UUIDComponents {
  // First 48 bits (12 hex chars) are Unix timestamp in milliseconds
  const timestampHex = hex.slice(0, 12)
  const timestamp = parseInt(timestampHex, 16)

  result.timestamp_ms = timestamp.toString()

  // Next 12 bits (3 hex chars, minus version) are random or sequence
  const subSecHex = hex.slice(13, 16)
  result.subsec = subSecHex

  // Remaining 62 bits are random (including variant nibble which will be reapplied)
  const randomHex = hex.slice(16, 20) + hex.slice(20)
  result.random = randomHex

  return result
}

function parseVersion8(hex: string, result: UUIDComponents): UUIDComponents {
  // Extract all data bits (122 bits, excluding version and variant)
  result.custom = hex

  // Try to detect common custom formats
  // Check if it might be a sortable timestamp-based format
  const possibleTimestamp = parseInt(hex.slice(0, 12), 16)
  if (possibleTimestamp > 1000000000000 && possibleTimestamp < 9999999999999) {
    result.timestamp_ms = possibleTimestamp.toString()
  }

  return result
}

function reconstructUUID(components: UUIDComponents, timestampUnit: string = "ms"): string {
  const version = components.version

  switch (version) {
    case 1:
      return reconstructVersion1(components)
    case 4:
      return reconstructVersion4(components)
    case 6:
      return reconstructVersion6(components)
    case 7:
      return reconstructVersion7(components, timestampUnit)
    case 8:
      return reconstructVersion8(components)
    default:
      // For versions we can't reconstruct (2, 3, 5), return original
      return components.uuid
  }
}

function reconstructVersion1(components: UUIDComponents): string {
  // Reconstruct from timestamp, clock_sequence, and node
  if (!components.timestamp_ns || components.clock_sequence === undefined || !components.node) {
    return components.uuid // Can't reconstruct, return original
  }

  // Convert nanoseconds back to 100-nanosecond intervals
  const timestamp = BigInt(components.timestamp_ns) / BigInt(100)

  // Split timestamp into components
  const timeLow = (timestamp & BigInt(0xffffffff)).toString(16).padStart(8, "0")
  const timeMid = ((timestamp >> BigInt(32)) & BigInt(0xffff)).toString(16).padStart(4, "0")
  const timeHigh = ((timestamp >> BigInt(48)) & BigInt(0x0fff)).toString(16).padStart(3, "0")

  // Add version nibble (1)
  const timeHighAndVersion = "1" + timeHigh

  // Clock sequence with variant bits
  const clockSeq = components.clock_sequence
  const clockSeqLow = (clockSeq & 0xff).toString(16).padStart(2, "0")
  const clockSeqHigh = ((clockSeq >> 8) & 0x3f) | 0x80 // Set variant bits (10xxxxxx)
  const clockSeqHighHex = clockSeqHigh.toString(16).padStart(2, "0")

  // Node (remove colons and convert to lowercase)
  const node = components.node.replace(/:/g, "").toLowerCase()

  return `${timeLow}-${timeMid}-${timeHighAndVersion}-${clockSeqHighHex}${clockSeqLow}-${node}`
}

function reconstructVersion4(components: UUIDComponents): string {
  // Reconstruct from random bits
  if (!components.random) {
    return components.uuid
  }

  const randomHex = components.random.toLowerCase().padStart(30, "0")

  // Random bits layout (30 chars total):
  // [0:8] [8:12] [12:15] [15:18] [18:30]
  //   8     4       3        3       12    = 30 chars
  //
  // Reconstructed UUID layout (32 chars with version and variant):
  // [8]-[4]-[4 = version(1) + 3]-[4 = variant(1) + 3]-[12]

  const part1 = randomHex.slice(0, 8)
  const part2 = randomHex.slice(8, 12)
  const part3Bits = randomHex.slice(12, 15)
  const part4Bits = randomHex.slice(15, 18)
  const part5 = randomHex.slice(18, 30)

  // Add version nibble (4) at the start of part3
  const part3 = "4" + part3Bits

  // Add variant bits at the start of part4
  // The variant for RFC 4122 UUIDs should be 10xx (binary), which is 8-b in hex
  // We'll use 'a' (1010) which is a common variant value
  const part4 = "a" + part4Bits

  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

function reconstructVersion6(components: UUIDComponents): string {
  // Similar to v1 but with reordered timestamp
  if (!components.timestamp_ns || components.clock_sequence === undefined || !components.node) {
    return components.uuid
  }

  // Convert nanoseconds back to 100-nanosecond intervals
  const timestamp = BigInt(components.timestamp_ns) / BigInt(100)

  // For v6, timestamp is in big-endian order: high-mid-low
  const timeHigh = ((timestamp >> BigInt(48)) & BigInt(0x0fff)).toString(16).padStart(12, "0")
  const timeMid = ((timestamp >> BigInt(32)) & BigInt(0xffff)).toString(16).padStart(4, "0")
  const timeLowHigh = ((timestamp >> BigInt(16)) & BigInt(0xffff)).toString(16).padStart(4, "0")
  const timeLowLow = (timestamp & BigInt(0xffff)).toString(16).padStart(4, "0")

  const part1 = timeHigh.slice(0, 8)
  const part2 = timeHigh.slice(8, 12)

  // Version 6
  const part3 = "6" + timeMid.slice(1, 4)

  // Clock sequence with variant
  const clockSeq = components.clock_sequence
  const clockSeqLow = (clockSeq & 0xff).toString(16).padStart(2, "0")
  const clockSeqHigh = ((clockSeq >> 8) & 0x3f) | 0x80
  const part4 = clockSeqHigh.toString(16).padStart(2, "0") + clockSeqLow

  const node = components.node.replace(/:/g, "").toLowerCase()

  return `${part1}-${part2}-${part3}-${part4}-${node}`
}

function reconstructVersion7(components: UUIDComponents, timestampUnit: string = "ms"): string {
  // Reconstruct from timestamp and random bits
  if (!components.timestamp_ms) {
    return components.uuid
  }

  // Parse timestamp and convert to milliseconds based on unit
  const timestampValue = parseInt(components.timestamp_ms, 10)

  let timestamp: number
  if (timestampUnit === "sec") {
    timestamp = timestampValue * 1000
  } else if (timestampUnit === "ns") {
    timestamp = Math.floor(timestampValue / 1000000)
  } else {
    // milliseconds (default)
    timestamp = timestampValue
  }

  const timestampHex = timestamp.toString(16).padStart(12, "0")

  // Get subsec precision (or use original)
  let subSecHex = "000"
  if (components.subsec) {
    subSecHex = components.subsec.padStart(3, "0")
  }

  // Get random bits (or generate new ones if missing)
  let randomHex = ""
  if (components.random) {
    randomHex = components.random.padStart(15, "0")
  } else {
    // Generate random bits if missing
    randomHex = Array.from({ length: 15 }, () => Math.floor(Math.random() * 16).toString(16)).join(
      ""
    )
  }

  // Build UUID
  const part1 = timestampHex.slice(0, 8)
  const part2 = timestampHex.slice(8, 12)
  const part3 = "7" + subSecHex // Version 7

  // Variant bits + random
  const variantNibble = (parseInt(randomHex[0], 16) & 0x3) | 0x8 // 10xx pattern
  const part4 = variantNibble.toString(16) + randomHex.slice(1, 4)
  const part5 = randomHex.slice(4) // Get all remaining chars (should be 12)

  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

function reconstructVersion8(components: UUIDComponents): string {
  // Reconstruct from custom data
  if (!components.custom) {
    return components.uuid
  }

  const hex = components.custom.toLowerCase().padStart(32, "0")

  // Format with hyphens and ensure version/variant bits
  const part1 = hex.slice(0, 8)
  const part2 = hex.slice(8, 12)
  const part3Raw = hex.slice(12, 16)
  const part4Raw = hex.slice(16, 20)
  const part5 = hex.slice(20, 32)

  // Ensure version is 8
  const part3 = "8" + part3Raw.slice(1)

  // Ensure variant is set correctly
  const variantNibble = (parseInt(part4Raw[0], 16) & 0x3) | 0x8
  const part4 = variantNibble.toString(16) + part4Raw.slice(1)

  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

const transforms: Record<string, Transform> = {
  uuid_parse: {
    name: "UUID",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        // Type check
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }

        const trimmed = data.trim()

        // Quick validation - must look like a UUID
        const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
        if (!uuidRegex.test(trimmed)) {
          return { score: 0.0, message: "Not a valid UUID format" }
        }

        const content = parseUUID(trimmed)

        // Provide inverse function that reconstructs UUID from components
        const inverse = (content: Content) => {
          if (typeof content === "object" && content !== null && "version" in content) {
            return reconstructUUID(content as UUIDComponents)
          }
          throw new Error("Expected UUID components object")
        }

        return {
          score: 2.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
  uuid_compose: {
    name: "UUID",
    prev: "TreeDisplay",
    defaults: "ms",
    analyze: (data: any, options?: string) => {
      try {
        // Type check
        if (typeof data !== "object" || data === null) {
          return { score: 0.0, message: `Expected object, got ${typeof data}` }
        }

        // Check if it looks like UUID components
        if (!("uuid" in data) || !("version" in data)) {
          return { score: 0.0, message: "Not UUID components" }
        }

        const timestampUnit = options || "ms"
        const content = reconstructUUID(data as UUIDComponents, timestampUnit)

        // Provide inverse function
        const inverse = (content: Content) => {
          if (typeof content === "string") {
            return parseUUID(content)
          }
          throw new Error("Expected UUID string")
        }

        return {
          score: 1.0,
          content,
          inverse,
          options: timestampUnit,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
}

export default transforms
