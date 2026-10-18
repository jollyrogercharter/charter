# The JRCv1 Manifest (`jrc.json`), version 0.1 draft

A `jrc.json` file is a project's own account of how it meets the six Jolly Roger Charter pillars, with pointers to evidence anyone can check. It is **not a licence and not a certification**. It is meant to be read critically.

- Schema: [`jrc-0.1.schema.json`](jrc-0.1.schema.json) (JSON Schema 2020-12), served at `https://jollyrogercharter.org/spec/jrc-0.1.schema.json`
- Tool: `jrc` (in this repository, `bin/jrc.mjs`), offline, no dependencies, CC0
- Status: **0.1 draft**. Fields may change through public RFCs. Breaking changes bump the `jrc` version string.

## Shape

```json
{
  "$schema": "https://jollyrogercharter.org/spec/jrc-0.1.schema.json",
  "jrc": "0.1",
  "project": { "name": "…", "repository": "https://…", "homepage": "https://…" },
  "assessment": { "kind": "self", "assessor": "name, handle or role", "date": "YYYY-MM-DD", "commit": "abc1234", "method": "…" },
  "pillars": {
    "code_rights":  { "status": "partial", "claims": [ … ], "gaps": [ "…" ] },
    "development":  { … },
    "data":         { "status": "not-applicable", "applicability": "why", "claims": [] },
    "operations":   { … },
    "economics":    { … },
    "governance":   { … }
  },
  "limitations": [ "…" ]
}
```

All six pillars must be present. Use `"status": "not-started"` with an empty `claims` array if you have nothing yet. An honest blank is better than a padded one.

### Pillar `status` (your own judgement)

| Value | Meaning |
|---|---|
| `not-started` | Nothing done yet. |
| `exploring` | Interested, gaps documented; **no conformance claim**. |
| `partial` | Some claims with evidence; known gaps remain. |
| `evidenced` | Every claim has evidence. Still self-reported unless reviewed independently. |
| `not-applicable` | The pillar doesn't apply. **`applicability` must say why.** For example, a static site with no user records can mark `data` not-applicable. |

### Claims and evidence

Each claim has an `id`, a plain-language `statement`, an `evidence` array and a `verification` object.

| Evidence kind | Fields | What `jrc` does |
|---|---|---|
| `file` | `path` (relative to the manifest; must stay inside its directory), optional `sha256` | Checks the file exists and, if `sha256` is given, that it matches. |
| `url` | `url` | Records it. **Never fetches it**: `jrc` works offline. |
| `command` | `command`, optional `expect` | Records it for a reviewer to run. **Never executes it.** |

`verification.level` is `self-reported` or `independently-reproduced`. The second needs a `reviewer` who is not the assessor, a `reviewed` date and a `report` URL. Even then, `jrc` can't confirm the reviewer is independent, so reports say "reported as independently reproduced (review not verified by jrc)".

`candidates` lists files that *might* become evidence (`jrc init` fills it from filenames). Candidates are never counted as evidence.

## What `jrc check` rejects (exit 1)

| Code | Problem |
|---|---|
| `E-SCHEMA` | The manifest doesn't match the schema. |
| `E-PATH` | Evidence path is absolute or resolves outside the project, including via symlinks. |
| `E-MISSING` | Evidence file doesn't exist (or is a broken symlink). |
| `E-WEAK-EVIDENCE` | Evidence is the manifest itself, the whole project directory, or an empty file. |
| `E-UNREADABLE` | A hashed evidence file can't be read. |
| `E-HASH` | `sha256` doesn't match the file. |
| `E-MISLEADING` | Prose (names, statements, notes, gaps, limitations) implies an authority JRCv1 doesn't have: certified, accredited, endorsed, officially, awarded, audited by, guaranteed or fully compliant. Text is Unicode-normalised first. A negation within the three preceding words ("not certified", "no one has certified it") is allowed. Paths, URLs and commands aren't scanned. |
| `E-PRIVACY` | Something that looks like an email address, token, API key, private key, bearer credential, password, home-directory path, or a secret in a URL. `git@host:repo` remotes and CI runner paths are allowed. |
| `E-CONTROL` | Control, zero-width or bidirectional-override characters anywhere, or line breaks in names, identifiers, paths and URLs. These can hide or forge text in reports and terminals. |
| `E-CONFUSABLE` | A word mixes Latin with Cyrillic or Greek letters. |
| `E-INDEPENDENT` | An independence claim is missing reviewer, date or report, or the reviewer matches the assessor or the project after normalisation. Also raised when an `independent` assessment is made by the project itself. Overlapping names raise warning `W-INDEPENDENT`. |
| `E-EVIDENCED-EMPTY` | A pillar says `evidenced` but a claim has no evidence. |
| `E-NA-REASON` | `not-applicable` without `applicability`. |
| `E-DATE` | Assessment or review date is in the future. |

An incomplete manifest is **valid** (exit 0). Gaps are the point.

`jrc report` refuses to write anything while `E-PRIVACY` or `E-CONTROL` errors remain, so a leak is never published by accident. A pillar counts as evidenced only when its status is `evidenced` **and** every claim's evidence passed. The summary also says how many evidenced pillars are backed by local files, because URLs and commands aren't checked.

Known limits: `jrc` can't detect hard links to files outside the project, can't tell whether a named reviewer is really independent, and catches only common homoglyph tricks.

## Reports

`jrc report` produces three files from the manifest alone. They're byte-identical on every run, with no clock and no network:

- `jrc-report.json`: machine-readable; pillar levels, evidence results, findings, the manifest's SHA-256.
- `JRC-REPORT.md`: human-readable.
- `jrc-badge.svg`: an optional neutral badge reading, for example, "JRCv1 draft | 3/5 self-reported". Link it to your published report. There is no central registry, login or fee, and no approval is needed.

## Open questions (RFC welcome)

- Should evidence carry signatures or attestations (Sigstore, OpenTimestamps) as a first-class kind?
- How should a project prove that data sovereignty works, beyond "we have an export button"? See `launch/RFC-DRAFTS-OVERNIGHT.md`.
- Should independent reviews be published as their own signed manifests (`assessment.kind: "independent"`) that reference the project's manifest by hash?
- Per-pillar sub-requirements: this draft keeps pillars coarse on purpose until there's evidence of what projects can realistically provide.
