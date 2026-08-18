import { test } from 'node:test'
import assert from 'node:assert/strict'
import { taxFromBands, bandsWithThreshold, type Band } from './tax.js'
import rates from '../packs/au-whm-tax/rules/rates.json' with { type: 'json' }

const whm = rates.rules.whmBands2025_26.value as Band[]

test('no tax below the first dollar', () => {
  assert.equal(taxFromBands(whm, 0), 0)
  assert.equal(taxFromBands(whm, -100), 0)
})

test('first band is flat 15 per cent from the first dollar', () => {
  assert.equal(taxFromBands(whm, 1), 0.15)
  assert.equal(taxFromBands(whm, 45000), 6750)
})

test('band boundaries are continuous', () => {
  assert.equal(taxFromBands(whm, 45001), 6750.3)
  assert.equal(taxFromBands(whm, 135000), 33750)
  assert.equal(taxFromBands(whm, 190000), 54100)
})

// Catches a mistyped base or rate in the rule data, which is the most likely
// way this pack would quietly start telling people the wrong number.
for (const [name, table] of Object.entries(rates.rules)) {
  const bands = (table as { value: unknown }).value
  if (!Array.isArray(bands) || !bands.every(b => 'upTo' in b && 'rate' in b)) continue
  test(`${name}: each base equals the tax at the previous ceiling`, () => {
    for (let i = 1; i < bands.length; i++) {
      const ceiling = bands[i - 1].upTo as number
      assert.equal(
        bands[i].base,
        taxFromBands(bands as Band[], ceiling),
        `band ${i} base disagrees with the table below it`,
      )
    }
  })
}

test('throws rather than guessing when the table has no open band', () => {
  const broken: Band[] = [{ upTo: 100, rate: 0.1, base: 0 }]
  assert.throws(() => taxFromBands(broken, 500), /open upper band/)
})

test('rebuilding a scale at its own threshold reproduces it exactly', () => {
  const resident: Band[] = [
    { upTo: 18200, rate: 0, base: 0 },
    { upTo: 45000, rate: 0.16, base: 0 },
    { upTo: 135000, rate: 0.3, base: 4288 },
    { upTo: 190000, rate: 0.37, base: 31288 },
    { upTo: null, rate: 0.45, base: 51638 },
  ]
  assert.deepEqual(bandsWithThreshold(resident, 18200), resident)
})

test('a smaller threshold raises every base amount above it', () => {
  const bands = bandsWithThreshold(
    [
      { upTo: 18200, rate: 0, base: 0 },
      { upTo: 45000, rate: 0.16, base: 0 },
      { upTo: null, rate: 0.3, base: 4288 },
    ],
    14648,
  )
  const [first, , top] = bands
  assert.equal(first?.upTo, 14648)
  assert.equal(taxFromBands(bands, 14648), 0)
  assert.equal(taxFromBands(bands, 20000), 0.16 * (20000 - 14648))
  assert.equal(top?.base, 0.16 * (45000 - 14648))
})

// If a published base amount is ever mistyped, this is what catches it.
test('the published resident base amounts follow from the published rates', () => {
  for (const key of ['residentBands2025_26', 'residentBands2026_27'] as const) {
    const published = rates.rules[key].value as Band[]
    const threshold = published[0]?.upTo
    assert.equal(typeof threshold, 'number', key)
    assert.deepEqual(bandsWithThreshold(published, threshold as number), published, key)
  }
})
