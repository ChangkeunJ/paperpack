# Verification log

Every regulatory value in `packs/*/rules/*.json` is re-read against its source on a
schedule. Australian rates change on 1 July, so the run that matters most is the one in
June or July. This file records what was checked, how it was reached, and what was found.

## Fetch rungs

`ato.gov.au` returns 403 to automated fetching, so a run records how far it had to
escalate. Rung 1 is the primary page directly, rung 2 the `r.jina.ai` text proxy over the
same URL (still the source's own content), rung 3 the Wayback Machine, rung 4 a reputable
secondary source. A value only counts as confirmed at rung 1 or 2.

## 2026-08-18, third pass

All 22 rules, grouped into seven areas, each read once and then handed to a second person
told to break the verdict. **No encoded number was wrong.** One regulatory change was
missed, five verdicts were overturned by the refuters, and roughly half the rule notes
claimed more than their cited page carried.

| verdict | count |
|---|---|
| confirmed | 20 |
| changed | 2 |

### The change that was missed

The 300 dollar no-receipts allowance is **repealed from 2026-27**, along with the 150
dollar laundry threshold, and a 1,000 dollar standard deduction replaces it. Confirmed at
rung 1 in the amending Act and re-confirmed independently: the sections are absent from the
compilation in force 1 July 2026 and the endnotes record the repeal.

It is not a flat addition. The amount is the lesser of 1,000 and total labour income,
reduced by the work deductions actually claimed, so it acts as a floor and someone claiming
more than 1,000 in real expenses simply gets their real expenses. The gate is Australian
residency at any time in the year, so a foreign resident on a working holiday gets neither
the standard deduction nor the allowance it replaced, and is worse off in 2026-27 than in
2025-26. The pack now treats the two years differently and says why.

This is the second time the same amending Act nearly caused an error in opposite
directions. Schedule 4 starts at 2026-27, Schedule 3 at 2027-28, and Schedule 4 Part 2 at
the April 2027 FBT year. The consolidated Act shows none of that.

### What the refuters overturned

Five verdicts. In each case the first verifier had the right facts and the wrong grade.

- **whmBands2026_27** is not confirmed but unverifiable. Four of its twelve numbers, the
  base amounts, are published nowhere, and those four are exactly what decides the tax of
  anyone earning over 45,000. Consistent with the published coefficients is not published.
- **daspWhmRates** carried a one-limb rule where the law has two. Having held the visa is
  not enough; the payment must also include contributions made while holding it. Someone
  who held a 417 years ago and whose balance came later pays the ordinary rate, and the
  note would have told them 65 per cent.
- **rhcaCountries** was keyed on nationality, which is the wrong key for nine of the
  eleven. Coverage turns on health insurance or on where the person lived before arriving.
  Italian and Maltese cover also ends after six months, shorter than the visa, so the note's
  claim that these people cannot get an entitlement statement was wrong in both directions.
  The list is a reason to ask a question, not an answer, and the interview text now says so.
- **taxFreeThreshold** was sourced to a page that never publishes it, and its note stated
  the law incorrectly: treaty nationality is not a gate on the threshold, it is a gate on
  being assessed on the resident basis.
- **lodgementDueDate** cited the deadline for a different form that happens to share a date.

### Two things that turned out better than recorded

The Medicare shade-in rate is published after all, in Medicare Levy Act 1986 s 7(2). The
note claiming it could only be reverse-engineered from a worked example was wrong to give
up so early.

The 2025-26 Medicare thresholds are, as the law currently stands, also the 2026-27 figures:
the amending Act applies them to 2025-26 and later years. The pack still refuses that year,
because the annual indexation rise is legislated afterwards and applying pre-indexation
figures would overstate someone's levy. That reasoning is now in the rule rather than
implied by its absence.

### Everything else

Most remaining findings were notes asserting more than their page supports: the treaty rule
dropped the visa condition and described a switch where the ATO describes a comparison; the
foreign resident bands note explained withholding using a page about assessment; the levy
rate note described exemptions the cited page never mentions; the early lodgment note was
stricter than the source, which allows interest, dividends and royalties after departure.
All rewritten to what the sources carry, with the gaps named rather than papered over.

## 2026-08-18, second pass

Eight questions behind the resident path, each read once and then independently re-read by
a second person told to refute the first. Six agreed outright, two disputed a provenance
claim without disputing a figure. No number was wrong; two design assumptions were.

| area | result |
|---|---|
| Resident rates 2025-26 and 2026-27, low income tax offset, Medicare levy low income thresholds, part-year tax-free threshold | confirmed, rung 2, with the offset and the threshold formula also at rung 1 |
| Medicare levy exemption and what a statement establishes | confirmed, rung 2, statute at rung 1 |
| The method for a resident treaty national | confirmed, rung 2 |
| Working Australians tax offset, first applicable year | confirmed, rung 1 |

### The treaty does not switch you to resident rates

This was the load-bearing correction. The tool was going to apply resident rates to a
resident treaty national. The ATO applies **the lower of two assessments** — one worked
out as a working holiday maker, one worked out as a resident Australian national on the
same income — and the Decision Impact Statement spells out the losing case: if the working
holiday figure is lower, the treaty simply does not apply. Both figures are now on screen.

The two sides are not computed on the same income, either. A temporary resident's foreign
income is left out of the working holiday side but counted on the resident side, which can
decide which one wins. The tool does not ask about foreign income and says so rather than
producing a figure that looks authoritative.

### A resident's tax-free threshold is apportioned

Someone who becomes a resident partway through the year gets `13,464 + 4,736 × N / 12`,
counting the month of arrival in full and running to 30 June, and staying until 30 June
does not avoid it. Arriving in January is worth 15,832, not 18,200. Nothing about this
appears in the ATO's worked examples, which are all full-year.

### Two defects in the ATO's own pages

The Richelle example's total line reads `$2,242 + $600 − $700 = $1,988`. The 2,242
contradicts the 1,888 computed two bullets above it — it is 11,800 at 19 per cent, the
first-bracket rate before 1 July 2024, so the bullets were updated for the rate cut and
the total was not. The equation is also false on its own terms: 2,242 + 600 − 700 is
2,142. No reading of the page produces 1,988. Its conclusion survives, its number does
not, and the test suite uses neither.

Both examples also charge a flat 2 per cent Medicare levy at incomes where the low income
reduction applies. Stefan, at 25,000, is below the lower threshold and owes no levy at
all, so the page's 888 should be 388. The tests encode 388.

### The levy was being charged flat here too

Same defect, ours. A resident was charged 2 per cent of taxable income from the first
dollar. The thresholds now shade it in: nothing at or below 28,011, ten cents in each
dollar up to 35,013, the full rate only above that. The ATO publishes no shade-in rate
anywhere, but its own worked example pins it exactly — 29,000 gives 98.90.

### The offset was missing

The low income tax offset reaches anyone who was an Australian resident at any time in the
year, so a resident on working holiday rates gets it regardless of nationality, and it
applies on both sides of the treaty comparison. It was not being applied at all. Unlike
the tax-free threshold it is not apportioned for a part-year resident: the entitlement
provision asks only for residency "at any time", and that answer is in the Act, not on
any ATO page.

### What was deliberately not encoded

A new Working Australians tax offset sits fully drafted in the Act as it stands on
1 July 2026, with nothing in the section text saying it does not yet apply. Its
application provision lives in the amending Act and starts it at 2027-28. Encoding it from
the consolidated Act would have understated tax by up to 250 dollars a person. Schedule 4
of the very same amending Act starts at 2026-27, so "the Act's start year" is not one
value and a consolidated text cannot be trusted for it.

Medicare levy thresholds for 2026-27 are not published and are indexed annually, so a
resident in that year is refused rather than estimated. Someone holding an entitlement
statement is still computable, since their levy is nil either way.

## 2026-08-18, first pass

Seventeen rules checked. Sixteen confirmed, one unverifiable. No value was wrong.

| area | result |
|---|---|
| WHM bands 2025-26 and 2026-27, foreign resident bands, no-TFN rate, tax free threshold, Medicare levy | confirmed, rung 2 |
| DASP rates for WHMs and other temporary residents, deduction substantiation, laundry rates | confirmed, rung 2 |
| Treaty country list, treaty start years, reciprocal health care countries, non-lodgement threshold, lodgement due date, early lodgement processing | confirmed, rung 2 |
| Medicare Entitlement Statement processing time | **unverifiable, removed** |

### What changed

**A processing time was removed because it had no source.** The data claimed a Medicare
Entitlement Statement takes up to eight weeks, and that claim was showing in the
interview help text. No Services Australia page states any processing time. The rule now
carries only what the source says: applications open 1 July, and someone leaving
Australia can apply up to four weeks before departure with processing after they leave.
Those are different things and reconciling them by eye is how the eight got there.

**The DASP rule is broader than it was written.** The ATO does not phrase it as a
contribution-date test. Having held a 417 or 462 visa at any time puts the entire payment
at 65 per cent, including super earned later under a different visa, with no
apportionment, and an associated bridging visa counts. The note now uses the ATO's
framing rather than a narrower paraphrase.

**Two citations pointed at pages that did not carry the claim.** The reciprocal health
care rule cited a hub page that says "11 countries" without naming them; it now cites the
page listing them. The Medicare levy rate cited an exemption page that mentions 2 per cent
only inside an example; it now cites the page that states the rate.

### Still derived rather than published

The 2026-27 band ceilings and rates are confirmed against the withholding schedule, but
its four base amounts are not published anywhere reachable. They follow arithmetically
from the confirmed rates and the test suite checks that they do, which is a consistency
check and not a source. The ATO assessment page still stops at 2025-26. Re-check when it
moves.

The 1 July 2017 start date on the DASP working holiday rate is not stated on the page
that carries the rate, and remains unsourced.

### Known gap

Resident individual rates are not in this pack, so a resident of a treaty country gets
referred rather than calculated. The ATO has since published a 2026-27 resident table
with a lower second bracket, which would make that path implementable. It has not been
verified in a dedicated pass and nothing should be encoded from an incidental sighting.
