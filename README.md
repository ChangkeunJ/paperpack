# paperpack

Answer a set of questions, get the worked-out figures back with the source for every
one of them. Runs entirely in the browser.

![The working holiday tax pack, filled in](docs/screenshot.png)

The first pack works out Australian working holiday maker tax. Around 211,000 people
hold a 417 or 462 visa at any time, most of them are taxed from the first dollar with
no tax free threshold, and a lot of them are over-withheld by an employer who never
registered as a working holiday employer. That money only comes back if you lodge.

It also works out the departing super payment, which for most backpackers is the larger
of the two numbers and the one taxed hardest.

## What it does

- Works out the tax on working holiday income for 2025-26 and 2026-27
- Shows what you already had withheld and what the difference is
- Warns you where nationality changes the answer, which it does for eight treaty
  countries and eleven reciprocal health care countries
- Runs the *Addy* comparison for a resident of a treaty country: it works out the tax
  both as a working holiday maker and as a resident Australian national, shows both, and
  applies the cheaper one, which is what the treaty actually gives you
- Works out what a DASP claim leaves you with after tax, at the working holiday rate
  where it applies and the ordinary temporary resident rates where it does not
- Prints every figure with the ATO page it came from and the date that page was checked
- Speaks English and Korean

## What it does not do

- It does not lodge anything. Lodging goes through myTax, in your own hands.
- It does not assume the resident basis wins. The treaty gives you the lower of two
  assessments, not resident rates, and both are on screen.
- It does not handle income earned outside Australia. That income counts on one side of
  the comparison and not the other, so the tool says so rather than quietly getting it
  wrong.
- It does not estimate a resident's 2026-27 tax until the ATO publishes that year's
  Medicare levy thresholds. Refusing a year is better than guessing at it.
- It does not model deduction rules it has not read. From 2026-27 the 300 dollar
  no-receipts allowance is repealed and a 1,000 dollar standard deduction replaces it for
  residents only, so the two years behave differently on purpose.
- It does not decide the DASP rate off the visa alone. Holding a 417 or 462 is only
  half the test; the payment also has to contain super contributed while it was held,
  and if it does the higher rate applies to the whole payment.
- It is not a tax agent service and nothing in it is tax advice. It applies published
  rates to numbers you typed. Check them, and if you need advice you can rely on, ask a
  registered tax agent. See [docs/legal.md](docs/legal.md).

## Run it

```
pnpm install
pnpm build
npx http-server . -p 8080     # or any static server
```

Then open `/web/index.html`. There is no backend and nothing to configure. What you
type stays in the tab.

## How the rules are stored

Every regulatory number lives in `packs/<pack>/rules/*.json`, and none of them ship
without provenance:

```json
"noTfnWithholdingRate": {
  "value": 0.45,
  "from": "2024-07-01",
  "source": "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
  "checked": "2026-08-18",
  "note": "45 per cent, not 47. The published 47 per cent applies to a resident payee; Schedule 15 sets a flat 45 per cent for working holiday makers with no residency test. The rate itself is long standing, but this URL is overwritten each 1 July and now serves the version effective 1 July 2026, so the start date recorded here rests on an archived copy of the previous version rather than on the live page."
}
```

`scripts/check.mjs` rejects any rule missing `value`, `from`, `source` or `checked`,
rejects regulatory data parked outside the `rules` key, and the test suite asserts that each band table's base amounts agree with the table below
them, which is how a mistyped rate gets caught before anyone sees a wrong number.

Where a page publishes no effective date, `from` records the day the value was first
read, and the rule's note says so.

Australian tax rates change on 1 July. Re-check the sources before then; a monthly CI
job starts failing when the recorded check dates fall behind the most recent 1 July.

## Adding a language

Copy `packs/au-whm-tax/i18n/en.json`, translate the values, keep the keys, then register
the locale in `web/index.html` (the `dicts` map and a button). The tests pick up every
file in `i18n/` and fail if a key is missing or empty. Tax wording is easy to get wrong
in translation, so keep the source link visible next to anything you translate.

## Adding a pack

A pack is an interview (`interview.ts`), one or more calculations (`calculate.ts`,
`dasp.ts`), rule data with sources (`rules/*.json`) and strings (`i18n/*.json`). The
engine in `src/` is a question evaluator and a band-table calculator; nothing in it is
specific to Australia.

## License

MIT.
