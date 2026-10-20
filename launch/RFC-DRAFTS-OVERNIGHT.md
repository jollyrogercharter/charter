# Overnight RFC and Discussion Drafts

> **Superseded 2026-10-20 (historical record).** Written before the 2026-10-19 reorientation and the retirement of the founding-provenance work: its OpenTimestamps and provenance references describe files that no longer exist. For a first announcement, use [`SHARE-READINESS.md`](SHARE-READINESS.md) and [`DISCUSSION-DRAFTS.md`](DISCUSSION-DRAFTS.md).

**Drafts for human approval. Nothing here has been posted.** Prepared by Claude on 2026-10-18 under Priority C of the overnight handoff. Each draft is paste-ready for a GitHub Discussion, but a human must read it, edit it and post it from their own account.

GitHub Discussions is enabled at https://github.com/jollyrogercharter/charter/discussions, but the charter-specific categories proposed in [`RFC-SEEDS.md`](RFC-SEEDS.md) (Section A) do not exist yet. Until they do, post under the closest available category and move the thread later. Suggested homes: draft 1 in "What Would Make This Fail?", draft 2 in "Open Economics", draft 3 in "AT Protocol and Data Rights".

Facts every draft may rely on, all from this repository:

- `jrc` is at **0.1 draft**. The schema and CLI may change through public RFCs.
- The charter repository's own self-assessment (`jrc.json`, live at https://jollyrogercharter.org/check/) reports **1 of 5 applicable pillars evidenced** (development), **3 partial** (code and rights, operations, economics), **governance exploring**, and **data not-applicable** because the site is static and holds no user records.
- That self-assessment was written by the AI agent that built most of the repository. **No independent reproduction exists.** The OpenTimestamps proof for the launch digests is **pending**.
- JRCv1 is a draft conformance charter. It is not a licence, a certification or an OSI-approved anything.

---

## Draft 1: What Would Make This Fail?

**Suggested category:** What Would Make This Fail?
**Builds on:** [RFC-SEEDS.md](RFC-SEEDS.md) (the "What Would Make This Fail?" category and RFC 1, "conformance standard, a licence, or something else?"). This draft does not repeat those; it asks a narrower question now that a tool exists.

### Title

What Would Make This Fail?

### Body (paste from here)

There is now a working, offline tool, so the argument can move from "is this a good idea" to "where does this particular approach break." Please try to break it.

`jrc` is a 0.1 draft CLI. You write a `jrc.json` that says how your project meets six pillars (code and rights, development, user data, operations, economics, governance), cite evidence, and run `jrc check` and `jrc report`. It checks the structure of the manifest and the local files it cites. It never fetches a URL, never runs a command, and cannot tell whether your statements are true. Five-minute quickstart: https://jollyrogercharter.org/check/ . Source: https://github.com/jollyrogercharter/charter .

Where we stand, so nobody has to guess: this repository's own self-assessment shows 1 of 5 applicable pillars evidenced (development), 3 partial, governance exploring, data not-applicable. That assessment was written by the AI agent that built most of the repository, not by an independent party, and nobody unaffiliated has reproduced anything yet. This is a claim to scrutinise, not a result.

**The question:** where does the jrc approach itself fail, as opposed to where this project falls short of it? Concrete failure modes with an example or a test are worth more than general objections. Some prompts to start from:

1. **Self-assessment theatre.** A project can write a tidy `jrc.json`, pass `jrc check` and be no more reproducible than before. What in the manifest or the tool would make that harder, and what would only make it look harder?
2. **Evidence that exists but proves nothing.** A file path passes the check if the file exists. A `LICENSE`, a lockfile or a `DEPLOYMENT.md` can exist and be wrong, stale or unusable. Which evidence kinds are worth requiring, and which are just filenames with a green tick?
3. **Badge misuse.** The badge reads "self-reported" and should link to a report, but nothing stops someone cropping the word out or showing it without the link. Is a neutral, unregistered badge a feature or a liability?
4. **Burden on small maintainers.** Writing and maintaining claims takes time. Does a solo maintainer with a weekend project end up doing paperwork instead of the thing the charter is about, and does a heavier manifest quietly favour well-funded projects?
5. **AI-written assessments.** This repository's own `jrc.json` was authored by an AI agent. Is an AI-written self-assessment worth anything, or does it just produce plausible-sounding gaps? What disclosure would make it credible, and what check could a reader run to see through it?
6. **The reviewer problem.** `jrc` records "independently reproduced" only with a named reviewer, a date and a report URL, and cannot confirm the reviewer is independent. How would a reader, or a future version, detect a reviewer who is a friend, a sock puppet or the same person?
7. **Wrong target.** Is "could your software survive without you?" the right test at all? What kinds of projects would pass it and still be unfree in practice, and what kinds would fail it while being perfectly good citizens?

You don't need to answer all of them, and you can add your own. If you think the whole approach is mistaken, say what you would do instead.

**What would change things:** a reproducible example of a bad manifest that `jrc check` accepts, a good-faith project that cannot honestly describe itself in the format, or a clearer alternative. We will turn confirmed failures into issues, fixtures in the test suite, or changes to the draft spec, and record disagreements we don't resolve.

### Options

This one is an open invitation rather than a choice among options. The responses it can lead to:

- **Tighten the tool:** add checks, fixtures or warnings that catch a failure mode (for example, flag stale evidence or evidence that is only a filename).
- **Tighten the spec:** require or discourage particular evidence kinds in `spec/JRC-MANIFEST.md`.
- **Tighten the framing:** change the wording on the site, the badge or the report so a misleading reading is harder.
- **Narrow the claim:** accept that `jrc` is a structured way to publish claims and invite scrutiny, and say so more plainly.
- **Abandon or replace the approach:** if the failure is fundamental.

### Motivation

An assessment tool that has only been praised is untested. The charter's own premise is that claims should be checkable by strangers, which includes claims about the charter. The tool now exists, so critique can be specific. The draft also has a built-in conflict of interest: the repository, its tests and its self-assessment were all produced by the same AI agent under one human's direction, which is exactly the situation where blind spots are most likely.

### Strongest argument against

The strongest argument against asking this question is that it asks for effort from strangers on a project with no track record, and that a self-reported format is intrinsically weak: if the only thing a manifest can establish is that someone wrote claims down, the whole exercise adds paperwork without adding trust. A fair reading is that the real value lies only in independent reproduction, and that `jrc` should say so loudly and stop short of anything resembling a scorecard. We do not have evidence yet that this reading is wrong.

### What would change the spec or jrc

- Confirmed failure modes become test fixtures (`misleading` and `partial` cases) and, where a check can catch them offline, new `E-` or warning codes in `jrc check`.
- Evidence-kind requirements in `spec/JRC-MANIFEST.md` may be tightened or relaxed.
- Wording on /check/, /adopt/ and the badge may change.
- Arguments that the approach is unsound go into `DECISIONS-AND-QUESTIONS.md` as recorded dissent, even if we don't change course.

### Decision status

**Open.** No decision has been made, and none will be recorded until a human maintainer has read the discussion.

---

## Draft 2: RFC: What is an hour of human attention worth?

**Suggested category:** Open Economics
**Builds on:** [RFC 5 in RFC-SEEDS.md](RFC-SEEDS.md) ("Human Attention Accounting without a compulsory universal dollar rate") and [`standard/HUMAN-ATTENTION.md`](../standard/HUMAN-ATTENTION.md). This draft frames the choice for a public thread and adds the `jrc.json` angle; the principles and the v0 calculation are in those documents and are not repeated here.

### Title

RFC: What is an hour of human attention worth?

### Body (paste from here)

The charter says human attention is a real cost even when nobody sends an invoice, and that a cloud-bill saving is not progress if it moves the burden onto volunteers or users. [`standard/HUMAN-ATTENTION.md`](https://github.com/jollyrogercharter/charter/blob/main/standard/HUMAN-ATTENTION.md) proposes a way to show that. It does **not** propose a number. This RFC asks how, or whether, a number should ever appear.

**A stated principle, not an open question: there is no universal rate.** Nothing here proposes one price for an hour of anyone's attention, and a lower local wage must never be read as lower worth. The open question is only how a project shows attention in its economics, not what a person is worth.

**Options**

1. **No rate.** Report attention in hours only (stewardship hours, user-task hours), never in money. Readers multiply by their own rate if they want to. Simplest, hardest to game with a dollar figure, hardest to compare with cash.
2. **Locally sourced reference rate with ranges.** Each project declares a rate (or a low/central/high range) with source, currency, year, geography and uncertainty, plus the method for choosing it. A different reader can substitute their own. Comparable inside a project, not between projects.
3. **Scenario bands.** Publish the same hours under several named scenarios side by side (for example a living-wage baseline, actual compensation where paid, a cost-of-living-sensitive reference, an opportunity-cost band) and show the spread rather than a point. The charter would maintain a versioned, voluntary reference table with named stewards and recorded dissent.
4. **Time-only, no money.** Like option 1, but also forbid any monetary conversion in conformance claims, on the argument that a dollar figure invites the pressure the standard is meant to prevent.

**How it would appear in a `jrc.json` economics pillar.** The current 0.1 schema has no attention-specific field and this RFC does not add one. An economics claim can already point at an evidence file. For example, an attention ledger kept as a file in the repository:

```json
{
  "id": "attention-disclosed",
  "statement": "Unpaid stewardship attention is reported in hours per month, with no monetary rate applied. Estimates are by the maintainers and unaudited.",
  "evidence": [
    { "kind": "file", "path": "economics/attention-ledger.csv" }
  ],
  "verification": { "level": "self-reported" }
}
```

Under option 2 or 3 the same claim would cite a file that records the rate, its source and its range. The open schema question is whether `jrc` should keep attention as free-form evidence like this (nothing in the tool understands it), or add an optional structured block so reports can show hours, rate basis and uncertainty. Today `jrc check` would only verify that the cited file exists. It would not verify the hours or the rate.

**Strongest objection:** putting a price on attention may do harm even when well meant. It can commodify volunteer time, invite inflated hours and inflated "savings," and give organisations a tidy reason to treat unmeasured people as free. Any reference table will be contested and takes governance effort a small project may not be able to sustain. Hours-only reporting avoids that at the cost of being hard to weigh against cash, which is the comparison the standard wants people to make.

**Proposed experiment:** take one real, small pull request. Ask several reviewers to estimate the stewardship hours it took, apply two or three candidate rate scenarios, and publish the spread together with how far the reviewers disagreed on hours. Separately, take a cost-saving change that shifts effort onto users and compare what each option (1 to 4) would have shown about it. Invite economists, accessibility specialists and maintainers to say what the numbers hid. No real personal data and no telemetry are involved.

**What we would like from you:** which option, and why; a case where a dollar figure would mislead; and a case where hours alone would. Disagreement is welcome and will be recorded.

### Options

See the four options in the body. They are repeated here as the decision menu.

| Option | What a `jrc.json` reports | Main strength | Main weakness |
|---|---|---|---|
| 1. No rate | Hours only | Hard to weaponise | Hard to compare with cash |
| 2. Local reference rate with ranges | Hours, rate, source, range | Honest about uncertainty | Rates differ between projects; effort to defend each |
| 3. Scenario bands | Hours under several named scenarios | Shows the spread, resists a single number | Needs a stewarded reference table |
| 4. Time-only, no money | Hours only, money prohibited | Strongest guard against pressure on volunteers | Same comparison problem as 1, enforced |

### Motivation

The standard's economic pillar currently asks projects to disclose costs. Without a position on attention, a project can show a low cash bill while pushing hours onto maintainers or users and still look frugal. But any fix involves a number or a refusal to give one, and both have costs. The draft in `standard/HUMAN-ATTENTION.md` explicitly leaves rate-setting open, so this RFC is where it gets argued in public. The repository's own economics pillar is `partial`, and its self-assessment records that human attention has not been measured and no method has been adopted.

### Strongest argument against

Argued above under "Strongest objection": monetising attention can do more harm than good, and a rate-setting process is itself a drain on the attention it tries to account for. If the process cannot be run cheaply and fairly, option 1 or 4 is the honest choice, and the charter would be better to say "we count hours" and stop.

### What would change the spec or jrc

- `standard/HUMAN-ATTENTION.md`: the v0 calculation and the `attention_cost` record (where `rate` is currently shown as optional in the example) would be adjusted to match the chosen option.
- `spec/JRC-MANIFEST.md` and the schema: possibly an optional structured attention block, or an explicit note that attention stays free-form evidence in 0.1.
- `jrc check`: possibly a warning when a monetary figure is given without a source, geography and year, or an error under option 4.
- The Quartermaster cost schema, which is a separate piece of work and is not claimed to exist yet.
- If no option wins, the standard keeps requiring only disclosure and methodology, which is where it stands today.

### Decision status

**Open.** No rate or method is adopted. Requires a human maintainer's approval before any outcome is recorded.

---

## Draft 3: RFC: When is data sovereignty meaningfully proven?

**Suggested category:** AT Protocol and Data Rights
**Builds on:** [RFC 3 in RFC-SEEDS.md](RFC-SEEDS.md) ("AT Protocol data portability, private records and the limits of Spaces (alpha)") and [`standard/DATA-SOVEREIGNTY.md`](../standard/DATA-SOVEREIGNTY.md). RFC 3 asks which mechanism the standard should rely on. This draft asks a different question: what evidence would show that data sovereignty works, whatever the mechanism. It also answers an open question in `spec/JRC-MANIFEST.md`.

### Title

RFC: When is data sovereignty meaningfully proven?

### Body (paste from here)

"The user's data is theirs" is easy to claim. A project can ship an export button and call the pillar done. This RFC asks what a `jrc.json` should have to show before a reader should believe data sovereignty is actually met, and when the pillar legitimately does not apply.

**An evidence ladder.** Each rung is stronger than the one below, and each can be cited as evidence in a manifest. A project can sit on any rung honestly. The question is where `jrc` should draw lines.

1. **An export exists.** A button, endpoint or command that produces the user's data. Evidence: a documented path and a screenshot or command. Proves only that something comes out.
2. **A documented, open format.** The export is in a published format (for example a Lexicon schema, JSON or CSV with a spec), and the docs list which data is *not* included.
3. **A tested round trip.** The project's own tests export dummy data and import it back into the same app with no loss, with the fixtures published.
4. **Checksummed export.** Exports carry checksums, so a user or a third party can check that what came out is intact and that a later copy matches.
5. **Migration to a second implementation.** Dummy data is exported from one provider or app and imported into a different one that the first project does not control, with the steps and results published.
6. **Independent migration with checksums.** Someone unaffiliated performs the migration of dummy data to another provider or app, publishes the method, and verifies checksums before and after. This is the rung `standard/CONFORMANCE.md`'s acceptance test describes ("export a test user's records, migrate them to another provider").

Everything below rung 6 is a self-report. Rung 6 is the first that is not, and even then `jrc` can only record a reviewer's name, date and report URL; it cannot confirm independence.

**What the AT Protocol does and does not give you, as the repository records it.** Per `standard/DATA-SOVEREIGNTY.md`, as of October 17, 2026:

- Default AT Protocol repositories are public and can be replicated, so removal from a primary server cannot promise removal from every copy. Public-repo replication helps portability and works against deletion. A manifest must not promise both.
- Account migration is a design goal and works in important cases, but portability of *all app data* and operational recovery are not automatic.
- Permissioned (non-public) data, Atproto Spaces, was **alpha** as of August 20, 2026 and still under development in October. Existence of Spaces is not evidence of production-grade private-data security, and a manifest should not say otherwise.
- Encryption, key management, access control, recovery and legal data-subject requests need engineering beyond the protocol.

**When "not-applicable" is legitimate.** The spec already lets a pillar be `not-applicable` if `applicability` says why. The example is this very site. The Jolly Roger Charter site is static: no accounts, forms, cookies or analytics, and no stored user records, so there is nothing to export or migrate, and its self-assessment marks `data` as not-applicable with that reason. That is legitimate because the claim is checkable (look for the absence of accounts and storage). It stops being legitimate the moment the project stores user records, and the note in the file says so. A project that merely *prefers* not to deal with data does not get the same exemption.

**Which evidence kinds should `jrc` require?** Today the tool knows three: `file`, `url` and `command`, and it only checks that a file exists (and its hash if given). A data pillar could stay with those, or the spec could add something. Options:

1. **Keep the three kinds; require only disclosure.** A `data` pillar marked `evidenced` must cite a file describing the export and its limits. Anything stronger is a convention, not a rule.
2. **Add a "round-trip fixture" kind** that points at a dummy dataset plus the expected checksums, so `jrc check` can at least verify the fixture's hash offline.
3. **Add a "migration record" kind** for a published report of a migration (source, destination, dummy data, checksums before and after, who did it). `jrc` would record it and require a named reviewer and a report URL before it counts as independent.
4. **Tie the top rung to the existing independent-reproduction rule** rather than a new kind: only `independently-reproduced` verification can support a claim of rung 5 or 6.

The proposal under discussion is a hybrid of 1 and 4: require rung 2 (open format with documented exclusions) before a `data` pillar can read `evidenced`, and treat rungs 5 and 6 as independent-reproduction territory. Nothing is decided.

**Strongest objection:** an evidence ladder turns a user right into a compliance exercise. A project can climb every rung with dummy data and still make real migrations painful, and a ladder rewards ceremony over whether users can leave. Rung 6 also depends on a motivated stranger who may never turn up, so the strongest claim is the one least likely to exist, and a standard whose top rung is empty is not much of a standard. Conversely, setting the bar low lets "export button" pass as sovereignty.

**Proposed experiment:** build a throwaway test application with dummy users, export their records with checksums, import them into a second implementation, and publish every step that failed. Separately, ask an unaffiliated reviewer to repeat the migration from the published instructions alone, then compare their blockers with ours. A threat-model review of a shared record with two participants who disagree about export should accompany it. No real personal data is used.

### Options

| Option | Evidence required | Trade-off |
|---|---|---|
| A. Disclosure only | A file describing export and its limits | Easy; allows "export button" theatre |
| B. Rung 2 minimum, rungs 5 to 6 as independent reproduction | Open format plus documented exclusions; migration only counts independently | Needs reviewers; top rung may stay empty |
| C. New evidence kinds in the schema | Fixtures with checksums, migration records | More to maintain; risks over-specifying before real cases exist |
| D. Capability-based, no mechanism named | Any tested, published export and migration path with honest limits | Protocol-neutral; harder to compare |

### Motivation

Data sovereignty is the charter's most easily over-claimed pillar and, today, the least tested one: no reference application holds user data, so nothing has been exported or migrated. `spec/JRC-MANIFEST.md` lists "how should a project prove that data sovereignty works, beyond 'we have an export button'?" as an open question, and this is where it gets argued. Deciding the evidence standard before the first adopter arrives is cheaper than renegotiating it afterwards.

### Strongest argument against

Argued above: a ladder can reward ceremony, and a strict top rung may never be reached. There is a second argument. Tying the standard to AT Protocol whose permissioned-data story is alpha risks forcing adopters to claim something that is not yet safe. The fallback is option D, which names no mechanism and asks only for a tested, published, honestly limited path.

### What would change the spec or jrc

- `standard/DATA-SOVEREIGNTY.md` and `standard/CONFORMANCE.md`: the evidence ladder (or whichever version survives) would replace the loose wording about "real export and import."
- `spec/JRC-MANIFEST.md` and the JSON Schema: possibly new evidence kinds (options 2 and 3), or none.
- `jrc check`: possibly a rule that a `data` pillar marked `evidenced` must cite an export description, and that `not-applicable` needs a checkable `applicability` reason. It would still never fetch URLs or run commands.
- Fixtures: a `data` partial and a misleading-data case in the test suite.
- RFC 3 (mechanism choice) would be resolved alongside or after this one, not before.

### Decision status

**Open.** No evidence standard is adopted, and no claim of production-grade private-data security is made for any mechanism. Requires a human maintainer's approval before any outcome is recorded.
