import { taxFromBands, type Band } from '../../src/tax.js'
import rates from './rules/rates.json' with { type: 'json' }
import eligibility from './rules/eligibility.json' with { type: 'json' }

export type FinancialYear = '2025-26' | '2026-27'

export type WhmAnswers = {
  financialYear: FinancialYear
  /** ISO 3166-1 alpha-2 of the passport held. */
  nationality: string
  isAustralianTaxResident: boolean
  providedTfn: boolean
  grossIncome: number
  taxWithheld: number
  workRelatedDeductions: number
  /** Held a Medicare Entitlement Statement for the whole year. Residents only. */
  hasMedicareEntitlementStatement: boolean
}

export type Citation = { rule: string; source: string; checked: string; note?: string }

export type WhmEstimate = {
  /** Where the rates came from, or why we refused to guess. */
  basis: 'whm-rates' | 'referral-nda-resident'
  taxableIncome: number
  taxPayable: number
  medicareLevy: number
  totalLiability: number
  credit: number
  /** Positive means a refund is expected, negative means an amount owing. */
  balance: number
  flags: string[]
  citations: Citation[]
}

type Rule = { value: unknown; source: string; checked: string; note?: string }
const allRules: Record<string, Rule> = {
  ...(rates.rules as Record<string, Rule>),
  ...(eligibility.rules as Record<string, Rule>),
}

function cite(names: string[]): Citation[] {
  return names.map(rule => {
    const r = allRules[rule]
    if (!r) throw new Error(`unknown rule: ${rule}`)
    return { rule, source: r.source, checked: r.checked, ...(r.note ? { note: r.note } : {}) }
  })
}

const bandsFor: Record<FinancialYear, readonly Band[]> = {
  '2025-26': rates.rules.whmBands2025_26.value,
  '2026-27': rates.rules.whmBands2026_27.value,
}

const NDA = eligibility.rules.ndaCountries.value as readonly string[]
const RHCA = eligibility.rules.rhcaCountries.value as readonly string[]

export function estimate(a: WhmAnswers): WhmEstimate {
  const flags: string[] = []
  const used = ['whmBands' + (a.financialYear === '2025-26' ? '2025_26' : '2026_27')]

  const taxableIncome = Math.max(0, a.grossIncome - a.workRelatedDeductions)

  // Addy v Commissioner of Taxation [2021] HCA 34 needs BOTH residency and an NDA
  // nationality. Resident individual rates are not in this pack yet, so we refer
  // rather than guess at someone's assessment.
  if (a.isAustralianTaxResident && NDA.includes(a.nationality)) {
    return {
      basis: 'referral-nda-resident',
      taxableIncome,
      taxPayable: 0,
      medicareLevy: 0,
      totalLiability: 0,
      credit: a.taxWithheld,
      balance: 0,
      flags: ['nda-resident-not-calculated'],
      citations: cite(['ndaCountries', 'taxFreeThreshold']),
    }
  }

  if (a.isAustralianTaxResident) {
    // Rates are unchanged by residency for everyone outside the NDA list.
    flags.push('resident-but-whm-rates-still-apply')
  }

  const taxPayable = taxFromBands(bandsFor[a.financialYear], taxableIncome)

  let medicareLevy = 0
  if (a.isAustralianTaxResident) {
    used.push('medicareLevyRate')
    if (a.hasMedicareEntitlementStatement) {
      flags.push('medicare-exemption-claimed')
    } else {
      medicareLevy = taxableIncome * (rates.rules.medicareLevyRate.value as number)
      if (RHCA.includes(a.nationality)) {
        used.push('rhcaCountries')
        flags.push('rhca-country-medicare-likely-payable')
      } else {
        flags.push('medicare-entitlement-statement-may-be-available')
      }
    }
  }

  if (!a.providedTfn) {
    used.push('noTfnWithholdingRate')
    flags.push('no-tfn-withholding-is-recoverable')
  }

  if (a.workRelatedDeductions > (rates.rules.deductionSubstantiationThreshold.value as number)) {
    used.push('deductionSubstantiationThreshold')
    flags.push('deductions-need-written-evidence')
  }

  const totalLiability = taxPayable + medicareLevy
  const threshold = eligibility.rules.nonLodgementWageThreshold.value as number
  if (taxableIncome < threshold && a.taxWithheld > totalLiability) {
    used.push('nonLodgementWageThreshold')
    flags.push('lodging-is-optional-but-refund-needs-a-return')
  }

  return {
    basis: 'whm-rates',
    taxableIncome,
    taxPayable,
    medicareLevy,
    totalLiability,
    credit: a.taxWithheld,
    balance: a.taxWithheld - totalLiability,
    flags,
    citations: cite(used),
  }
}
