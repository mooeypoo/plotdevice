const NUMERALS: readonly [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
]

/** A part number as a Roman numeral (1 → I, 14 → XIV). */
export function romanNumeral(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return String(value)
  let rest = value
  let result = ''
  for (const [amount, numeral] of NUMERALS) {
    while (rest >= amount) {
      result += numeral
      rest -= amount
    }
  }
  return result
}
