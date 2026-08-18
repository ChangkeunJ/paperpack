import type { Question } from '../../src/interview.js'
import type { WhmAnswers } from './calculate.js'

/**
 * Countries that change the answer (non-discrimination article or reciprocal health
 * care agreement), plus the largest source countries by visa holders. Anything else
 * is OTHER, which behaves the same as any non-listed nationality.
 */
export const NATIONALITIES = [
  'GB', 'DE', 'FI', 'CL', 'JP', 'NO', 'TR', 'IL',
  'BE', 'IT', 'MT', 'NL', 'NZ', 'IE', 'SI', 'SE',
  'FR', 'TW', 'KR', 'ID', 'AR', 'TH', 'VN', 'ES', 'US', 'CN',
  'OTHER',
] as const

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
  { id: 'maintainedHomeOverseas', type: 'boolean', promptKey: 'q.maintainedHomeOverseas' },
  {
    id: 'isAustralianTaxResident',
    type: 'boolean',
    promptKey: 'q.isAustralianTaxResident',
    helpKey: 'help.isAustralianTaxResident',
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
