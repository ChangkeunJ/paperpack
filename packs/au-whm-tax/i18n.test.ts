import { test } from 'node:test'
import assert from 'node:assert/strict'
import { questions, daspQuestions, NATIONALITIES } from './interview.js'
import { estimate, type WhmAnswers } from './calculate.js'
import { estimateDasp, type DaspAnswers } from './dasp.js'
import en from './i18n/en.json' with { type: 'json' }
import ko from './i18n/ko.json' with { type: 'json' }

const keys = (o: object) => new Set(Object.keys(o))

test('every locale carries the same keys', () => {
  const [a, b] = [keys(en), keys(ko)]
  assert.deepEqual([...a].filter(k => !b.has(k)), [], 'missing from ko')
  assert.deepEqual([...b].filter(k => !a.has(k)), [], 'missing from en')
})

test('no locale string is left empty', () => {
  for (const [locale, dict] of Object.entries({ en, ko })) {
    for (const [k, v] of Object.entries(dict)) {
      assert.ok(typeof v === 'string' && v.trim().length > 0, `${locale}.${k}`)
    }
  }
})

test('every question and option has a label', () => {
  const have = keys(en)
  for (const q of [...questions, ...daspQuestions]) {
    assert.ok(have.has(q.promptKey), q.promptKey)
    if (q.helpKey) assert.ok(have.has(q.helpKey), q.helpKey)
    for (const o of q.options ?? []) assert.ok(have.has(o.labelKey), o.labelKey)
  }
})

test('every nationality is named', () => {
  for (const c of NATIONALITIES) assert.ok(keys(en).has(`country.${c}`), c)
})

// Anything the calculator can say has to be sayable in both languages.
test('every flag the calculator can raise has a message', () => {
  const base: WhmAnswers = {
    financialYear: '2025-26', nationality: 'KR', isAustralianTaxResident: false,
    providedTfn: true, grossIncome: 30000, taxWithheld: 4500,
    workRelatedDeductions: 0, hasMedicareEntitlementStatement: false,
  }
  const seen = new Set<string>()
  for (const financialYear of ['2025-26', '2026-27'] as const)
   for (const nationality of NATIONALITIES)
    for (const isAustralianTaxResident of [true, false])
      for (const providedTfn of [true, false])
        for (const hasMedicareEntitlementStatement of [true, false])
          for (const workRelatedDeductions of [0, 500])
            for (const residentMonths of [12, 6])
              for (const [grossIncome, taxWithheld] of [[30000, 9000], [200000, 10000]] as const)
                estimate({ ...base, financialYear, nationality, isAustralianTaxResident, providedTfn, residentMonths,
                  hasMedicareEntitlementStatement, workRelatedDeductions, grossIncome, taxWithheld })
                  .flags.forEach(f => seen.add(f))

  assert.ok(seen.size >= 12, `only saw ${seen.size} flags`)
  for (const flag of seen) assert.ok(keys(en).has(`flag.${flag}`), `flag.${flag}`)
})

test('every rule that can be cited has a readable label', async () => {
  const rates = (await import('./rules/rates.json', { with: { type: 'json' } })).default
  const eligibility = (await import('./rules/eligibility.json', { with: { type: 'json' } })).default
  for (const name of [...Object.keys(rates.rules), ...Object.keys(eligibility.rules)]) {
    assert.ok(keys(en).has(`rule.${name}`), `rule.${name}`)
  }
})

// A rule nobody can cite is dead data: its note never reaches a user and nothing
// notices when it rots. Every rule name has to appear in a calculation somewhere.
test('every rule is reachable by some code path', async () => {
  const { readFile } = await import('node:fs/promises')
  const rates = (await import('./rules/rates.json', { with: { type: 'json' } })).default
  const eligibility = (await import('./rules/eligibility.json', { with: { type: 'json' } })).default
  const code = (
    await Promise.all(['calculate.js', 'dasp.js'].map(f => readFile(new URL(f, import.meta.url), 'utf8')))
  ).join('')
  for (const name of [...Object.keys(rates.rules), ...Object.keys(eligibility.rules)]) {
    assert.ok(code.includes(name), `${name} is cited nowhere`)
  }
})

test('every flag the super calculator can raise has a message', () => {
  const base: DaspAnswers = {
    superBalance: 6000, taxFreeComponent: 0, untaxedElement: 0,
    everHeldWhmVisa: true, superFromWhmPeriod: true, visaCeased: true, hasDeparted: true,
  }
  const seen = new Set<string>()
  for (const everHeldWhmVisa of [true, false])
    for (const superFromWhmPeriod of [true, false])
      for (const visaCeased of [true, false])
        for (const hasDeparted of [true, false])
          for (const taxFreeComponent of [0, 9000])
            estimateDasp({ ...base, everHeldWhmVisa, superFromWhmPeriod, visaCeased,
              hasDeparted, taxFreeComponent }).flags.forEach(f => seen.add(f))

  assert.equal(seen.size, 6, [...seen].join(', '))
  for (const flag of seen) assert.ok(keys(en).has(`flag.${flag}`), `flag.${flag}`)
})
