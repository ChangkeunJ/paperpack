import rates from './rules/rates.json' with { type: 'json' }
import type { Citation } from './calculate.js'

export type DaspAnswers = {
  /** Everything the fund holds, before tax. */
  superBalance: number
  /** The part built from personal after-tax contributions. Usually nothing. */
  taxFreeComponent: number
  /** From an unfunded scheme, which almost no private fund is. */
  untaxedElement: number
  everHeldWhmVisa: boolean
  /** Whether the payment includes super contributed while that visa was held. */
  superFromWhmPeriod?: boolean
  visaCeased: boolean
  hasDeparted: boolean
}

export type DaspEstimate = {
  /** Which of the two rate sets the payment falls under. */
  rates: 'whm' | 'ordinary'
  taxFreeComponent: number
  taxedElement: number
  untaxedElement: number
  tax: number
  net: number
  /** Both conditions have to hold before a fund will pay anything out. */
  claimable: boolean
  flags: string[]
  citations: Citation[]
}

type Rule = { value: unknown; source: string; checked: string; note?: string }

function cite(names: string[]): Citation[] {
  return names.map(rule => {
    const r = (rates.rules as Record<string, Rule>)[rule]
    if (!r) throw new Error(`unknown rule: ${rule}`)
    return { rule, source: r.source, checked: r.checked, ...(r.note ? { note: r.note } : {}) }
  })
}

export function estimateDasp(a: DaspAnswers): DaspEstimate {
  const flags: string[] = []

  // Two limbs, and people only remember the first. Having held the visa is not enough on
  // its own: the payment also has to contain super contributed while it was held.
  const whm = a.everHeldWhmVisa && a.superFromWhmPeriod === true
  const rule = whm ? 'daspWhmRates' : 'daspOtherTemporaryResidentRates'
  const rate = rates.rules[rule].value

  const taxFreeComponent = Math.max(0, a.taxFreeComponent)
  const untaxedElement = Math.max(0, a.untaxedElement)
  const named = taxFreeComponent + untaxedElement
  if (named > a.superBalance) flags.push('components-add-up-to-more-than-the-balance')
  const taxedElement = Math.max(0, a.superBalance - named)

  const tax =
    taxFreeComponent * rate.taxFreeComponent +
    taxedElement * rate.taxedElement +
    untaxedElement * rate.untaxedElement

  if (whm) {
    flags.push('whm-rate-covers-the-whole-payment')
  } else if (a.everHeldWhmVisa) {
    flags.push('ordinary-rates-despite-having-held-the-visa')
  }

  const claimable = a.visaCeased && a.hasDeparted
  if (!claimable) flags.push('nothing-is-payable-until-the-visa-ends-and-you-leave')

  return {
    rates: whm ? 'whm' : 'ordinary',
    taxFreeComponent,
    taxedElement,
    untaxedElement,
    tax,
    net: Math.max(0, a.superBalance) - tax,
    claimable,
    flags,
    citations: cite([rule]),
  }
}
