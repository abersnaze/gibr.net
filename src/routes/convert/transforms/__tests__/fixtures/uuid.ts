import type { TransformFixture } from "./types.js"

const v4Uuid = "550e8400-e29b-41d4-a716-446655440000"
const v4Components = {
  uuid: v4Uuid,
  version: 4,
  variant: "RFC 4122/9562",
  random: "550e8400e29b1d4716446655440000",
}

const fixtures: Record<string, TransformFixture> = {
  uuid_parse: {
    valid: [
      {
        name: "v4 with hyphens",
        input: v4Uuid,
        expected: v4Components,
        expectedDisplay: "TreeDisplay",
        minScore: 2,
        roundTrip: v4Uuid,
      },
      {
        name: "v4 without hyphens (round trip adds them)",
        input: "550e8400e29b41d4a716446655440000",
        expected: v4Components,
        roundTrip: v4Uuid,
      },
      {
        name: "v7 round trips",
        input: "01890a5d-ac96-774b-bcce-b302099a8057",
      },
    ],
    invalid: [
      { name: "not a uuid", input: "not-a-uuid" },
      { name: "wrong type", input: 42 },
    ],
  },
  uuid_compose: {
    valid: [
      {
        name: "v4 components",
        input: v4Components,
        expected: v4Uuid,
        expectedDisplay: "TextDisplay",
        roundTrip: v4Components,
      },
    ],
    invalid: [
      { name: "not uuid components", input: {} },
      { name: "wrong type", input: v4Uuid },
    ],
  },
}

export default fixtures
