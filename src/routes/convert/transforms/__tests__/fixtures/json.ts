import type { TransformFixture } from "./types.js"

const circular: Record<string, unknown> = {}
circular.self = circular

const fixtures: Record<string, TransformFixture> = {
  json_parse: {
    valid: [
      {
        name: "object (round trip re-indents)",
        input: '{"a": 1}',
        expected: { a: 1 },
        expectedDisplay: "TreeDisplay",
        minScore: 2,
        roundTrip: '{\n  "a": 1\n}',
      },
      {
        name: "string literal becomes text",
        input: '"hi"',
        expected: "hi",
        expectedDisplay: "TextDisplay",
        roundTrip: '"hi"',
      },
    ],
    invalid: [
      { name: "malformed json", input: "{bad json" },
      { name: "empty string", input: "" },
      { name: "wrong type", input: 42 },
    ],
  },
  json_stringify: {
    valid: [
      {
        name: "object",
        input: { a: 1 },
        expected: '{\n  "a": 1\n}',
        expectedDisplay: "TextDisplay",
        roundTrip: { a: 1 },
      },
      {
        name: "array",
        input: [1, 2],
        expected: "[\n  1,\n  2\n]",
        roundTrip: [1, 2],
      },
    ],
    invalid: [{ name: "circular reference", input: circular }],
  },
}

export default fixtures
