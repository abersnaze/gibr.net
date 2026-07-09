import type { DisplayName } from "../../../model.js"

export interface ValidCase {
  name?: string
  input: unknown
  /** Passed to analyze() and to the inverse. Defaults to the transform's own defaults. */
  options?: string
  /** Expected analyze() content (deep-equal). Omit to assert success only. */
  expected?: unknown
  /** Expected display type inferred from the content. */
  expectedDisplay?: DisplayName
  /** Minimum raw (un-normalized) score analyze() must return. */
  minScore?: number
  /**
   * Expected result of inverse(content). Defaults to `input`. Set this when the
   * transform normalizes its input (e.g. whitespace stripped, JSON re-indented),
   * or set to `false` to skip the round-trip check entirely.
   */
  roundTrip?: unknown
}

export interface InvalidCase {
  name?: string
  input: unknown
  options?: string
}

export interface TransformFixture {
  valid: ValidCase[]
  invalid?: InvalidCase[]
}
