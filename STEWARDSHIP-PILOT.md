# Stewardship Pilot

**Can someone earn a living from software without making anyone dependent on them?**

**Status: proposed, not started.** There are no pilot customers, no revenue and no results yet. Six decisions listed at the end need a human before anything begins.

## The idea

One steward offers paid stewardship of one real, free, self-hostable application to five to ten real customers for about three months of service, inside an 18-week plan. We measure whether they pay, what they value, how much of the steward's time it takes, whether they could leave at any moment, and whether they get time back. We publish the results whether the idea works or not.

This is a small experiment, not a platform. It could start within weeks of the six decisions below being made, using a spreadsheet and existing tools, with no new software required.

## Choosing the application

Pick software that already exists rather than building something new. It should:

- be released under genuinely free terms, such as an OSI-approved licence or a public-domain dedication;
- run on ordinary hosting, with documented setup, so self-hosting is realistic;
- export its data in an open format;
- be useful to small organizations that would rather not run it themselves, such as website analytics, forms and surveys, a team wiki or a booking calendar.

The upstream project should be told about the pilot. Its name must not be used in a way that suggests endorsement.

## The offer

- **One published price**, fixed before recruiting starts, with no discounts that depend on staying.
- **Included:** hosting, updates, backups, monitoring, support with a stated response time, and a short monthly report of incidents handled and time saved.
- **Freedom promises, written into the agreement:** cancel any time with no exit fee; a full data export on request within a stated number of days; a written deployment guide good enough for the customer or another steward to take over.
- **Ordinary payment** through a normal payment processor. Nothing about the pilot requires cryptocurrency.

## What we measure

| Question | Measure | How it's collected |
|---|---|---|
| Will people pay voluntarily? | Customers offered, customers paying, still paying at day 90, reasons for leaving | Sign-up records; a short exit conversation |
| What do they value? | Services ranked by importance; which they'd pay for on their own | Intake and day-90 questionnaires |
| Can AI make the steward efficient? | Steward hours per customer per month; which tasks were AI-assisted; incidents | The steward's daily time log, labeled self-reported |
| Do customers stay free to leave? | Every customer receives a full export; one independent person tries to restore the service from the guide alone, and how long it takes | Drill records, using the [Challenge log template](community/THE-CHALLENGE.md) |
| Do users get time back? | Customer-reported minutes per month on the covered tasks, before and during | Intake baseline plus a monthly three-question check-in |
| Is it sustainable? | Revenue minus direct costs, per steward hour (a measure of workload, not a billing method); projected yearly income at the observed workload | A [Quartermaster ledger](spec/quartermaster/QM-LEDGER.md), with steward pay as one line |

## Deciding whether it worked

Before recruiting, publish the thresholds that would count as support for the idea, so they can't be moved afterwards. A starting proposal, for a human to adjust:

- at least half the customers who start are still paying at day 90;
- revenue per steward hour meets a target set and published in advance;
- every export succeeds, and the independent restore works from the guide alone;
- most customers report spending less time on the covered tasks than before.

Meeting them would be a promising signal from a tiny sample, not proof. Missing them would be published just as plainly, with what we learned.

## Honest evidence

- Report aggregates. Customers stay anonymous unless they agree in writing to be named.
- No testimonials or endorsements without written permission.
- Label every figure by where it came from: measured, self-reported or estimated.
- Count friends, family and free trials separately from paying customers.
- Keep customer data out of this repository. Results, not records, are published.
- Ask someone outside the project to review the results before they are called a finding.

## Using what exists, building nothing new

The pilot can use the [Quartermaster ledger format](spec/quartermaster/QM-LEDGER.md) for revenue and costs, [`jrc`](spec/JRC-MANIFEST.md) to describe the application's freedoms, and the [Challenge](community/THE-CHALLENGE.md) for the takeover drill. It does not need billing integrations, new protocols or a hosted platform.

## Timeline

| Weeks | Step |
|---|---|
| 0–2 | Choose the application, set price and thresholds, write the agreement, publish this plan with those decisions filled in |
| 2–4 | Recruit customers honestly; record a time baseline for each |
| 4–16 | Run the service; monthly check-ins; first export drill at the midpoint |
| 16–18 | Final questionnaire, independent takeover drill, publish results |

## Risks

- **Conflict of interest.** If a founder is the steward, they want it to work. Pre-published thresholds and an outside reviewer limit that.
- **Customer data.** Real data needs real care: a privacy notice, backups, access control and a plan for incidents.
- **Too small to generalize.** Five to ten customers can show whether the idea is worth pursuing, not that it works everywhere.
- **Upstream fairness.** Earning from someone else's free software is allowed, but the steward should consider sharing revenue upstream and say whether they do.
- **Legal and tax.** The steward needs whatever registration, contract terms and tax handling apply where they work.

## Decisions a human must make before starting

1. Who the steward is.
2. Which application.
3. The price.
4. The success thresholds.
5. Whether, and how much, revenue goes upstream.
6. Who reviews the results independently.
