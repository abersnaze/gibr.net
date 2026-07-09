import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  yaml_parse: {
    valid: [
      {
        name: "single document",
        input: "a: 1\nb: two\n",
        expected: { a: 1, b: "two" },
        expectedDisplay: "TreeDisplay",
        minScore: 0.75,
      },
      {
        name: "multi-document (round trip becomes a list)",
        input: "---\na: 1\n---\nb: 2\n",
        expected: [{ a: 1 }, { b: 2 }],
        minScore: 2,
        roundTrip: "- a: 1\n- b: 2\n",
      },
    ],
    invalid: [{ name: "wrong type", input: 42 }],
  },
  yaml_stringify: {
    valid: [
      {
        input: { a: 1, b: "two" },
        expected: "a: 1\nb: two\n",
        expectedDisplay: "TextDisplay",
        roundTrip: { a: 1, b: "two" },
      },
    ],
  },
}

export default fixtures
