# Discussion Drafts (not posted)

Five GitHub Discussions posts, drafted 2026-10-20 for the founder to approve, edit and publish. **None has been posted.** Once a post exists, replace the matching "start a discussion" link in [`community/GET-INVOLVED.md`](../community/GET-INVOLVED.md) with its URL. Until then, the site links only to GitHub's new-discussion form.

All categories are GitHub defaults that already exist. Nothing here commits the project to anything.

---

## 1. Prospective stewards

**Category:** General · **Title:** Pilot: would you steward free software for paying customers?

We're proposing a small, real test of an idea: that someone can earn a living by looking after free software for paying customers, without making anyone dependent on them.

The plan is one steward, one existing free application and five to ten paying customers, for about three months of service. The steward handles hosting, updates, backups, monitoring and support at one published price. Customers can leave at any time with their data. We publish the results whether the idea works or not. The full plan is at https://jollyrogercharter.org/pilot/.

**Nothing has started.** There's no steward, application, price or customer yet. Income isn't guaranteed and may be small.

If you might want to be the steward, or you've done this kind of work before, reply with:

- what software you'd look after, and for whom;
- what would make it worth your time;
- what in the plan looks unrealistic.

Please don't post email addresses, phone numbers or customer details. This thread is public.

---

## 2. Prospective customers

**Category:** General · **Title:** Pilot: would you pay someone to run free software for you?

Plenty of useful software is free to download, but running it well takes time: updates, backups, security and fixing things when they break. We want to find out whether small organizations would pay a steward a monthly price to do that, while keeping the freedom to leave at any time with their data.

The pilot plan is at https://jollyrogercharter.org/pilot/. In short, a customer would get hosting, updates, backups, monitoring and support with a stated response time, plus, in writing, cancellation at any time with no exit fee, a full data export on request, and a guide that would let someone else take over.

**Nothing has started**, and we don't yet know the application or the price. We can't promise you'll save time. Measuring that is part of the point.

If you might be a pilot customer, reply with:

- what kind of software you'd want looked after (analytics, forms, a wiki, bookings, something else);
- roughly what that would be worth to you each month;
- what would stop you signing up.

Replying isn't a commitment to pay. Please keep private details out of this public thread.

---

## 3. Challenge the idea

**Category:** Ideas · **Title:** Where does the stewardship economy break?

Jolly Roger proposes that free software and good incomes can go together. Give the code away, and get paid for operating, securing, updating and supporting it, with no lock-in. https://jollyrogercharter.org/stewardship/ explains the idea. It's a proposal, not a proven model.

We'd rather find the flaws now than after the pilot. Some questions we can't yet answer:

- Will enough people pay when they could run the software themselves for free?
- Will competition between stewards push prices too low to live on?
- Can one person, helped by AI, run reliable service without burning out?
- Is "you can always leave" real for nontechnical customers?
- Is "profit is fine" just extraction with better branding?

If you've run a hosting business, maintained open source for a living or bought managed services, your experience is exactly what we need. Disagreement is welcome.

---

## 4. RFC: rewarded stewardship and JRCv1

**Category:** Ideas · **Title:** RFC: should JRCv1 drop cost recovery and allow steward profit?

The manifesto and charter commitments now say plainly that stewards may profit, including from AI-driven efficiency, and that open books never require publishing personal finances. The detailed JRCv1 draft still says otherwise in places. Until this RFC is decided, JRCv1 is unchanged.

Full text: https://github.com/jollyrogercharter/charter/blob/main/launch/RFC-STEWARDSHIP-ECONOMY.md

**What we're asking you to decide**, in section 4 of the RFC:

1. Replace the pledge to pass efficiencies on as lower prices with a **price-honesty** pledge: publish what's included, how prices are set and where money goes, by category.
2. Allow **steward pay as one aggregate line**. Transparency never requires personal or household finances.
3. Keep "users can export their data and leave without penalty" normative, but make AT Protocol a **recommended reference** rather than the default.
4. Add a stewardship-economics section to JRCv1's purpose, with **no new conformance requirement** until the pilot produces evidence.

If accepted, these become JRCv1 draft 0.2. Existing `jrc.json` manifests stay valid.

**Please reply** with support, objections or amendments, numbered by item. The strongest objections we know of are in section 8. A founder's proposal is not consensus, and this thread is where that's tested.

---

## 5. Invitation to outside developers

**Category:** General · **Title:** Can you rebuild this project without us?

Nobody outside the project has yet reproduced the Jolly Roger charter repository or reviewed its security. We'd like someone unrelated to try, using only public instructions.

1. Clone https://github.com/jollyrogercharter/charter and run `npm ci && npm test` on a clean machine.
2. Deploy `_site/` to any static host you control, and compare it with https://jollyrogercharter.org.
3. Check that the cost ledger, status, open dependencies and decision log make sense without asking anyone.
4. Try to make `jrc` or `qm` fetch a URL, run a command or claim evidence that isn't there.

What an independent reviewer should check is listed at https://jollyrogercharter.org/get-involved/#test-this-repository. File results with the reproduction-report issue template. Partial results and failures are useful. Report security problems privately, as `SECURITY.md` describes, not in this thread.
