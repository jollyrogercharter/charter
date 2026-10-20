# JRCv1 adoption assessment: charter

> Automated scan of public files at one commit. Finding a file shows that it exists, not that it is correct or followed. Not finding one shows only that it isn't in this repository; the evidence may live elsewhere. Nothing here is independently verified, and JRCv1 is a draft standard, not a certification.

- **Source:** https://github.com/jollyrogercharter/charter, ref <code>main</code>, commit <code>37365e155664b685b7bb7f93757dc05089073dd6</code>; read 2026-10-18T20:43:29Z.
- **Snapshot SHA-256:** <code>b8c99c6883c63aa76e5ec670baa4d666fa5e95d3b4e1f8ffb7b92880211ccba3</code>. Re-run `jrc assess --snapshot` on the saved snapshot to reproduce this report exactly.
- **Result:** 3 evidenced, 2 partly, 0 with no evidence found, 1 unknown, 0 not applicable. 0 concerns (0 contradictions). jrc.json: absent.
- **Basis:** automated scan of public files; not a review. The whole file list was read. 5 file(s) were read for content.

| Pillar | Status | Why |
|---|---|---|
| Code and rights | Evidenced | Every core check found public evidence (3 of 3 core checks found, plus 1 supporting). This shows the files exist, not that they're correct. |
| Reproducible development | Evidenced | Every core check found public evidence (4 of 4 core checks found, plus 2 supporting). This shows the files exist, not that they're correct. |
| User data and AT Protocol | Unknown | A file list can't show whether a project holds user data. Add jrc.json and either evidence this pillar or mark it not-applicable with a reason. |
| Operations and resiliency | Partly evidenced | Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 2 supporting). |
| Economics and human attention | Evidenced | Every core check found public evidence (1 of 1 core checks found). This shows the files exist, not that they're correct. |
| Governance and stewardship | Partly evidenced | Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 1 supporting). |

## Code and rights: Evidenced

*Can anyone legally copy, modify, sell and fork the original work? Are licences and dependencies documented?*

Every core check found public evidence (3 of 3 core checks found, plus 1 supporting). This shows the files exist, not that they're correct.

- **A licence is declared**: found. Found 1 matching path(s).
  - Evidence: [<code>LICENSE</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/LICENSE)
- **The licence lets anyone copy, modify, sell and fork**: found. Recognised as CC0-1.0, which permits copying, modification, resale and forking.
  - Evidence: [<code>LICENSE</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/LICENSE), [<code>package.json</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/package.json)
- **Dependencies are pinned in a lockfile**: found. Found 1 matching path(s).
  - Evidence: [<code>package-lock.json</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/package-lock.json)
- **A dependency or third-party licence inventory exists** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>NOTICE.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/NOTICE.md)

## Reproducible development: Evidenced

*Can a stranger rebuild it from public specs, decisions, agent/tool records, lockfiles, tests and build instructions?*

Every core check found public evidence (4 of 4 core checks found, plus 2 supporting). This shows the files exist, not that they're correct.

- **A README explains the project**: found. Found 1 matching path(s).
  - Evidence: [<code>README.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/README.md)
- **Build or install instructions are written down**: found. The deployment document has a build or install section.
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/DEPLOYMENT.md)
- **Automated tests exist**: found. Found 2 matching path(s).
  - Evidence: [<code>test</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/test), [<code>test/site.test.mjs</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/test/site.test.mjs)
- **Continuous integration runs the build**: found. Found 1 matching path(s).
  - Evidence: [<code>.github/workflows/ci.yml</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/.github/workflows/ci.yml)
- **Design decisions are recorded** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>launch/RFC-SEEDS.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/launch/RFC-SEEDS.md)
- **AI-agent instructions are published, if agents are used** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>AGENTS.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/AGENTS.md)

## User data and AT Protocol: Unknown

*Can people export, migrate and control their records? Mark not-applicable, with a reason, if the project holds no user data.*

A file list can't show whether a project holds user data. Add jrc.json and either evidence this pillar or mark it not-applicable with a reason.

- **User data handling is documented**: not found. No privacy or data-handling document was found.
- **Users can export and migrate their data**: not found. No export, migration or AT Protocol lexicon files were found.

## Operations and resiliency: Partly evidenced

*Can someone else deploy, back up, restore, roll back and run it without secret steps?*

Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 2 supporting).

- **Deployment is documented**: found. Found 1 matching path(s).
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/DEPLOYMENT.md)
- **Deployment is reproducible from configuration** (supporting): not found. No container, infrastructure-as-code or hosting configuration was found.
- **There is a security reporting policy**: not found. No SECURITY policy was found, so there's no public way to report a vulnerability.
- **Backup, restore or rollback is described** (supporting): found. The deployment document mentions backup, restore or rollback.
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/DEPLOYMENT.md)
- **Releases are documented** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>CHANGELOG.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/CHANGELOG.md)

## Economics and human attention: Evidenced

*Are operating costs public, dated and sourced, with billed, estimated, donated and user-attention costs kept separate?*

Every core check found public evidence (1 of 1 core checks found). This shows the files exist, not that they're correct.

- **Operating costs are published**: found. Found 2 matching path(s).
  - Evidence: [<code>launch/costs.json</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/launch/costs.json), [<code>product/QUARTERMASTER.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/product/QUARTERMASTER.md)
- **Funding sources are disclosed** (supporting): not found. No funding or sponsorship file was found.

## Governance and stewardship: Partly evidenced

*Can independent contributors propose changes, see decisions, and continue the work without the founder?*

Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 1 supporting).

- **Contribution instructions exist**: not found. No CONTRIBUTING guide was found.
- **Decision-making and stewardship are documented**: found. Found 1 matching path(s).
  - Evidence: [<code>community/GOVERNANCE-AND-DEBATE.md</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/community/GOVERNANCE-AND-DEBATE.md)
- **More than one person can maintain it** (supporting): not found. No CODEOWNERS file was found. Without signing in, GitHub doesn't show how many people can merge, so this scan can't tell.
- **Anyone can propose changes in the open** (supporting): found. Issues or Discussions are open on GitHub.
  - Evidence: [<code>.github/ISSUE_TEMPLATE</code>](https://github.com/jollyrogercharter/charter/blob/37365e155664b685b7bb7f93757dc05089073dd6/.github/ISSUE_TEMPLATE)

## Roadmap

Ordered so that nothing comes before what it depends on; then by impact, then by effort.

1. **Add jrc.json from the candidate below, fill in the assessor, and review every claim** (high impact, small effort). A manifest is how a project states its own claims, gaps and evidence. The candidate is a starting point built from what this scan found.
2. **Say whether the project holds user data and, if so, how people control it** (high impact, small effort). No privacy or data-handling document was found.
3. **Add CONTRIBUTING.md: how to propose a change and how it gets decided** (high impact, small effort). No CONTRIBUTING guide was found.
4. **Give a second, independent person the rights to review, merge and release** (high impact, medium effort). No CODEOWNERS file was found. Without signing in, GitHub doesn't show how many people can merge, so this scan can't tell.
5. **Document (and test) how a user exports their data and moves it elsewhere** (high impact, large effort, after <code>data-policy</code>). No export, migration or AT Protocol lexicon files were found.
6. **Add SECURITY.md: how to report a vulnerability and who responds** (medium impact, small effort). No SECURITY policy was found, so there's no public way to report a vulnerability.
7. **Commit the deployment configuration (container, IaC or host config)** (medium impact, medium effort). No container, infrastructure-as-code or hosting configuration was found.
8. **Say how the project is funded, even if the answer is 'it isn't'** (low impact, small effort). No funding or sponsorship file was found.
9. **Run jrc check and publish the report in the repository** (medium impact, small effort, after <code>create-manifest</code>). Readers can only check claims they can see.
10. **Ask someone unaffiliated to take the Jolly Roger Challenge** (high impact, medium effort, after <code>publish-report</code>). This scan and any self-assessment are claims. Independent reproduction is the real test of whether the project could survive without you.

Outcomes: **found** = a matching public file exists at this commit; **not found** = the whole file list was read and nothing matched; **contradicted** = the repository shows the opposite; **couldn't check** = the evidence wasn't available to this scan.
