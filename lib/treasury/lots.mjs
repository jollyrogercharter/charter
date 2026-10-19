// FIFO Bitcoin lots per account, so cost basis follows coins between the operator's own wallets. Records, not tax advice.
const split = (lot, take) => {
  const basis = lot.basis_cents === null ? null : Math.round((lot.basis_cents * take) / lot.sats);
  return [{ ...lot, sats: take, basis_cents: basis }, { ...lot, sats: lot.sats - take, basis_cents: lot.basis_cents === null ? null : lot.basis_cents - basis }];
};

function takeFifo(queue, sats) {
  const taken = [];
  while (sats > 0 && queue.length) {
    const lot = queue[0];
    if (lot.sats <= sats) { taken.push(queue.shift()); sats -= lot.sats; }
    else { const [a, b] = split(lot, sats); taken.push(a); queue[0] = b; sats = 0; }
  }
  return { taken, short: sats };
}

const sumBasis = (lots) => (lots.some((l) => l.basis_cents === null) ? null : lots.reduce((n, l) => n + l.basis_cents, 0));

export function computeLots(ix, base = ix.header.base_currency) {
  const queues = new Map(), disposals = [], issues = [], feeBasis = [];
  const q = (id) => { if (!queues.has(id)) queues.set(id, []); return queues.get(id); };
  const isBtcAsset = (id) => { const a = ix.accounts.get(id); return a?.kind === "asset" && a.commodity === "BTC"; };
  for (const tx of ix.transactions) {
    if (tx.status !== "posted") continue;
    const btc = tx.postings.filter((p) => p.commodity === "BTC");
    const outs = btc.filter((p) => p.amount < 0 && isBtcAsset(p.account));
    const ins = btc.filter((p) => p.amount > 0 && isBtcAsset(p.account));
    if (!outs.length && !ins.length) continue;
    let pool = [];
    for (const o of outs) {
      const { taken, short } = takeFifo(q(o.account), -o.amount);
      if (short) issues.push({ transaction: tx.id, issue: `${o.account} spends ${short} sats more than its recorded lots` });
      pool.push(...taken);
    }
    if (tx.kind === "conversion" && !outs.length) {
      // Basis is everything paid from fiat accounts, so purchase fees are included.
      const fiatPaid = tx.postings.filter((p) => p.commodity === base && p.amount < 0 && ix.accounts.get(p.account)?.kind === "asset").reduce((n, p) => n - p.amount, 0);
      for (const i of ins) q(i.account).push({ acquired_at: tx.occurred_at, acquired_in: tx.id, sats: i.amount, basis_cents: ins.length === 1 ? fiatPaid : null });
      continue;
    }
    if (!outs.length) {
      for (const i of ins) q(i.account).push({ acquired_at: tx.occurred_at, acquired_in: tx.id, sats: i.amount, basis_cents: i.value?.commodity === base ? i.value.amount : null });
      continue;
    }
    // Coins leaving to own accounts keep their dates and basis; anything else leaving is a disposal.
    for (const i of ins) {
      const { taken } = takeFifo(pool, i.amount);
      q(i.account).push(...taken);
    }
    const left = pool.reduce((n, l) => n + l.sats, 0);
    if (!left) continue;
    const feeSats = btc.filter((p) => p.amount > 0 && ix.accounts.get(p.account)?.fee).reduce((n, p) => n + p.amount, 0);
    const { taken: feeLots } = takeFifo(pool, feeSats);
    if (feeLots.length) feeBasis.push({ transaction: tx.id, sats: feeSats, basis_cents: sumBasis(feeLots), treatment: "unresolved: ask a tax adviser whether network fees on self-transfers are disposals" });
    const rest = pool.reduce((n, l) => n + l.sats, 0);
    if (rest) {
      const proceeds = btc.filter((p) => p.amount > 0 && !isBtcAsset(p.account) && !ix.accounts.get(p.account)?.fee).reduce((n, p) => (p.value?.commodity === base && n !== null ? n + p.value.amount : null), 0);
      const basis = sumBasis(pool);
      disposals.push({ transaction: tx.id, disposed_at: tx.occurred_at, sats: rest, proceeds_cents: proceeds, basis_cents: basis, gain_cents: proceeds === null || basis === null ? null : proceeds - basis, lots: pool.map((l) => ({ acquired_at: l.acquired_at, acquired_in: l.acquired_in, sats: l.sats })) });
    }
  }
  return {
    method: "FIFO within each account; coins moved between the operator's own accounts keep their acquisition date and basis",
    open_lots: Object.fromEntries([...queues].map(([k, v]) => [k, v])),
    disposals, fee_basis: feeBasis, issues,
    note: "A record of basis under one stated method, not tax advice. US rules since 2025 track basis per wallet or account; confirm the method and fee treatment with a tax adviser.",
  };
}
