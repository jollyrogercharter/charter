# Quartermaster: Candidate First Reference Application

**Working name, unverified.** First proposed app under the manifesto and practical proof of open economics.

## Product thesis

Anyone should be able to assemble a reliable picture of what operating an application costs, publish safely aggregated expenses, invite other people to make it cheaper and then verify the results. Costs and operational architecture should be observable and portable rather than hidden in private spreadsheets and cloud consoles.

## Primary capabilities

- Treat **human attention** as a first-class, separately labeled economic resource: paid contributor time already in cash expenses; donated maintainer/reviewer attention as imputed stewardship cost; and user setup, wait, troubleshooting and interruption time as a distinct societal/user cost.
- Calculate aggregate attention-hours and monetary valuations from open, versioned methodologies and project-selected reference rates. Encourage public debate and PRs about the assumptions and evidence, without imposing one worldwide price on all people's time.
- Expose an **Attention Cost** API/dashboard with opt-in or research-based time estimates, transparent uncertainty, privacy-safe aggregation, and workflow comparisons. Never use this to monetize surveillance or encourage attention-maximizing interfaces.


- Connect read-only billing API credentials to popular providers: infrastructure, databases, storage, AI inference, domains, CI/CD and distribution services.
- Import bills and usage records; reconcile estimated usage and finalized invoices.
- Enter and categorize manual expenses such as labor, support, insurance, taxes and reserves, clearly distinguishing actual money from donated labor or forecasts.
- Normalize costs using FOCUS when applicable and publish machine-readable standardized exports and a public dashboard.
- Build unit-economics views: per active user, per paying user, per transaction, per storage amount, per request, with denominators and attribution policies visible.
- Publish a sanitized operational topology and open infrastructure manifest linked to reproducible OpenTofu/configuration sources.
- Receive community/agent PRs proposing changes to infra configuration. Run cost estimates and security/performance checks; approve before deployment; compare actual bills afterward.
- Optionally publish signed, portable project and contribution/savings records using AT Protocol. No billing secrets should enter public repositories.
- Provide a documented API and generated clients in widely used languages; avoid implementing adapters separately for each language.

## Technical architecture, proposed

Provider adapters -> secure private ledger ingestion -> FOCUS-style normalization -> reconciliation + manual-entry interface -> redact/aggregate -> public snapshot/event feed -> dashboard, exports, and agent/PR integrations. A configurable privacy boundary sits between provider data and publication. Human approval gates govern operational changes.

### API-first implementation

Define OpenAPI specification once; generate official and community SDKs for TypeScript/JavaScript, Python, PHP, Go, Java, C#, Rust and Swift as feasible. Support CLI and simple self-hosted deployment. Prefer a small interoperability core over multiple huge SDKs maintained independently.

### First MVP (suggested)

1. Two billing integrations selected by developer demand.
2. Manual expense import and labeled reserves.
3. Reconciliation model and dashboard that distinguishes forecast vs finalized spend.
4. Basic authenticated admin vs public viewer permissions and safe redaction.
5. Example `open-infrastructure.yaml` and a PR cost-diff workflow.
6. OpenAPI schema plus two generated clients, followed by more languages.
7. Full published agent sessions (sanitized), tests, decisions, deployment/runbooks, and challenge instructions.

## Important product constraints

Cloud billing APIs are delayed and provider-specific; avoid promising truly real-time finalized invoices. Provider read-only credentials still require secret storage and scoped access. Public unit costs could reveal company/customer information at small scales: use aggregation thresholds and optional suppression. Correct for refunds, credits, one-time migration expenses and cross-currency bills. Public cost estimates do not automatically constitute independently audited financial statements.

## Natural first story

“Here is a working application. Here are its agent instructions and open infrastructure. Here is what its operation costs. Here is an independent developer's PR that made it cheaper, and the bill showing the effect.”

## Competitive differentiation to validate

Existing cost standards and platforms already normalize or optimize spending. Quartermaster's proposed niche is **public cost accountability plus community-changeable infrastructure and fully reproducible stewardship**. Validate this through prototype users, not marketing claims.
