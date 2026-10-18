# Open Economics and Open Infrastructure Manifest

## Core statement

Our books are open. Our infrastructure is open. Our future is open to contribution.

Provider billing integration, usage-derived projections, manually quantified obligations, reserves and pricing methods should form part of an application’s documented public operating model. Use **read-only, least-privilege connectors** and publish aggregates safe for public inspection, not the raw credentials or identifiable billing records.

## Cost categories

Compute, databases, storage, bandwidth, backups, monitoring, domain and certificates, app-store and release operations, CI/CD, LLM inference and coding agents, customer support, paid human development, professional fees, taxes, insurance, contingency, amortized capital expenses, unpaid volunteer labor **when disclosed as donated rather than falsely claimed as cash expense**, and operating reserve.

## Data quality and display

Distinguish (1) actual finalized invoice, (2) current usage estimate, (3) manual actual, (4) allocated/shared cost, (5) forecast and (6) reserve. Display provider, reporting interval, last sync, currency, exchange assumptions, metric numerator and denominator, rounding and reconciliation status. Public cost-per-user figures should distinguish active users from paying users and specify whether costs are variable or shared.

## Reference data architecture

Provider connectors -> ingestion/normalization -> FOCUS-aligned financial events -> private raw store -> aggregation and redaction -> signed public cost snapshot -> dashboards, export and AT Protocol publishing. Maintain provenance and reconciliation links. Cost data is **not always available real-time**; freshness should be explicit.

Useful existing tools: FOCUS 1.4 for billing normalization; OpenCost for cloud-native cost allocation; Infracost for PR-level infrastructure estimates; OpenTofu for declarative deployable infra. Avoid claiming these tools cover every provider or manual cost out of the box.

## Open infrastructure pull requests

The project publishes `open-infrastructure.yaml` and referenced deployable infrastructure code. A contributor, including an agent, proposes a change: cost savings, performance optimization, alternative provider, smaller instance, caching, storage tier, backup policy or safer release pipeline.

Every PR should include:

- Before and after architecture and configuration diff.
- Scope, assumptions, migration and rollback plan.
- One-time transition costs and ongoing cost estimates.
- Reliability/security/privacy/accessibility analysis and benchmarks.
- CI validation with read-only test permissions, never automatic unrestricted production changes.
- Post-deployment observation window and actual reconciled savings or explanation for a miss.

A saving that breaks backups, weakens security or increases downtime is not a valid win.

## Sustainable pricing

**Human attention is part of the economic picture.** The proposed [Human Attention Accounting](HUMAN-ATTENTION.md) extension adds explicit, nonoverlapping views of paid maintenance, imputed donated labor, and user attention burden. The public dashboard should show each separately rather than burying attention under “free volunteer work” or implying that users' lost time appears on an invoice. Pricing cannot simply equal cash bills plus every imputed impact; those are different ledgers.


**Transparency is not the same as zero payment**. The steward may charge a reasonable amount to cover labor, resilience and ongoing obligations; publish the allocation and rationale. The pledge favors passing efficiencies to the community through lower prices, better quality, reserves or renewed development. Competing providers may price differently; the license must not restrict them.

## Open questions

What privacy-safe minimum aggregation threshold applies? How should contributions reducing bills be credited? Should costs be attested by third parties? How much staffing and surplus is appropriate? How do we avoid customer-identifiable unit economics? What happens when an API cannot disclose certain provider pricing?

Sources: https://focus.finops.org/docs/specification/v1-4/ ; https://opencost.io/ ; https://www.infracost.io/ ; https://opentofu.org/
