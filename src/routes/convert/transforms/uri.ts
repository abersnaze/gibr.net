import { type Transform, type Content } from "../model"

function parseURI(uriString: string) {
  try {
    const url = new URL(uriString)

    // Parse query parameters into an object
    const searchParams: Record<string, string | string[]> = {}
    for (const [key, value] of url.searchParams.entries()) {
      if (searchParams[key]) {
        // Handle multiple values for same key
        if (Array.isArray(searchParams[key])) {
          ;(searchParams[key] as string[]).push(value)
        } else {
          searchParams[key] = [searchParams[key] as string, value]
        }
      } else {
        searchParams[key] = value
      }
    }

    return {
      scheme: url.protocol.slice(0, -1), // Remove trailing ':'
      host: url.hostname,
      port: url.port || null,
      path: url.pathname,
      query: searchParams,
      fragment: url.hash ? url.hash.slice(1) : null, // Remove leading '#'
      username: url.username || null,
      password: url.password || null,
    }
  } catch (error) {
    throw new Error(`Invalid URI: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function buildURI(components: unknown) {
  try {
    let uri = `${components.scheme}://`

    // Add authentication if present
    if (components.username) {
      uri += components.username
      if (components.password) {
        uri += `:${components.password}`
      }
      uri += "@"
    }

    // Add host
    uri += components.host

    // Add port if present and not default
    if (components.port) {
      uri += `:${components.port}`
    }

    // Add path
    uri += components.path || "/"

    // Add query parameters
    if (components.query && Object.keys(components.query).length > 0) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(components.query)) {
        if (Array.isArray(value)) {
          ;(value as string[]).forEach((v) => params.append(key, v))
        } else {
          params.set(key, value as string)
        }
      }
      uri += `?${params.toString()}`
    }

    // Add fragment
    if (components.fragment) {
      uri += `#${components.fragment}`
    }

    return uri
  } catch (error) {
    throw new Error(
      `Failed to build URI: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const transforms: Record<string, Transform> = {
  uri_parse: {
    name: "URI Parse",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        // Only try to parse if it looks like a URI
        const uriPattern = /^[a-zA-Z][a-zA-Z0-9+.-]*:/
        if (!uriPattern.test(data.trim())) {
          return { score: 0.0, message: "Does not look like a URI" }
        }

        const content = parseURI(data.trim())

        // Provide the inverse function: URI components -> URI string
        const inverse = (content: Content) => {
          return buildURI(content)
        }

        return {
          score: 2.0, // High score for valid URIs
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error }
      }
    },
  },
  uri_build: {
    name: "URI Build",
    prev: "TreeDisplay",
    analyze: (data: unknown) => {
      try {
        // Check if the object has the required URI component structure
        if (!data || typeof data !== "object" || !data.scheme || !data.host) {
          return { score: 0.0, message: "Missing required URI components (scheme, host)" }
        }

        const content = buildURI(data)

        // Provide the inverse function: URI string -> URI components
        const inverse = (content: Content) => {
          if (typeof content === "string") {
            return parseURI(content)
          }
          throw new Error("Expected string for URI parsing")
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
  uri_decode: {
    name: "URI Decode",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        const content = decodeURIComponent(data)

        // Provide the inverse function: decoded text -> encoded URI
        const inverse = (content: Content) => {
          if (typeof content === "string") {
            return encodeURIComponent(content)
          }
          throw new Error("Expected string for URI encoding")
        }

        // Check if the string contains percent-encoded characters
        const hasPercentEncoding = /%[0-9A-Fa-f]{2}/.test(data)

        // Score higher if there's actually something to decode
        const score = hasPercentEncoding && content !== data ? 1.0 : 0.1

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
  uri_encode: {
    name: "URI Encode",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        const content = encodeURIComponent(data)

        // Provide the inverse function: encoded URI -> decoded text
        const inverse = (content: Content) => {
          if (typeof content === "string") {
            return decodeURIComponent(content)
          }
          throw new Error("Expected string for URI decoding")
        }

        // Score higher if encoding actually changed something
        const score = content !== data ? 1.0 : 0.1

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
