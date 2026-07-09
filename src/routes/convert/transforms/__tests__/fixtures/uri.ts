import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  uri_parse: {
    valid: [
      {
        name: "url with repeated query params and fragment",
        input: "https://example.com/path?a=1&a=2#frag",
        expected: {
          scheme: "https",
          host: "example.com",
          port: null,
          path: "/path",
          query: { a: ["1", "2"] },
          fragment: "frag",
          username: null,
          password: null,
        },
        expectedDisplay: "TreeDisplay",
        minScore: 2,
      },
      {
        name: "credentials and port",
        input: "http://user:pass@example.com:8080/",
        expected: {
          scheme: "http",
          host: "example.com",
          port: "8080",
          path: "/",
          query: {},
          fragment: null,
          username: "user",
          password: "pass",
        },
      },
    ],
    invalid: [
      { name: "no scheme", input: "not a uri" },
      { name: "wrong type", input: 42 },
    ],
  },
  uri_build: {
    valid: [
      {
        name: "minimal components (round trip fills in defaults)",
        input: { scheme: "https", host: "example.com" },
        expected: "https://example.com/",
        expectedDisplay: "TextDisplay",
        roundTrip: {
          scheme: "https",
          host: "example.com",
          port: null,
          path: "/",
          query: {},
          fragment: null,
          username: null,
          password: null,
        },
      },
    ],
    invalid: [
      { name: "missing scheme and host", input: {} },
      { name: "wrong type", input: "https://example.com/" },
    ],
  },
  uri_decode: {
    valid: [
      {
        name: "percent-encoded",
        input: "hello%20world",
        expected: "hello world",
        minScore: 1,
      },
      {
        name: "nothing to decode scores low",
        input: "plain",
        expected: "plain",
        minScore: 0.1,
      },
    ],
    invalid: [
      { name: "malformed percent sequence", input: "100%zz" },
      { name: "wrong type", input: 42 },
    ],
  },
  uri_encode: {
    valid: [
      {
        name: "space needs encoding",
        input: "hello world",
        expected: "hello%20world",
        minScore: 1,
      },
      {
        name: "already safe scores low",
        input: "abc",
        expected: "abc",
        minScore: 0.1,
      },
    ],
    invalid: [
      { name: "lone surrogate", input: "\ud800" },
      { name: "wrong type", input: 42 },
    ],
  },
}

export default fixtures
