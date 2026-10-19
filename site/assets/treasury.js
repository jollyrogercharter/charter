// In-browser check of the published treasury journal: leaf hashes, hash chain, Merkle root and one inclusion proof.
import { parseJournal, leafOf, GENESIS_PREV } from "/js/lib/treasury/journal.mjs";
import { inclusionProof, merkleRoot, verifyInclusion } from "/js/lib/treasury/merkle.mjs";

const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };

for (const n of document.querySelectorAll("[data-jrc-nojs]")) n.hidden = true;
for (const root of document.querySelectorAll("[data-jrc-treasury]")) {
  root.hidden = false;
  const out = root.querySelector("[data-results]"), live = root.querySelector("[data-live]"), form = root.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    out.replaceChildren();
    const button = form.querySelector("button");
    button.disabled = true;
    const lines = [];
    let message;
    try {
      const [text, snap] = await Promise.all([fetch("/treasury/demo/public-journal.jsonl").then((r) => r.text()), fetch("/treasury/demo/snapshot.json").then((r) => r.json())]);
      const recs = parseJournal(text);
      const leaves = recs.map(leafOf);
      const root = merkleRoot(leaves);
      const chain = recs.every((r, i) => r.type === "commitment" || r.prev === (i ? leaves[i - 1] : GENESIS_PREV));
      const seq = Number(form.elements.seq.value);
      if (!Number.isInteger(seq) || seq < 1 || seq > recs.length) throw new Error(`Choose a record from 1 to ${recs.length}.`);
      const proof = inclusionProof(leaves, seq - 1);
      const included = verifyInclusion(proof, snap.journal.merkle_root);
      lines.push(`Recomputed Merkle root: ${root}`, `Published root:         ${snap.journal.merkle_root}`, `Roots match: ${root === snap.journal.merkle_root ? "yes" : "NO"}`, `Hash chain intact: ${chain ? "yes" : "NO"}`,
        `Record ${seq} (${recs[seq - 1].type}${recs[seq - 1].id ? `, ${recs[seq - 1].id}` : ""}) leaf: ${proof.leaf}`, `Inclusion proof: ${proof.path.length} hashes; verifies against the published root: ${included ? "yes" : "NO"}`);
      message = root === snap.journal.merkle_root && chain && included ? `Record ${seq} verified.` : "Verification failed.";
    } catch (err) {
      lines.push(`Error: ${err.message}`);
      message = `Error: ${err.message}`;
    } finally { button.disabled = false; }
    const h = el("h4", "Result");
    h.tabIndex = -1;
    const pre = el("pre", lines.join("\n"));
    pre.tabIndex = 0;
    out.append(h, pre);
    h.focus();
    live.textContent = message;
  });
}
