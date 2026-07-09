import { describe, it, expect } from "vitest"
import { allTransforms } from "../index.js"
import { getDisplayName, type Content } from "../../model.js"
import type { TransformFixture } from "./fixtures/types.js"

import base16 from "./fixtures/base16.js"
import base58 from "./fixtures/base58.js"
import base64 from "./fixtures/base64.js"
import date from "./fixtures/date.js"
import json from "./fixtures/json.js"
import jsonpath from "./fixtures/jsonpath.js"
import substring from "./fixtures/substring.js"
import uri from "./fixtures/uri.js"
import utf8 from "./fixtures/utf8.js"
import uuid from "./fixtures/uuid.js"
import yaml from "./fixtures/yaml.js"

// Every registered transform must have a fixture entry. When adding a
// transform, add a fixture file in ./fixtures/ and merge it here — the
// coverage tests below fail with the missing ids otherwise.
const fixtures: Record<string, TransformFixture> = {
  ...base16,
  ...base58,
  ...base64,
  ...date,
  ...json,
  ...jsonpath,
  ...substring,
  ...uri,
  ...utf8,
  ...uuid,
  ...yaml,
}

// Arbitrary inputs every transform must tolerate: analyze() must always
// return a Result, never throw, no matter what content type it receives.
const PROBES: unknown[] = [
  "",
  "hello",
  '{"a": 1}',
  0,
  42,
  true,
  false,
  null,
  undefined,
  {},
  { nested: { a: [1, 2] } },
  [],
  [1, "two", null],
  new Uint8Array(0),
  new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
  new Date(1700000000000),
  new Date(NaN),
]

describe("fixture coverage", () => {
  it("every transform has a fixture", () => {
    const missing = Object.keys(allTransforms).filter((id) => !(id in fixtures))
    expect(missing, "add fixture files for these transforms").toEqual([])
  })

  it("every fixture refers to a registered transform", () => {
    const unknown = Object.keys(fixtures).filter((id) => !(id in allTransforms))
    expect(unknown, "these fixtures do not match any transform id").toEqual([])
  })
})

for (const [id, transform] of Object.entries(allTransforms)) {
  describe(id, () => {
    it("never throws on arbitrary input", () => {
      for (const probe of PROBES) {
        expect(
          () => transform.analyze(probe, transform.defaults),
          `analyze(${JSON.stringify(probe) ?? String(probe)}) must not throw`
        ).not.toThrow()
      }
    })

    const fixture = fixtures[id]
    if (!fixture) return

    for (const [i, c] of fixture.valid.entries()) {
      it(`valid: ${c.name ?? `case ${i}`}`, () => {
        const options = c.options ?? transform.defaults
        const result = transform.analyze(c.input, options)

        if (!("content" in result) || result.content === undefined) {
          const message = "message" in result ? String(result.message) : "no content"
          throw new Error(`expected success, got failure: ${message}`)
        }

        expect(result.score).toBeGreaterThan(0)
        if (c.minScore !== undefined) {
          expect(result.score).toBeGreaterThanOrEqual(c.minScore)
        }
        if ("expected" in c) {
          expect(result.content).toEqual(c.expected)
        }
        if (c.expectedDisplay) {
          expect(getDisplayName(result.content as Content)).toBe(c.expectedDisplay)
        }

        // Round trip: inverse(content) must reproduce the input, or the
        // documented normalization when the fixture sets roundTrip
        if (c.roundTrip !== false) {
          const inverse = result.inverse
          expect(inverse, "successful transforms must provide an inverse").toBeDefined()
          if (!inverse) return
          const back = inverse(result.content as Content, options)
          expect(back).toEqual(c.roundTrip === undefined ? c.input : c.roundTrip)
        }
      })
    }

    for (const [i, c] of (fixture.invalid ?? []).entries()) {
      it(`invalid: ${c.name ?? `case ${i}`}`, () => {
        const result = transform.analyze(c.input, c.options ?? transform.defaults)

        expect(
          "content" in result ? result.content : undefined,
          "expected failure but got content"
        ).toBeUndefined()
        expect(
          "message" in result ? result.message : undefined,
          "failures must carry a message"
        ).toBeDefined()
      })
    }
  })
}
