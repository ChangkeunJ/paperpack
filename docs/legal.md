# Why this is a calculator and not a tax agent service

Australia regulates who may provide tax agent services. This project is built to sit
outside that regime rather than to argue its way around it.

## The rules that matter

`Tax Agent Services Act 2009` s 90-5 defines a tax agent service as one that relates to
ascertaining or advising on liabilities and entitlements under a taxation law, **and**
is provided in circumstances where the recipient can reasonably be expected to rely on
it. Both limbs have to be satisfied. A refund estimator plainly meets the first, so the
second is where the line actually sits.

s 50-5 prohibits providing a tax agent service while unregistered, but only where you
"charge or receive a fee or other reward". s 50-10 prohibits *advertising* a tax agent
service while unregistered, and it has no fee element at all. Being free is a defence to
one of those and not to the other.

The Tax Practitioners Board treats "other reward" broadly. TPB(GS) 45/2023 says it
captures future business, sales or commission, and that giving a service away as a means
of attracting or retaining clients can itself be a reward.

## Where the safe harbour is

TPB(GS) 14/2011, example 5: a provider who writes and sells non-customised accounting
software is not providing a tax agent service, "even if the software includes tax
calculators or lodgement feature", because they are "merely providing a tool which
assists the user to meet their own" requirements.

The same guidance sets out what such a tool has to do: present the data, let the user
review it, let the user verify that it is correct and appropriate, retain evidence of
that verification, and carry a declaration that the provider is not a registered agent.
It also warns that a declaration on its own does not settle whether reliance occurred or
was reasonable. The architecture is the defence; the declaration is a footnote to it.

## What this means for the code

- Nothing is transmitted to the ATO. There is no lodgement path and no credential handling.
- No fee, no donations tied to use, no affiliate links to tax agents, no paid tier.
  `scripts/check.mjs` fails the build if revenue wording appears under `packs/au-whm-tax/`.
- Results are labelled estimates and the sources panel stays hidden until the user
  explicitly acknowledges that they have checked the figures against their own records.
- The declaration appears on the result screen, in this repository, and on anything
  exported.
- Rates live in versioned data with an effective date and a source URL, so "the tool
  applied published rates" is a checkable statement rather than a claim.
- Issues and discussions get general answers only. Questions about an individual's
  circumstances get pointed at a registered tax agent, because answering them is the
  thing that turns a tool into a service.

If this project ever acquires a revenue path, every line above has to be re-examined
from s 50-5(1)(c) onward before it ships.

## Sources

- Tax Agent Services Act 2009: https://www.legislation.gov.au/C2009A00013/latest
- TPB(GS) 44/2023, what is a tax agent service: https://www.tpb.gov.au/tpb-gs-44-2023-what-is-tax-agent-service
- TPB(GS) 45/2023, what is a fee or other reward: https://www.tpb.gov.au/tpb-gs-45-2023-what-is-fee-or-other-reward
- TPB(GS) 14/2011, digital service providers: https://www.tpb.gov.au/software-providers-and-tax-agent-services-act-2009-tpb-information-sheet-tpbi-092011
