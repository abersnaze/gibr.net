import type { TransformFixture } from "./types.js"

const fixtures: Record<string, TransformFixture> = {
  protobuf_decode: {
    valid: [
      {
        name: "classic example: varint + string fields",
        input: new Uint8Array([
          0x08, 0x96, 0x01, 0x12, 0x07, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67,
        ]),
        expected: { "1": 150, "2": "testing" },
        expectedDisplay: "TreeDisplay",
        minScore: 1.6,
      },
      {
        name: "repeated field number groups into an array",
        input: new Uint8Array([0x08, 0x01, 0x08, 0x02, 0x08, 0x03]),
        expected: { "1": [1, 2, 3] },
        minScore: 1.8,
      },
      {
        name: "length-delimited field that parses cleanly is a nested message",
        input: new Uint8Array([0x1a, 0x02, 0x08, 0x05]),
        expected: { "3": { "1": 5 } },
        minScore: 1.4,
      },
      {
        name: "32-bit value that looks like a real float decodes as float",
        input: new Uint8Array([0x25, 0xc3, 0xf5, 0x48, 0x40]),
        expected: { "4": { float: 3.140000104904175 } },
        minScore: 1.4,
      },
      {
        name: "32-bit value that doesn't look like a float decodes as fixed32 int",
        input: new Uint8Array([0x45, 0x40, 0x42, 0x0f, 0x00]),
        expected: { "8": { fixed32: 1000000 } },
        minScore: 1.4,
      },
      {
        name: "64-bit value that looks like a real double decodes as double",
        input: new Uint8Array([0x49, 0x18, 0x2d, 0x44, 0x54, 0xfb, 0x21, 0x09, 0x40]),
        expected: { "9": { double: Math.PI } },
        minScore: 1.4,
      },
      {
        name: "64-bit value that doesn't look like a double decodes as fixed64, string if unsafe",
        input: new Uint8Array([0x51, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        expected: { "10": { fixed64: "18446744073709551615" } },
        minScore: 1.4,
      },
      {
        name: "varint beyond Number.MAX_SAFE_INTEGER falls back to a decimal string",
        input: new Uint8Array([0x38, 0xd2, 0x95, 0xfc, 0xd8, 0xce, 0xb1, 0xaa, 0xaa, 0xab, 0x01]),
        expected: { "7": { varint: "12345678901234567890" } },
        minScore: 1.4,
      },
      {
        name: "length-delimited bytes that are neither a message nor text stay raw hex",
        input: new Uint8Array([0x2a, 0x02, 0x80, 0x81]),
        expected: { "5": { bytes: "8081" } },
        minScore: 1.4,
      },
    ],
    invalid: [
      { name: "wrong type", input: "not bytes" },
      { name: "empty input", input: new Uint8Array(0) },
      { name: "truncated varint", input: new Uint8Array([0xff]) },
      { name: "deprecated group wire type is rejected", input: new Uint8Array([0x0b]) },
    ],
  },
  protobuf_encode: {
    valid: [
      {
        name: "plain numbers and strings encode as varint and length-delimited fields",
        input: { "1": 150, "2": "testing" },
        expected: new Uint8Array([
          0x08, 0x96, 0x01, 0x12, 0x07, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67,
        ]),
        expectedDisplay: "BinaryDisplay",
      },
      {
        name: "repeated array re-encodes as one field occurrence per element",
        input: { "1": [1, 2, 3] },
        expected: new Uint8Array([0x08, 0x01, 0x08, 0x02, 0x08, 0x03]),
      },
      {
        name: "nested object encodes as an embedded submessage",
        input: { "3": { "1": 5 } },
        expected: new Uint8Array([0x1a, 0x02, 0x08, 0x05]),
      },
      {
        name: "marker objects select wire type",
        input: { "4": { float: 3.140000104904175 }, "5": { bytes: "8081" } },
        expected: new Uint8Array([0x25, 0xc3, 0xf5, 0x48, 0x40, 0x2a, 0x02, 0x80, 0x81]),
      },
    ],
    invalid: [
      { name: "wrong type", input: "not an object" },
      { name: "array at top level", input: [1, 2, 3] },
      { name: "non-numeric field key", input: { abc: 1 } },
      { name: "fractional plain number needs a float/double marker", input: { "1": 3.14 } },
    ],
  },
}

export default fixtures
