import { taxFromBands, bandsWithThreshold, type Band } from '../../src/tax.js'
import rates from './rules/rates.json' with { type: 'json' }
import eligibility from './rules/eligibility.json' with { type: 'json' }

export type FinancialYear = '2025-26' | '2026-27'

export type WhmAnswers = {
  financialYear: FinancialYear
  /** ISO 3166-1 alpha-2 of the passport held. */
  nationality: string
  isAustralianTaxResident: boolean
  /** Months of residency, counting the month of arrival in full. Only asked on the treaty path. */
  residentMonths?: number
  providedTfn: boolean
  grossIncome: number
  taxWithheld: number
  workRelatedDeductions: number
  /** Held a Medicare Entitlement Statement for the whole year. Residents only. */
  hasMedicareEntitlementStatement: boolean
}

export type Citation = { rule: string; source: string; checked: string; note?: string }

/** One side of the comparison the treaty requires. */
export type Assessment = {
  taxPayable: number
  lowIncomeTaxOffset: number
  medicareLevy: number
  total: number
}

export type WhmEstimate = {
  /** Which rates were used, or why none could be. */
  basis: 'whm-rates' | 'nda-comparison' | 'referral-no-published-thresholds'
  taxableIncome: number
  taxPayable: number
  lowIncomeTaxOffset: number
  medicareLevy: number
  totalLiability: number
  credit: number
  /** Positive means a refund is expected, negative means an amount owing. */
  balance: number
  /** Both sides, when the treaty comparison was run. */
  comparison?: { whmBasis: Assessment; residentBasis: Assessment; applied: 'whm' | 'resident' }
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

export const NDA_COUNTRIES = eligibility.rules.ndaCountries.value as readonly string[]
const RHCA = eligibility.rules.rhcaCountries.value as readonly string[]
const lito = rates.rules.lowIncomeTaxOffset.value
const partYear = rates.rules.partYearTaxFreeThreshold.value

const whmBandRule: Record<FinancialYear, 'whmBands2025_26' | 'whmBands2026_27'> = {
  '2025-26': 'whmBands2025_26',
  '2026-27': 'whmBands2026_27',
}
const residentBandRule: Record<FinancialYear, 'residentBands2025_26' | 'residentBands2026_27'> = {
  '2025-26': 'residentBands2025_26',
  '2026-27': 'residentBands2026_27',
}

// The 300 dollar no-receipts allowance is repealed from 2026-27 and a standard deduction
// takes its place, so both are keyed by year rather than applied to every year.
const substantiationRule: Partial<Record<FinancialYear, 'deductionSubstantiationThreshold'>> = {
  '2025-26': 'deductionSubstantiationThreshold',
}
const standardDeductionRule: Partial<Record<FinancialYear, 'standardWorkDeduction'>> = {
  '2026-27': 'standardWorkDeduction',
}

// Indexed every year and published late, so a year the ATO has not reached yet is absent
// rather than guessed at.
const medicareThresholdRule: Partial<Record<FinancialYear, 'medicareLevyLowIncomeSingle2025_26'>> = {
  '2025-26': 'medicareLevyLowIncomeSingle2025_26',
}

/**
 * Reduced to nil below the lower threshold and shaded in between the two. Both
 * comparisons are inclusive, so the full rate starts above the upper threshold.
 */
function medicareLevyOn(taxableIncome: number, year: FinancialYear): number {
  const rule = medicareThresholdRule[year]
  if (!rule) throw new Error(`no medicare levy thresholds for ${year}`)
  const { lower, upper, shadeInRate } = rates.rules[rule].value
  if (taxableIncome <= lower) return 0
  if (taxableIncome <= upper) return shadeInRate * (taxableIncome - lower)
  return taxableIncome * (rates.rules.medicareLevyRate.value as number)
}

/** Tapers twice, and the second taper crosses zero a third of a dollar before the ceiling. */
function lowIncomeTaxOffset(taxableIncome: number): number {
  if (taxableIncome > lito.entitlementCeiling) return 0
  if (taxableIncome <= lito.fullUpTo) return lito.max
  if (taxableIncome <= lito.secondTaperFrom) {
    return lito.max - lito.firstTaperRate * (taxableIncome - lito.fullUpTo)
  }
  return Math.max(0, lito.secondTaperBase - lito.secondTaperRate * (taxableIncome - lito.secondTaperFrom))
}

/** Whole calendar months, so arriving on the 1st and on the 31st come to the same thing. */
function taxFreeThresholdOver(months: number): number {
  const capped = Math.min(Math.max(months, 0), partYear.monthsInYear)
  return partYear.flat + (partYear.apportioned * capped) / partYear.monthsInYear
}

function assess(
  bands: readonly Band[],
  taxableIncome: number,
  medicareLevy: number,
  offsetAvailable: number,
): Assessment {
  const taxPayable = taxFromBands(bands, taxableIncome)
  // Non-refundable: it cannot take tax below zero and it cannot touch the levy.
  const lowIncomeTaxOffset = Math.min(offsetAvailable, taxPayable)
  return {
    taxPayable,
    lowIncomeTaxOffset,
    medicareLevy,
    total: taxPayable - lowIncomeTaxOffset + medicareLevy,
  }
}

export function estimate(a: WhmAnswers): WhmEstimate {
  const flags: string[] = []
  const used: string[] = [whmBandRule[a.financialYear]]

  if (!a.providedTfn) {
    used.push('noTfnWithholdingRate')
    flags.push('no-tfn-withholding-is-recoverable')
  }

  let deductions = a.workRelatedDeductions
  const substantiation = substantiationRule[a.financialYear]
  if (!substantiation) {
    flags.push('every-deduction-needs-written-evidence')
  } else if (deductions > (rates.rules[substantiation].value as number)) {
    used.push(substantiation)
    flags.push('deductions-need-written-evidence')
  }

  // A floor on the work deduction rather than an addition to it, and only for a resident.
  const standard = standardDeductionRule[a.financialYear]
  if (standard && a.isAustralianTaxResident) {
    used.push(standard)
    const floor = Math.min(rates.rules[standard].value.max, a.grossIncome)
    if (floor > deductions) {
      deductions = floor
      flags.push('standard-deduction-applied')
    }
  }

  const taxableIncome = Math.max(0, a.grossIncome - deductions)

  const finish = (
    basis: WhmEstimate['basis'],
    side: Assessment,
    comparison?: WhmEstimate['comparison'],
  ): WhmEstimate => {
    const threshold = eligibility.rules.nonLodgementWageThreshold.value as number
    if (taxableIncome < threshold && a.taxWithheld > side.total) {
      used.push('nonLodgementWageThreshold')
      flags.push('lodging-is-optional-but-refund-needs-a-return')
    }
    return {
      basis,
      taxableIncome,
      taxPayable: side.taxPayable,
      lowIncomeTaxOffset: side.lowIncomeTaxOffset,
      medicareLevy: side.medicareLevy,
      totalLiability: side.total,
      credit: a.taxWithheld,
      balance: a.taxWithheld - side.total,
      ...(comparison ? { comparison } : {}),
      flags,
      citations: cite(used),
    }
  }

  const whmBands = rates.rules[whmBandRule[a.financialYear]].value

  // A foreign resident pays no levy and reaches no offset, so nothing below applies.
  if (!a.isAustralianTaxResident) {
    return finish('whm-rates', assess(whmBands, taxableIncome, 0, 0))
  }

  used.push('medicareLevyRate')
  let medicareLevy = 0
  if (a.hasMedicareEntitlementStatement) {
    flags.push('medicare-exemption-claimed')
  } else {
    const thresholds = medicareThresholdRule[a.financialYear]
    if (!thresholds) {
      return {
        basis: 'referral-no-published-thresholds',
        taxableIncome,
        taxPayable: 0,
        lowIncomeTaxOffset: 0,
        medicareLevy: 0,
        totalLiability: 0,
        credit: a.taxWithheld,
        balance: 0,
        flags: [...flags, 'medicare-thresholds-not-published-for-this-year'],
        citations: cite(used),
      }
    }
    used.push(thresholds)
    medicareLevy = medicareLevyOn(taxableIncome, a.financialYear)
    if (medicareLevy === 0) {
      flags.push('below-the-medicare-levy-threshold')
    } else if (RHCA.includes(a.nationality)) {
      used.push('rhcaCountries')
      flags.push('rhca-country-medicare-likely-payable')
    } else {
      flags.push('medicare-entitlement-statement-may-be-available')
    }
  }

  // Residency alone unlocks the offset, whatever rates end up applying.
  used.push('lowIncomeTaxOffset')
  const offset = lowIncomeTaxOffset(taxableIncome)
  const whmBasis = assess(whmBands, taxableIncome, medicareLevy, offset)

  if (!NDA_COUNTRIES.includes(a.nationality)) {
    flags.push('resident-but-whm-rates-still-apply')
    return finish('whm-rates', whmBasis)
  }

  // Addy v Commissioner of Taxation [2021] HCA 34. The treaty does not switch someone to
  // resident rates; it entitles them to whichever of the two assessments costs less.
  const months = a.residentMonths ?? partYear.monthsInYear
  used.push('ndaCountries', residentBandRule[a.financialYear])
  if (months < partYear.monthsInYear) {
    used.push('partYearTaxFreeThreshold')
    flags.push('part-year-threshold-applied')
  } else {
    used.push('taxFreeThreshold')
  }
  const residentBasis = assess(
    bandsWithThreshold(rates.rules[residentBandRule[a.financialYear]].value, taxFreeThresholdOver(months)),
    taxableIncome,
    medicareLevy,
    offset,
  )

  const applied = residentBasis.total <= whmBasis.total ? 'resident' : 'whm'
  flags.push(applied === 'resident' ? 'nda-resident-basis-is-lower' : 'nda-whm-basis-is-lower')
  flags.push('foreign-income-changes-the-comparison')
  return finish('nda-comparison', applied === 'resident' ? residentBasis : whmBasis, {
    whmBasis,
    residentBasis,
    applied,
  })
}
