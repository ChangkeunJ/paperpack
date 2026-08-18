# Verification log

Every regulatory value in `packs/*/rules/*.json` is re-read against its source on a
schedule. Australian rates change on 1 July, so the run that matters most is the one in
June or July. This file records what was checked, how it was reached, and what was found.

## Fetch rungs

`ato.gov.au` returns 403 to automated fetching, so a run records how far it had to
escalate. Rung 1 is the primary page directly, rung 2 the `r.jina.ai` text proxy over the
same URL (still the source's own content), rung 3 the Wayback Machine, rung 4 a reputable
secondary source. A value only counts as confirmed at rung 1 or 2.

## 2026-08-18

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
