import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimate, type WhmAnswers } from './calculate.js'

const base: WhmAnswers = {
  financialYear: '2025-26',
  nationality: 'KR',
  isAustralianTaxResident: false,
  providedTfn: true,
  grossIncome: 30000,
  taxWithheld: 4500,
  workRelatedDeductions: 0,
  hasMedicareEntitlementStatement: false,
}

const at = (o: Partial<WhmAnswers>) => estimate({ ...base, ...o })
const near = (actual: number, expected: number, what: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${what}: ${actual} is not ${expected}`)

test('a registered employer withholding 15 per cent lands on zero', () => {
  const r = at({})
  assert.equal(r.taxPayable, 4500)
  assert.equal(r.medicareLevy, 0)
  assert.equal(r.balance, 0)
})

test('an unregistered employer withholding 30 per cent produces the refund', () => {
  const r = at({ taxWithheld: 9000 })
  assert.equal(r.taxPayable, 4500)
  assert.equal(r.balance, 4500)
  assert.ok(r.flags.includes('lodging-is-optional-but-refund-needs-a-return'))
})

test('no TFN means 45 per cent withheld and nearly all of it comes back', () => {
  const r = at({ providedTfn: false, taxWithheld: 13500 })
  assert.equal(r.balance, 9000)
  assert.ok(r.flags.includes('no-tfn-withholding-is-recoverable'))
})

test('deductions reduce taxable income', () => {
  const r = at({ workRelatedDeductions: 1000 })
  assert.equal(r.taxableIncome, 29000)
  assert.equal(r.taxPayable, 4350)
  assert.ok(r.flags.includes('deductions-need-written-evidence'))
})

test('a claim at or under the substantiation threshold raises no evidence flag', () => {
  assert.ok(!at({ workRelatedDeductions: 300 }).flags.includes('deductions-need-written-evidence'))
})

test('a foreign resident reaches neither the offset nor the levy', () => {
  const r = at({})
  assert.equal(r.lowIncomeTaxOffset, 0)
  assert.equal(r.medicareLevy, 0)
})

test('residency does not change the rate for a non-NDA nationality', () => {
  const r = at({ isAustralianTaxResident: true })
  assert.equal(r.basis, 'whm-rates')
  assert.equal(r.taxPayable, 4500)
  assert.ok(r.flags.includes('resident-but-whm-rates-still-apply'))
})

// Residency alone unlocks the offset. Nationality decides the rates, not the offset.
test('a resident on working holiday rates still gets the low income offset', () => {
  const r = at({ isAustralianTaxResident: true })
  assert.equal(r.lowIncomeTaxOffset, 700)
  assert.equal(r.totalLiability, 3998.9)
})

test('an NDA nationality alone is not enough without residency', () => {
  for (const nationality of ['GB', 'DE', 'JP', 'IL']) {
    assert.equal(at({ nationality }).basis, 'whm-rates', nationality)
  }
})

test('the United States and South Korea are outside the NDA list', () => {
  for (const nationality of ['US', 'KR']) {
    assert.equal(at({ nationality, isAustralianTaxResident: true }).basis, 'whm-rates', nationality)
  }
})

// The ATO's own worked example, on its Australian-source figures. Its printed total is
// higher because the page charges a flat 2 per cent levy at an income below the low
// income threshold, where none is payable.
test('the ATO example for a German resident comes out at 388 dollars', () => {
  const r = at({
    nationality: 'DE',
    isAustralianTaxResident: true,
    grossIncome: 25000,
    taxWithheld: 3750,
  })
  assert.equal(r.basis, 'nda-comparison')
  assert.equal(r.comparison?.applied, 'resident')
  assert.equal(r.taxPayable, 1088)
  assert.equal(r.lowIncomeTaxOffset, 700)
  assert.equal(r.medicareLevy, 0)
  assert.equal(r.totalLiability, 388)
  assert.equal(r.comparison?.whmBasis.total, 3050)
})

test('the ATO example for a British resident comes out at 868 dollars', () => {
  const r = at({ nationality: 'GB', isAustralianTaxResident: true, grossIncome: 28000 })
  assert.equal(r.totalLiability, 868)
  assert.equal(r.comparison?.whmBasis.total, 3500)
  assert.ok(r.flags.includes('nda-resident-basis-is-lower'))
})

test('foreign income is flagged as outside the comparison', () => {
  const r = at({ nationality: 'GB', isAustralianTaxResident: true })
  assert.ok(r.flags.includes('foreign-income-changes-the-comparison'))
})

// The treaty gives the cheaper of two assessments, not resident rates. On Australian
// wages alone the resident side always wins, which is what the ATO says in passing and
// what this checks has not been broken by a data edit.
test('the resident basis is never the dearer of the two on Australian wages', () => {
  for (const grossIncome of [5000, 18200, 25000, 45000, 60000, 140000, 250000]) {
    for (const residentMonths of [1, 3, 6, 12]) {
      const r = at({
        nationality: 'GB',
        isAustralianTaxResident: true,
        grossIncome,
        residentMonths,
      })
      const { whmBasis, residentBasis } = r.comparison!
      assert.ok(
        residentBasis.total <= whmBasis.total,
        `${grossIncome} over ${residentMonths} months: ${residentBasis.total} > ${whmBasis.total}`,
      )
    }
  }
})

test('arriving partway through the year shrinks the threshold', () => {
  const r = at({
    nationality: 'DE',
    isAustralianTaxResident: true,
    grossIncome: 25000,
    residentMonths: 3,
  })
  assert.ok(r.flags.includes('part-year-threshold-applied'))
  near(r.totalLiability, 956.32, 'three months of residency')
  assert.ok(r.totalLiability > at({ nationality: 'DE', isAustralianTaxResident: true, grossIncome: 25000 }).totalLiability)
})

test('the levy is shaded in rather than charged flat', () => {
  near(at({ isAustralianTaxResident: true, grossIncome: 29000 }).medicareLevy, 98.9, 'Angie')
  assert.equal(at({ isAustralianTaxResident: true, grossIncome: 28011 }).medicareLevy, 0)
  assert.equal(at({ isAustralianTaxResident: true, grossIncome: 40000 }).medicareLevy, 800)
})

test('a resident under the threshold pays no levy at all', () => {
  const r = at({ isAustralianTaxResident: true, grossIncome: 20000 })
  assert.equal(r.medicareLevy, 0)
  assert.ok(r.flags.includes('below-the-medicare-levy-threshold'))
})

test('the offset cannot take tax below zero', () => {
  const r = at({ nationality: 'DE', isAustralianTaxResident: true, grossIncome: 19000 })
  assert.equal(r.taxPayable, 128)
  assert.equal(r.lowIncomeTaxOffset, 128)
  assert.equal(r.totalLiability, 0)
})

test('the offset runs out above the entitlement ceiling', () => {
  assert.equal(at({ isAustralianTaxResident: true, grossIncome: 70000 }).lowIncomeTaxOffset, 0)
  assert.equal(at({ isAustralianTaxResident: true, grossIncome: 37500 }).lowIncomeTaxOffset, 700)
  assert.equal(at({ isAustralianTaxResident: true, grossIncome: 45000 }).lowIncomeTaxOffset, 325)
})

test('a resident from an RHCA country is warned the levy is likely payable', () => {
  const r = at({ nationality: 'IE', isAustralianTaxResident: true })
  assert.ok(r.flags.includes('rhca-country-medicare-likely-payable'))
  near(r.medicareLevy, 198.9, 'Irish resident')
})

test('an entitlement statement removes the levy', () => {
  const r = at({ isAustralianTaxResident: true, hasMedicareEntitlementStatement: true })
  assert.equal(r.medicareLevy, 0)
  assert.ok(r.flags.includes('medicare-exemption-claimed'))
})

// The thresholds are indexed and the ATO publishes them late. Guessing at them would put
// a wrong number in front of someone, so the year is refused instead.
test('a year with no published levy thresholds is refused rather than estimated', () => {
  const r = at({ financialYear: '2026-27', isAustralianTaxResident: true })
  assert.equal(r.basis, 'referral-no-published-thresholds')
  assert.equal(r.totalLiability, 0)
  assert.ok(r.flags.includes('medicare-thresholds-not-published-for-this-year'))
})

test('an exempt resident is computable in that year anyway', () => {
  const r = at({
    financialYear: '2026-27',
    isAustralianTaxResident: true,
    hasMedicareEntitlementStatement: true,
  })
  assert.equal(r.basis, 'whm-rates')
  assert.equal(r.totalLiability, 3800)
})

test('every figure shown carries a source and a check date', () => {
  const r = at({ isAustralianTaxResident: true, providedTfn: false, workRelatedDeductions: 500 })
  assert.ok(r.citations.length >= 4)
  for (const c of r.citations) {
    assert.match(c.source, /^https:\/\//, c.rule)
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/, c.rule)
  }
})

test('both financial years are computable', () => {
  assert.equal(at({ financialYear: '2026-27' }).taxPayable, 4500)
})
