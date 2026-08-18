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

/**
 * The same rate scale with a smaller tax-free threshold. Ceilings above the threshold do
 * not move, so every base amount below them has to be worked out again. Expects a
 * zero-rate first band.
 */
export function bandsWithThreshold(bands: readonly Band[], threshold: number): Band[] {
  let floor = threshold
  let base = 0
  return bands.map((band, i) => {
    if (i === 0) return { ...band, upTo: threshold, base: 0 }
    const shifted = { ...band, base }
    if (band.upTo !== null) {
      base += band.rate * (band.upTo - floor)
      floor = band.upTo
    }
    return shifted
  })
}
