# Independently Verify a Published Founding Record

**Status:** no reviewed public transcript of the founding conversation exists, so the transcript steps below are instructions only. The launch digest list *does* have a complete OpenTimestamps proof (`provenance/launch-digests.sha256.ots`), verified by the project against public explorers; see the last section. Never use these commands to imply an attestation that hasn't happened.

## Verify the exact public file

Once Claude has published an approved `conversation/FOUNDING-SESSION.md` and its real SHA-256 digest:

```bash
sha256sum conversation/FOUNDING-SESSION.md
# Compare output to the SHA-256 in the accompanying release manifest.
```

For macOS (which commonly has `shasum`):

```bash
shasum -a 256 conversation/FOUNDING-SESSION.md
```

The checked bytes must match the version described by the release manifest, commit and timestamp proof. Git history alone is mutable and does not prove a conversation was authentic or original.

## Verify the OpenTimestamps proof

Install the official OpenTimestamps client in a reproducible/pinned environment after checking the current official instructions. Then, with an actual proof issued for the exact public file:

```bash
ots info conversation/FOUNDING-SESSION.md.ots
ots upgrade conversation/FOUNDING-SESSION.md.ots
ots verify conversation/FOUNDING-SESSION.md.ots
```

An initial proof can be pending while an attestation becomes available. **Pending is not a Bitcoin-verified timestamp.** Verify the resulting proof independently; for maximal trust independence, use your own validating Bitcoin node. The timestamp establishes existence no later than the proven block timestamp, not when the dialogue originally occurred or who invented the ideas.

To issue an initial proof, after the source has been human-approved:

```bash
ots stamp conversation/FOUNDING-SESSION.md
```

Do not edit the file and reuse its prior proof; timestamp a new immutable revision instead.

## Source and authorship checks

- Review `conversation/EDITORIAL-NOTES.md` and redactions; check whether the public edition is marked verbatim-with-redactions or editorial summary.
- Follow any authorized `chatgpt.com/share/...` snapshot link. Understand it can later be updated or removed.
- Check the Git commit/tag and independent timestamps of the exact file bytes.
- Review the contributor and AI-run logs separately; model identity and human authorship rely on available records and attestations, not on SHA-256 alone.
- Do not interpret any record as a legal originality certificate, an OpenAI signature, or evidence that prior independent conceptions didn't exist.

## No Bitcoin node? Check against two public explorers

`ots verify` needs a local Bitcoin Core node. Without one, `provenance/check-ots.py` (run with the Python that has the `opentimestamps` package, for example the one inside a pipx-installed `opentimestamps-client`) checks the proof's commitments against block headers fetched from blockstream.info and mempool.space:

```bash
python provenance/check-ots.py provenance/launch-digests.sha256 provenance/launch-digests.sha256.ots
```

This is weaker than your own node: you trust that the two explorers report the real chain. It's how the founding digest list was verified on 2026-10-18 (see `launch-manifest.json`).

Source: https://github.com/opentimestamps/opentimestamps-client
