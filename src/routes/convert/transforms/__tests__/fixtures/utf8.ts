import type { TransformFixture } from "./types.js"

// "héllo" encoded as UTF-8 (é is a two-byte sequence)
const helloAccentBytes = new Uint8Array([0x68, 0xc3, 0xa9, 0x6c, 0x6c, 0x6f])

const fixtures: Record<string, TransformFixture> = {
  utf8_decode: {
    valid: [
      {
        name: "multi-byte sequence",
        input: helloAccentBytes,
        expected: "héllo",
        expectedDisplay: "TextDisplay",
      },
      {
        name: "empty bytes",
        input: new Uint8Array(0),
        expected: "",
      },
    ],
    invalid: [
      { name: "invalid utf-8 sequence", input: new Uint8Array([0xff, 0xfe]) },
      { name: "wrong type", input: "héllo" },
    ],
  },
  utf8_encode: {
    valid: [
      {
        name: "multi-byte sequence",
        input: "héllo",
        expected: helloAccentBytes,
        expectedDisplay: "BinaryDisplay",
      },
    ],
    invalid: [{ name: "wrong type", input: new Uint8Array([1]) }],
  },
}

export default fixtures
