import type { TransformFixture } from "./types.js"

// 2023-11-14T22:13:20.000Z
const epochMs = 1700000000000
const date = new Date(epochMs)

const fixtures: Record<string, TransformFixture> = {
  epoch_to_date: {
    valid: [
      {
        name: "seconds",
        input: "1700000000",
        options: "sec",
        expected: date,
        expectedDisplay: "DateDisplay",
        minScore: 1.5,
      },
      {
        name: "milliseconds",
        input: "1700000000000",
        options: "ms",
        expected: date,
      },
      {
        name: "nanoseconds",
        input: "1700000000000000000",
        options: "ns",
        expected: date,
      },
      {
        name: "auto-detects seconds by magnitude",
        input: "1700000000",
        expected: date,
      },
      {
        name: "explicit unit overrides auto-detection",
        input: "1700000000",
        options: "ms",
        expected: new Date(1700000000),
      },
      {
        name: "ns precision beyond MAX_SAFE_INTEGER (sub-ms truncates)",
        input: "1700000000000000001",
        options: "ns",
        expected: date,
        roundTrip: "1700000000000000000",
      },
    ],
    invalid: [
      { name: "not a number", input: "abc" },
      { name: "empty string", input: "" },
      { name: "wrong type", input: true },
    ],
  },
  date_from_iso: {
    valid: [
      {
        name: "ISO string (round trip yields a Date, not the string)",
        input: "2024-01-15T12:00:00.000Z",
        expected: new Date("2024-01-15T12:00:00.000Z"),
        expectedDisplay: "DateDisplay",
        minScore: 2,
        roundTrip: new Date("2024-01-15T12:00:00.000Z"),
      },
    ],
    invalid: [
      { name: "numeric strings are rejected (use epoch)", input: "1700000000" },
      { name: "not a date", input: "not a date" },
      { name: "wrong type", input: 42 },
    ],
  },
  date_to_epoch_ms: {
    valid: [
      {
        input: date,
        expected: "1700000000000",
        expectedDisplay: "TextDisplay",
        roundTrip: date,
      },
    ],
    invalid: [
      { name: "invalid date", input: new Date(NaN) },
      { name: "unparseable string", input: "hello" },
    ],
  },
  date_to_epoch_sec: {
    valid: [
      {
        input: date,
        expected: "1700000000",
        expectedDisplay: "TextDisplay",
        roundTrip: date,
      },
    ],
    invalid: [{ name: "invalid date", input: new Date(NaN) }],
  },
  date_to_epoch_ns: {
    valid: [
      {
        input: date,
        expected: "1700000000000000000",
        expectedDisplay: "TextDisplay",
        roundTrip: date,
      },
      {
        name: "ns beyond MAX_SAFE_INTEGER stays exact",
        input: new Date(1234567890123),
        expected: "1234567890123000000",
        roundTrip: new Date(1234567890123),
      },
    ],
    invalid: [{ name: "invalid date", input: new Date(NaN) }],
  },
}

export default fixtures
