export interface FractionEntry {
  id: number
  decimal: number
  negative: boolean
  wholePart: number // display whole (incremented if rounded up)
  tapeWhole: number // floor of abs value (for tape labels)
  fractional: number // exact fractional part [0, 1) for arrow
  numerator: number // simplified
  denominator: number // simplified
  rawNumerator: number // 0 to maxDenominator (for nearest tick)
  maxDenominator: number
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}

export function toFraction(decimal: number, maxDenominator: number): FractionEntry {
  const negative = decimal < 0
  const abs = Math.abs(decimal)
  const tapeWhole = Math.floor(abs)
  const fractional = abs - tapeWhole
  const rawNumerator = Math.round(fractional * maxDenominator)

  let wholePart = tapeWhole
  let numerator = 0
  let denominator = 1

  if (rawNumerator >= maxDenominator) {
    wholePart = tapeWhole + 1
  } else if (rawNumerator > 0) {
    const g = gcd(rawNumerator, maxDenominator)
    numerator = rawNumerator / g
    denominator = maxDenominator / g
  }

  return {
    id: 0,
    decimal,
    negative,
    wholePart,
    tapeWhole,
    fractional,
    numerator,
    denominator,
    rawNumerator: Math.min(rawNumerator, maxDenominator),
    maxDenominator,
  }
}

export function tickLevel(i: number, maxDenominator: number): number {
  if (i === 0 || i === maxDenominator) return Math.log2(maxDenominator)
  let level = 0
  let n = i
  while (n % 2 === 0) {
    level++
    n /= 2
  }
  return level
}
