# Proof of Origin and Development History — Proposal for JRCv1

> **Update 2026-10-18:** digests of the founding package are published and an OpenTimestamps proof of them is pending; see [`launch-manifest.json`](launch-manifest.json). The paragraph below is the original 2026-10-17 status, kept as written.

**Status: proposed open specification; no ChatGPT export has been received, no public founding transcript has been reviewed, and no external timestamp has been issued or verified.** This folder contains instructions and templates, not evidence of past certification.

## Why this exists

The Jolly Roger Charter prizes transparent human/AI co-creation, including errors, prompts, decisions and the ability to reproduce the project. Rather than claiming copyright priority, we want **independently inspectable provenance** of what people and agents publicly documented, when those particular bytes were committed to an external timestamp, and how the work evolved.

**We are preserving the history of creation, not claiming ownership of ideas.**

## Distinguish three separate claims

1. **File integrity:** SHA-256 lets a third party check whether a public file's bytes have changed since a published digest. It cannot authenticate a statement or its author.
2. **Independent existence-by-time evidence:** a successfully completed OpenTimestamps Bitcoin-backed proof establishes that the committed file/hash existed **no later than** an independently attested time. It does **not** retroactively prove the claimed dates of the earlier conversation, authorship, or priority over others. A *pending* `.ots` proof is not yet completed Bitcoin attestation.
3. **Contextual provenance and authorship:** OpenAI-hosted shared conversation snapshots, source export metadata, Git commits, signed releases, human/AI contributor logs, and review records can corroborate a narrative but don't automatically prove originality or that OpenAI endorsed/certified it. A ChatGPT shared link can be updated or removed and is not an immutable proof.

Avoid slogans like "cryptographically proven we invented it first" or "OpenAI-verified conversation." Say: **"This public edition was extracted from a reviewed ChatGPT account export, linked to the available hosted snapshot, and its exact published bytes were independently timestamped on [verified date]."** Only say this once every named step is verified and documented.

## Source capture: exact founding conversation, not an editorial reconstruction

**Human-controlled prerequisite:** use ChatGPT **Settings → Data controls → Export** or the OpenAI privacy export flow. The export is an account-wide, sensitive input; it must never be sent wholesale to a public Git repository, website, AI coding-agent chat, or unauthorized external service. If the human shares it with Claude, use an explicitly approved, protected local workspace and extract *only this conversation*. Avoid committing the raw account export, including in any branch or Git history.

A share link (`https://chatgpt.com/share/...`) may supply corroborating viewable context, but the human must review the entire visible snapshot and any included assets before creating it. For personal accounts, it is a snapshot at creation/update time, not a continually expanding immutable archive. If new turns occur, capture and review the new revision explicitly.

Required extraction rules:

- Preserve message order, user vs assistant roles, exact visible message text, available timestamps, and distinguish rendered content from attachments/tools.
- Never fabricate unavailable timestamps, message IDs, source API data, tool logs, hidden instructions, private reasoning, or missing attachments.
- Document extraction script/version, source format, selection method, known gaps, time zones and any inaccessible content.
- Produce a **private source extract** and a separately reviewed **public edition** with explicit human-approved `[REDACTED: category]` placeholders.
- Human reviews the exact public transcript **and** its attached files / hyperlinks. Publish only after explicit approval.
- Maintain a redaction log listing category, reason, reviewer and date, not the withheld secret. A redacted public transcript is "verbatim public edition with documented redactions," **not** "uncut original."
- Preserve a private, access-controlled copy of the source extract where legally and operationally appropriate; include deletion/retention and backup instructions. Never hash private low-entropy secrets into public disclosures.

See [`../transparency/CONVERSATION-PUBLICATION.md`](../transparency/CONVERSATION-PUBLICATION.md) for publication policy.

## Evidence generation: after human approval of exact public bytes

For `conversation/FOUNDING-SESSION.md` (illustrative destination, **do not create or publish without reviewed source**):

1. Freeze the bytes to be released. Refrain from reformatting them after calculating the digest.
2. Compute its SHA-256. Record file path, byte count, hash, encoding/normalization choice, human reviewer, source extract reference, redaction status and exact Git commit/tag in a structured evidence manifest.
3. Using the official OpenTimestamps client, `ots stamp conversation/FOUNDING-SESSION.md` to generate a `.ots` proof. **Never declare the timestamp verified until it has completed/been upgraded and independently verified.** Save the pending proof and revisit later.
4. When blockchain attestation becomes available, run `ots upgrade` then `ots verify`; retain the updated `.ots` alongside the exact file and hash. Record the verification time and actual block/attestation information only when obtained. Verification with a locally controlled Bitcoin Core node is preferable for the strongest independence; disclose the verification method.
5. Publish the human-reviewed public file, checksum, portable `.ots` proof, structured evidence metadata, instructions in `VERIFY.md`, Git commit/tag, and any accessible ChatGPT source snapshot. Make all missing items visible as **pending**, not as fake evidence.
6. If the transcript is revised, publish a **new immutable revision** with a new digest and proof; preserve prior public releases where permissible. A shared link may change even when its URL stays the same.
7. If desired, also timestamp the **private source extract's hash** under a documented private custody process, but do not post the private source file or any unreviewed metadata; obtain approval before publishing even its digest. Note that a private proof is only independently auditable by someone authorized to inspect the source bytes.

The current founding archive and prepared launch ZIP can themselves be hashed and timestamped **now**, but doing so proves existence only at the time of that attestation, not the earlier ideation date. It is useful incremental evidence while the original account export is pending.

## Future work: make provenance routine

For every substantial agent-assisted PR, release or major charter amendment, record, to the extent available and safe:

- Task/goal, requesting contributor, authorizing decision, UTC date, model/tool names and exact versions **when known**.
- Sanitized prompts, relevant outputs, implementation diff, reproducible commands, tests, human review, actual deployment/roll-back evidence and costs.
- Source hash, Git commit, relevant release artifact and SHA-256, signed commit or GitHub build attestation **where supported and verified**, and optional OpenTimestamps proof.
- Clearly separated **author assertion**, **platform evidence**, and **independent cryptographic proof**; never merge them into one guaranteed fact.

GitHub artifact attestations (Sigstore-backed) may be suitable for reproducible release binaries, but are not a substitute for reviewing development logs or stamping the founding conversation. Use only if verified as supported by the selected GitHub plan and workflow. Public evidence should be self-contained and independently checkable without a paid account.

## First human actions

1. Export ChatGPT history securely or create a carefully reviewed share snapshot.
2. Tell Claude which exact conversation to extract and approve only the **minimum necessary** local exposure of raw source materials.
3. Explicitly approve or reject the exact public transcript/redaction log and public metadata.
4. Allow Claude to create hash/proof and publish **only the approved public edition**. No false proof issuance.

## Reference specifications

- OpenAI data export: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data
- OpenAI shared conversations: https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq
- OpenTimestamps overview: https://opentimestamps.org/
- Official OpenTimestamps client: https://github.com/opentimestamps/opentimestamps-client
- GitHub artifact attestations: https://docs.github.com/en/actions/concepts/security/artifact-attestations

All product features, public claims, and source instructions here are open to public RFC review and subsequent versioning.
