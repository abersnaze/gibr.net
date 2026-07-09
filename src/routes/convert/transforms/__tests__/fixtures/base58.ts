import type { TransformFixture } from "./types.js"

// "hello world" in ASCII bytes
const helloWorldBytes = new Uint8Array([
  0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64,
])

const fixtures: Record<string, TransformFixture> = {
  base58_decode: {
    valid: [
      {
        name: "known vector",
        input: "StV1DL6CwTryKyV",
        expected: helloWorldBytes,
        expectedDisplay: "BinaryDisplay",
      },
      {
        name: "empty string decodes to empty bytes",
        input: "",
        expected: new Uint8Array(0),
      },
    ],
    invalid: [
      { name: "characters outside the alphabet", input: "0OIl" },
      { name: "wrong type", input: new Uint8Array([1]) },
    ],
  },
  base58_encode: {
    valid: [
      {
        name: "known vector",
        input: helloWorldBytes,
        expected: "StV1DL6CwTryKyV",
        expectedDisplay: "TextDisplay",
      },
    ],
    invalid: [{ name: "wrong type", input: "StV1DL6CwTryKyV" }],
  },
}

export default fixtures
