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

test('residency does not change the rate for a non-NDA nationality', () => {
  const r = at({ isAustralianTaxResident: true })
  assert.equal(r.basis, 'whm-rates')
  assert.equal(r.taxPayable, 4500)
  assert.ok(r.flags.includes('resident-but-whm-rates-still-apply'))
})

test('a resident from an NDA country is referred, not guessed at', () => {
  const r = at({ nationality: 'GB', isAustralianTaxResident: true })
  assert.equal(r.basis, 'referral-nda-resident')
  assert.ok(r.flags.includes('nda-resident-not-calculated'))
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

test('a resident without an entitlement statement pays the levy', () => {
  const r = at({ isAustralianTaxResident: true })
  assert.equal(r.medicareLevy, 600)
  assert.equal(r.totalLiability, 5100)
})

test('a resident from an RHCA country is warned the levy is likely payable', () => {
  const r = at({ nationality: 'IE', isAustralianTaxResident: true })
  assert.ok(r.flags.includes('rhca-country-medicare-likely-payable'))
  assert.equal(r.medicareLevy, 600)
})

test('an entitlement statement removes the levy', () => {
  const r = at({ isAustralianTaxResident: true, hasMedicareEntitlementStatement: true })
  assert.equal(r.medicareLevy, 0)
  assert.ok(r.flags.includes('medicare-exemption-claimed'))
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
