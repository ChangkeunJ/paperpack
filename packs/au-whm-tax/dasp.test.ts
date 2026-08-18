import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateDasp, type DaspAnswers } from './dasp.js'

const base: DaspAnswers = {
  superBalance: 6000,
  taxFreeComponent: 0,
  untaxedElement: 0,
  everHeldWhmVisa: true,
  superFromWhmPeriod: true,
  visaCeased: true,
  hasDeparted: true,
}

const at = (o: Partial<DaspAnswers>) => estimateDasp({ ...base, ...o })

test('a backpacker keeps a third of their super', () => {
  const r = at({})
  assert.equal(r.rates, 'whm')
  assert.equal(r.tax, 3900)
  assert.equal(r.net, 2100)
})

// The limb everyone forgets. Holding the visa at some point is not the test.
test('no super from the visa period means ordinary rates', () => {
  const r = at({ superFromWhmPeriod: false })
  assert.equal(r.rates, 'ordinary')
  assert.equal(r.tax, 2100)
  assert.ok(r.flags.includes('ordinary-rates-despite-having-held-the-visa'))
})

test('never having held the visa means ordinary rates without the warning', () => {
  const r = at({ everHeldWhmVisa: false, superFromWhmPeriod: undefined })
  assert.equal(r.rates, 'ordinary')
  assert.ok(!r.flags.includes('ordinary-rates-despite-having-held-the-visa'))
})

test('the working holiday rate takes the whole payment, not a share of it', () => {
  const r = at({ superBalance: 10000, untaxedElement: 4000 })
  assert.equal(r.taxedElement, 6000)
  assert.equal(r.tax, 6500)
  assert.ok(r.flags.includes('whm-rate-covers-the-whole-payment'))
})

test('the untaxed element costs more only on the ordinary rates', () => {
  const ordinary = { everHeldWhmVisa: false, superFromWhmPeriod: undefined }
  assert.equal(at({ ...ordinary, superBalance: 10000, untaxedElement: 10000 }).tax, 4500)
  assert.equal(at({ ...ordinary, superBalance: 10000 }).tax, 3500)
})

test('a tax free component is paid out whole', () => {
  const r = at({ superBalance: 6000, taxFreeComponent: 1000 })
  assert.equal(r.taxedElement, 5000)
  assert.equal(r.tax, 3250)
  assert.equal(r.net, 2750)
})

test('components larger than the balance are flagged rather than going negative', () => {
  const r = at({ superBalance: 1000, taxFreeComponent: 900, untaxedElement: 900 })
  assert.equal(r.taxedElement, 0)
  assert.ok(r.flags.includes('components-add-up-to-more-than-the-balance'))
})

test('nothing is payable before the visa ends and the person leaves', () => {
  for (const o of [{ visaCeased: false }, { hasDeparted: false }]) {
    const r = at(o)
    assert.equal(r.claimable, false)
    assert.ok(r.flags.includes('nothing-is-payable-until-the-visa-ends-and-you-leave'))
  }
  assert.equal(at({}).claimable, true)
})

test('the rate used carries a source and a check date', () => {
  for (const o of [{}, { superFromWhmPeriod: false }]) {
    const [c] = at(o).citations
    assert.match(c!.source, /^https:\/\//)
    assert.match(c!.checked, /^\d{4}-\d{2}-\d{2}$/)
  }
})

// Where the money is and whether it goes on the return do not depend on any answer, so
// they are said every time rather than only when something triggers them.
test('the transfer and the return are explained on every path', () => {
  for (const o of [{}, { everHeldWhmVisa: false }, { hasDeparted: false }]) {
    const r = at(o)
    assert.ok(r.flags.includes('super-moves-to-the-ato-after-six-months'))
    assert.ok(r.flags.includes('dasp-is-not-income-on-your-return'))
    const cited = r.citations.map(c => c.rule)
    assert.deepEqual([...new Set(cited)], cited)
    assert.ok(cited.includes('unclaimedSuperTransfer'))
  }
})

test('components beyond the balance are capped, never taxed as extra dollars', () => {
  const r = at({ superBalance: 1000, taxFreeComponent: 0, untaxedElement: 2000 })
  assert.equal(r.untaxedElement, 1000)
  assert.equal(r.tax, 650)
  assert.equal(r.net, 350)
  assert.ok(r.flags.includes('components-add-up-to-more-than-the-balance'))
})

test('a negative balance produces zeroes, not a complaint about components', () => {
  const r = at({ superBalance: -100 })
  assert.equal(r.tax, 0)
  assert.equal(r.net, 0)
  assert.ok(!r.flags.includes('components-add-up-to-more-than-the-balance'))
})

test('the return treatment is cited, not just asserted', () => {
  assert.ok(at({}).citations.some(c => c.rule === 'daspNotAssessable'))
})
