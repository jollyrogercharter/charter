# Get Involved

**How can I help test this?** Jolly Roger is an unfinished idea. The economic model hasn't been tested yet, and [the pilot](../STEWARDSHIP-PILOT.md) hasn't started: there's no steward, no application chosen and no customers. That makes it a good time to join, because what you say can still change the plan.

Pick whichever of the three paths fits you. Taking part costs nothing and doesn't commit you to anything, and you don't need to agree with the manifesto.

## 1. I want to become a steward

*I'm interested in earning income by maintaining and supporting freely available software.*

A steward hosts, updates, secures and supports a free application for paying customers, and makes leaving easy. The pilot needs one steward for about three months of service. [What the pilot asks of a steward](../STEWARDSHIP-PILOT.md#for-a-prospective-steward) spells out the work, what's measured and what's uncertain. No income is promised.

**Say so:** [start a discussion](https://github.com/jollyrogercharter/charter/discussions/new?category=general) titled "Steward interest". Tell us what software you'd look after, who for, and what would make it worth your time.

## 2. I might pay a steward

*I use or manage software and would consider paying someone to operate, secure, update and support it.*

The pilot needs five to ten small organizations willing to pay a published monthly price for a free application to be looked after for them, with the freedom to leave at any time. [What a pilot customer gets](../STEWARDSHIP-PILOT.md#for-a-prospective-customer) covers what's included, what's promised in writing and what isn't known yet.

**Say so:** [start a discussion](https://github.com/jollyrogercharter/charter/discussions/new?category=general) titled "Customer interest". Tell us what kind of software you'd want looked after and roughly what that's worth to you. Telling us is not a commitment to pay.

## 3. I want to challenge the idea

*I have questions, criticisms or practical experience that could improve the proposed economic model.*

Criticism is the most useful thing you can offer right now, especially from people who have run a hosting business, done open-source maintenance for a living or bought managed services. Some questions we can't answer yet are in [the Open Stewardship Economy](../STEWARDSHIP-ECONOMY.md#what-we-dont-know-yet) and [the RFC](../launch/RFC-STEWARDSHIP-ECONOMY.md#8-public-criticism-to-invite).

**Say so:** open a [What Would Make This Fail?](https://github.com/jollyrogercharter/charter/issues/new?template=what-would-make-this-fail.md) issue, propose a specific change with a [Charter RFC](https://github.com/jollyrogercharter/charter/issues/new?template=charter-rfc.md), or [start a discussion](https://github.com/jollyrogercharter/charter/discussions/new?category=ideas).

## Test this repository

Nobody outside the project has reproduced it yet, and no independent person has reviewed its security. Both are open invitations, not things that have happened. If you're a developer, [the Challenge](THE-CHALLENGE.md) asks you to rebuild and take over this project using only public instructions. An independent reviewer should check that:

- `npm ci && npm test` passes on a clean machine, from [`DEPLOYMENT.md`](../DEPLOYMENT.md) alone;
- the built `_site/` deploys to a static host you control and matches https://jollyrogercharter.org;
- the [cost ledger](../launch/costs.json), [status file](../launch/status.json) and [open dependencies](../OPEN-DEPENDENCIES.md) can be found and understood without asking anyone;
- `jrc` and `qm` behave as documented and never fetch URLs or run commands taken from a manifest;
- nothing in the repository or the built site exposes secrets or personal data.

Report what you find with a [reproduction report](https://github.com/jollyrogercharter/charter/issues/new?template=reproduction-challenge.md). Partial results and failures count.

## Security problems

Don't report security problems in public. [`SECURITY.md`](../SECURITY.md) explains how to report one privately.

## Before you post

Discussions and issues are public and need a GitHub account. Share only what you're happy for anyone to read. Don't post email addresses, phone numbers, customer details or anything else private. There is no private channel for expressing interest yet.
