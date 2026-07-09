import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  substring_select: {
    valid: [
      {
        name: "extract and reinsert",
        input: "hello world",
        options: JSON.stringify({ start: 6, end: 11 }),
        expected: "world",
        expectedDisplay: "TextDisplay",
        roundTrip: "hello world",
      },
    ],
    invalid: [
      { name: "wrong type", input: 42, options: JSON.stringify({ start: 0, end: 1 }) },
      { name: "malformed options", input: "abc", options: "not json" },
    ],
  },
}

export default fixtures
