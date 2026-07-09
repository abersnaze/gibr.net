import type { TransformFixture } from "./types.js"

// "hello" in ASCII bytes
const helloBytes = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f])

const fixtures: Record<string, TransformFixture> = {
  b64_decode: {
    valid: [
      {
        name: "padded string",
        input: "aGVsbG8=",
        expected: helloBytes,
        expectedDisplay: "BinaryDisplay",
      },
      {
        name: "whitespace is stripped (round trip normalizes)",
        input: "aGVs\nbG8=",
        expected: helloBytes,
        roundTrip: "aGVsbG8=",
      },
    ],
    invalid: [
      { name: "length not divisible by 4", input: "abc" },
      { name: "padding in the middle", input: "a===" },
      { name: "wrong type", input: 42 },
    ],
  },
  b64_encode: {
    valid: [
      {
        input: helloBytes,
        expected: "aGVsbG8=",
        expectedDisplay: "TextDisplay",
      },
      {
        name: "empty bytes",
        input: new Uint8Array(0),
        expected: "",
      },
    ],
    invalid: [{ name: "wrong type", input: "aGVsbG8=" }],
  },
}

export default fixtures
