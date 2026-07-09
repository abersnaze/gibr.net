import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  jsonpath_select: {
    valid: [
      {
        name: "nested property",
        input: { a: { b: 5 } },
        options: ".a.b",
        expected: 5,
        roundTrip: { a: { b: 5 } },
      },
      {
        name: "array index",
        input: { list: [10, 20, 30] },
        options: ".list.1",
        expected: 20,
        roundTrip: { list: [10, 20, 30] },
      },
      {
        name: "root path returns input",
        input: { a: 1 },
        options: ".",
        expected: { a: 1 },
        roundTrip: { a: 1 },
      },
    ],
    invalid: [
      { name: "missing property", input: { a: 1 }, options: ".x" },
      { name: "index out of bounds", input: [1], options: ".5" },
    ],
  },
}

export default fixtures
