export type Band = { upTo: number | null; rate: number; base: number }

/** Progressive tax from a band table. Bands must be ordered, with the open band last. */
export function taxFromBands(bands: readonly Band[], income: number): number {
  if (income <= 0) return 0
  let floor = 0
  for (const band of bands) {
    if (band.upTo === null || income <= band.upTo) {
      return band.base + band.rate * (income - floor)
    }
    floor = band.upTo
  }
  throw new Error('band table has no open upper band')
}
