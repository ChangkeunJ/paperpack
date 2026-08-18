import type { Question } from '../../src/interview.js'
import { NDA_COUNTRIES, type WhmAnswers } from './calculate.js'
import type { DaspAnswers } from './dasp.js'

/**
 * Countries that change the answer (non-discrimination article or reciprocal health
 * care agreement), plus the largest source countries by visa holders. Anything else
 * is OTHER, which behaves the same as any non-listed nationality. The treaty row
 * comes from the rule data so the two lists cannot drift apart.
 */
export const NATIONALITIES: readonly string[] = [
  ...NDA_COUNTRIES,
  'BE', 'IT', 'MT', 'NL', 'NZ', 'IE', 'SI', 'SE',
  'FR', 'TW', 'KR', 'ID', 'AR', 'TH', 'VN', 'ES', 'US', 'CN',
  'OTHER',
]

type A = WhmAnswers & { daysInAustralia: number; maintainedHomeOverseas: boolean }

export const questions: readonly Question<A>[] = [
  {
    id: 'financialYear',
    type: 'choice',
    promptKey: 'q.financialYear',
    options: [
      { value: '2025-26', labelKey: 'fy.2025-26' },
      { value: '2026-27', labelKey: 'fy.2026-27' },
    ],
  },
  {
    id: 'nationality',
    type: 'choice',
    promptKey: 'q.nationality',
    helpKey: 'help.nationality',
    options: NATIONALITIES.map(value => ({ value, labelKey: `country.${value}` })),
  },
  { id: 'daysInAustralia', type: 'number', promptKey: 'q.daysInAustralia', helpKey: 'help.daysInAustralia' },
  { id: 'maintainedHomeOverseas', type: 'boolean', promptKey: 'q.maintainedHomeOverseas', helpKey: 'help.maintainedHomeOverseas' },
  {
    id: 'isAustralianTaxResident',
    type: 'boolean',
    promptKey: 'q.isAustralianTaxResident',
    helpKey: 'help.isAustralianTaxResident',
  },
  {
    id: 'residentMonths',
    type: 'number',
    promptKey: 'q.residentMonths',
    helpKey: 'help.residentMonths',
    when: a => a.isAustralianTaxResident === true && NDA_COUNTRIES.includes(a.nationality ?? ''),
  },
  {
    id: 'hasMedicareEntitlementStatement',
    type: 'boolean',
    promptKey: 'q.hasMedicareEntitlementStatement',
    helpKey: 'help.hasMedicareEntitlementStatement',
    when: a => a.isAustralianTaxResident === true,
  },
  { id: 'providedTfn', type: 'boolean', promptKey: 'q.providedTfn', helpKey: 'help.providedTfn' },
  { id: 'grossIncome', type: 'number', promptKey: 'q.grossIncome', helpKey: 'help.grossIncome' },
  { id: 'taxWithheld', type: 'number', promptKey: 'q.taxWithheld', helpKey: 'help.taxWithheld' },
  {
    id: 'workRelatedDeductions',
    type: 'number',
    promptKey: 'q.workRelatedDeductions',
    helpKey: 'help.workRelatedDeductions',
  },
]

export const daspQuestions: readonly Question<DaspAnswers>[] = [
  { id: 'superBalance', type: 'number', promptKey: 'q.superBalance', helpKey: 'help.superBalance' },
  { id: 'everHeldWhmVisa', type: 'boolean', promptKey: 'q.everHeldWhmVisa', helpKey: 'help.everHeldWhmVisa' },
  {
    id: 'superFromWhmPeriod',
    type: 'boolean',
    promptKey: 'q.superFromWhmPeriod',
    helpKey: 'help.superFromWhmPeriod',
    when: a => a.everHeldWhmVisa === true,
  },
  { id: 'taxFreeComponent', type: 'number', promptKey: 'q.taxFreeComponent', helpKey: 'help.taxFreeComponent' },
  { id: 'untaxedElement', type: 'number', promptKey: 'q.untaxedElement', helpKey: 'help.untaxedElement' },
  { id: 'visaCeased', type: 'boolean', promptKey: 'q.visaCeased', helpKey: 'help.visaCeased' },
  { id: 'hasDeparted', type: 'boolean', promptKey: 'q.hasDeparted', helpKey: 'help.hasDeparted' },
]
