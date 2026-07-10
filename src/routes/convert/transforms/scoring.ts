// Confidence that a string is *intentionally* encoded in a given alphabet, rather than
// coincidentally matching it as plain text. Treat "coincidence" as the null hypothesis:
// the probability that `length` independent characters all happen to fall inside an
// alphabet of `alphabetSize` (out of `universeSize` plausible characters) is
// (alphabetSize / universeSize) ^ length, which shrinks fast as length grows. Score is
// 2 minus that probability, so it climbs toward 2 the longer/more-restrictive the match
// is, and sits at 1 when there's no signal at all (empty input, or an alphabet as
// permissive as the widest sibling transform).
//
// universeSize defaults to 64 — the size of this family's most permissive alphabet
// (base64) — so base64 always scores a flat 1.0 (matching almost any alphanumeric
// string of the right length/padding, length adds no real information) while stricter
// alphabets like base16 (16 chars) and base58 (58 chars) gain confidence as they get
// longer.
export function alphabetConfidence(
  length: number,
  alphabetSize: number,
  universeSize = 64
): number {
  return 2 - Math.pow(alphabetSize / universeSize, length)
}
