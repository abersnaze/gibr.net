import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  b16_decode: {
    valid: [
      {
        name: "lowercase hex",
        input: "48656c6c6f",
        expected: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
        expectedDisplay: "BinaryDisplay",
      },
      {
        name: "uppercase hex (round trip normalizes to lowercase)",
        input: "DEADBEEF",
        expected: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        roundTrip: "deadbeef",
      },
      {
        name: "whitespace is stripped",
        input: "de ad be ef",
        expected: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        roundTrip: "deadbeef",
      },
    ],
    invalid: [
      { name: "empty string", input: "" },
      { name: "wrong type", input: new Uint8Array([1]) },
    ],
  },
  b16_encode: {
    valid: [
      {
        input: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        expected: "deadbeef",
        expectedDisplay: "TextDisplay",
      },
    ],
    invalid: [{ name: "wrong type", input: "deadbeef" }],
  },
}

export default fixtures
