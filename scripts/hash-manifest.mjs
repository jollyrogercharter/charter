// Writes provenance/launch-manifest.json: SHA-256 of each founding file as committed at the preservation ref.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const REF = process.argv[2] ?? "e59cf86";
const ZIP = "Jolly_Roger_Claude_Launch_Package.zip";
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const git = (...args) => execFileSync("git", args, { maxBuffer: 1 << 26 });

const commit = git("rev-parse", `${REF}^{commit}`).toString().trim();
const paths = git("ls-tree", "-r", "--name-only", commit).toString().trim().split("\n").filter((p) => p !== ".gitignore");
const files = paths.map((p) => {
  const buf = git("show", `${commit}:${p}`);
  return { path: p, bytes: buf.length, sha256: sha256(buf) };
});

const zip = existsSync(ZIP) ? readFileSync(ZIP) : null;
const previous = existsSync("provenance/launch-manifest.json") ? JSON.parse(readFileSync("provenance/launch-manifest.json", "utf8")) : {};

const manifest = {
  schema_version: "jrc-provenance-draft-0.1",
  status: "REAL_DIGESTS_OF_FOUNDING_PACKAGE",
  description: "SHA-256 digests of the founding launch package as received and committed verbatim. Integrity evidence for these exact bytes only; says nothing about when the ideas originated, who authored them, or whether anyone was first.",
  hashed_at_utc: previous.hashed_at_utc ?? new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  preservation_commit: commit,
  received_package: zip
    ? { file: ZIP, bytes: zip.length, sha256: sha256(zip), in_repository: false, note: "Original ZIP is kept outside Git; every entry under jolly-roger-charter/ was byte-compared to the preservation commit." }
    : previous.received_package ?? null,
  files,
  founding_transcript: { path: "conversation/FOUNDING-SESSION.md", state: "not-provided", note: "No ChatGPT export or human-approved public edition exists yet." },
  timestamp_state: previous.timestamp_state ?? "not-requested",
  timestamped_artifact: previous.timestamped_artifact ?? null,
  opentimestamps_proof_path: previous.opentimestamps_proof_path ?? null,
  bitcoin_attestation_time_utc: previous.bitcoin_attestation_time_utc ?? null,
  limitations: previous.limitations ?? [
    "A digest proves only that bytes match; it cannot authenticate authorship or dates stated inside the files.",
    "No independent timestamp has been requested, so these digests establish nothing about time beyond the Git history, which is mutable.",
    "FOUNDING-ARCHIVE.md is a curated record, not a verbatim ChatGPT transcript.",
  ],
};

writeFileSync("provenance/launch-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${files.length} digests from ${commit.slice(0, 7)}${zip ? " + package ZIP" : ""}`);
