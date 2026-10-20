# Stewardship Pilot

**Can someone earn a living from software without making anyone dependent on them?**

**Status: proposed, not started.** There are no pilot customers, no revenue and no results yet. Seven decisions, [listed below](#decisions-before-starting), need the founder before anything begins. None has been made.

## The idea

One steward offers paid stewardship of one real, free, self-hostable application to five to ten real customers for about three months of service, inside an 18-week plan. We measure whether they pay, what they value, how much of the steward's time it takes, whether they could leave at any moment, and whether they get time back. We publish the results whether the idea works or not.

This is a small experiment, not a platform. It could start within weeks of those decisions being made, using a spreadsheet and existing tools, with no new software required.

## Choosing the application

Pick software that already exists rather than building something new. It should:

- be released under genuinely free terms, such as an OSI-approved licence or a public-domain dedication;
- run on ordinary hosting, with documented setup, so self-hosting is realistic;
- export its data in an open format;
- be useful to small organizations that would rather not run it themselves, such as website analytics, forms and surveys, a team wiki or a booking calendar.

The upstream project should be told about the pilot. Its name must not be used in a way that suggests endorsement.

## The offer

- **One published price**, fixed before recruiting starts, with no discounts that depend on staying.
- **Included:** hosting, updates, backups, monitoring, support with a stated response time, and a short monthly report of incidents handled and the time customers say they spent on the covered tasks.
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

## For a prospective steward

**What it involves.** About three months of looking after one free application for five to ten paying customers: hosting, updates, backups, monitoring and support at a published price. You'd keep a daily time log, run two data-export drills, and agree to have the results published whether or not they're flattering.

**What you get.** The revenue from your customers, minus your costs, and evidence about whether this kind of work can be a living. Income is not guaranteed and may be small: five to ten customers at an unknown price is a test, not a business.

**What's uncertain.** Whether anyone will pay, how much of your time it takes, and how you'd handle tax, contracts and liability where you live. Those are yours to arrange.

**Interested?** See [Get Involved](community/GET-INVOLVED.md#1-i-want-to-become-a-steward).

## For a prospective customer

**What it involves.** Paying a published monthly price for one free application to be run for you, and answering a few short questions at the start, monthly and at the end.

**What you get.** Hosting, updates, backups, monitoring and support with a stated response time. In writing, you can cancel at any time with no exit fee, get a full export of your data on request, and get a deployment guide that would let you or another steward take over.

**What's not promised.** The pilot can't guarantee uptime beyond what the agreement states, security beyond ordinary good practice, or that you'll save time. Measuring that is the point. The service could also end after the pilot. If it does, you keep your data and the guide.

**Interested?** See [Get Involved](community/GET-INVOLVED.md#2-i-might-pay-a-steward). Saying you're interested is not a commitment to pay.

## Decisions before starting

The founder makes each of these and publishes it here before recruiting begins. Nothing below has been decided.

| Decision | What to settle | Decided |
|---|---|---|
| Application | Which existing free application, chosen against the criteria above, and whether its upstream has been told | No |
| Steward | Who does the work, and how a founder acting as steward handles the conflict of interest | No |
| Target customers | What kind of organization, how they'll be found, and how friends and free trials are kept separate | No |
| Pricing | One published monthly price, plus any setup fee | No |
| Success criteria | Final thresholds, starting from the proposal above, including the revenue-per-steward-hour target | No |
| Upstream revenue sharing | Whether any revenue goes upstream, how much, and how it's reported | No |
| Independent reviewer | Who outside the project reviews the results before they're called a finding | No |
