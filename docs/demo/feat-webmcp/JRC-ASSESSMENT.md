# JRCv1 adoption assessment: charter

> Automated scan of public files at one commit. Finding a file shows that it exists, not that it is correct or followed. Not finding one shows only that it isn't in this repository; the evidence may live elsewhere. Nothing here is independently verified, and JRCv1 is a draft standard, not a certification.

- **Source:** https://github.com/jollyrogercharter/charter, ref <code>feat/webmcp</code>, commit <code>08d9d293ee98000e24e19d0cd819aa43ac00fb72</code>; read 2026-10-18T20:43:31Z.
- **Snapshot SHA-256:** <code>768497b5c9483b3126b2f92c479420a3894f2ba024d700425141ab9bd1ea966e</code>. Re-run `jrc assess --snapshot` on the saved snapshot to reproduce this report exactly.
- **Result:** 3 evidenced, 2 partly, 0 with no evidence found, 0 unknown, 1 not applicable. 0 concerns (0 contradictions). jrc.json: valid.
- **Basis:** automated scan of public files; not a review. The whole file list was read. 6 file(s) were read for content.

| Pillar | Status | Why |
|---|---|---|
| Code and rights | Evidenced | Every core check found public evidence (3 of 3 core checks found, plus 1 supporting). This shows the files exist, not that they're correct. |
| Reproducible development | Evidenced | Every core check found public evidence (4 of 4 core checks found, plus 2 supporting). This shows the files exist, not that they're correct. |
| User data and AT Protocol | Not applicable (self-reported) | The repository's jrc.json declares this pillar not applicable and gives a reason. That's the project's own statement; the scan didn't check it. |
| Operations and resiliency | Partly evidenced | Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 2 supporting). |
| Economics and human attention | Evidenced | Every core check found public evidence (1 of 1 core checks found). This shows the files exist, not that they're correct. |
| Governance and stewardship | Partly evidenced | Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 1 supporting). |

## Code and rights: Evidenced

*Can anyone legally copy, modify, sell and fork the original work? Are licences and dependencies documented?*

Every core check found public evidence (3 of 3 core checks found, plus 1 supporting). This shows the files exist, not that they're correct.

- **A licence is declared**: found. Found 1 matching path(s).
  - Evidence: [<code>LICENSE</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/LICENSE)
- **The licence lets anyone copy, modify, sell and fork**: found. Recognised as CC0-1.0, which permits copying, modification, resale and forking.
  - Evidence: [<code>LICENSE</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/LICENSE), [<code>package.json</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/package.json)
- **Dependencies are pinned in a lockfile**: found. Found 1 matching path(s).
  - Evidence: [<code>package-lock.json</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/package-lock.json)
- **A dependency or third-party licence inventory exists** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>NOTICE.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/NOTICE.md)
- **jrc.json declares:** partial with 2 claim(s); file evidence 1 verified, 2 present, 1 present-directory.

## Reproducible development: Evidenced

*Can a stranger rebuild it from public specs, decisions, agent/tool records, lockfiles, tests and build instructions?*

Every core check found public evidence (4 of 4 core checks found, plus 2 supporting). This shows the files exist, not that they're correct.

- **A README explains the project**: found. Found 1 matching path(s).
  - Evidence: [<code>README.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/README.md)
- **Build or install instructions are written down**: found. The deployment document has a build or install section.
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/DEPLOYMENT.md)
- **Automated tests exist**: found. Found 6 matching path(s).
  - Evidence: [<code>spec</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/spec), [<code>test</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/test), [<code>test/jrc.test.mjs</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/test/jrc.test.mjs), [<code>test/qm.test.mjs</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/test/qm.test.mjs), [<code>test/site.test.mjs</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/test/site.test.mjs) and 1 more
- **Continuous integration runs the build**: found. Found 1 matching path(s).
  - Evidence: [<code>.github/workflows/ci.yml</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/.github/workflows/ci.yml)
- **Design decisions are recorded** (supporting): found. Found 2 matching path(s).
  - Evidence: [<code>launch/RFC-DRAFTS-OVERNIGHT.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/launch/RFC-DRAFTS-OVERNIGHT.md), [<code>launch/RFC-SEEDS.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/launch/RFC-SEEDS.md)
- **AI-agent instructions are published, if agents are used** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>AGENTS.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/AGENTS.md)
- **jrc.json declares:** evidenced with 3 claim(s); file evidence 9 present.

## User data and AT Protocol: Not applicable (self-reported)

*Can people export, migrate and control their records? Mark not-applicable, with a reason, if the project holds no user data.*

The repository's jrc.json declares this pillar not applicable and gives a reason. That's the project's own statement; the scan didn't check it.

- **User data handling is documented**: not found. No privacy or data-handling document was found.
- **Users can export and migrate their data**: not found. No export, migration or AT Protocol lexicon files were found.
- **jrc.json declares:** not-applicable with 0 claim(s); file evidence none.

## Operations and resiliency: Partly evidenced

*Can someone else deploy, back up, restore, roll back and run it without secret steps?*

Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 2 supporting).

- **Deployment is documented**: found. Found 1 matching path(s).
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/DEPLOYMENT.md)
- **Deployment is reproducible from configuration** (supporting): not found. No container, infrastructure-as-code or hosting configuration was found.
- **There is a security reporting policy**: not found. No SECURITY policy was found, so there's no public way to report a vulnerability.
- **Backup, restore or rollback is described** (supporting): found. The deployment document mentions backup, restore or rollback.
  - Evidence: [<code>DEPLOYMENT.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/DEPLOYMENT.md)
- **Releases are documented** (supporting): found. Found 1 matching path(s).
  - Evidence: [<code>CHANGELOG.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/CHANGELOG.md)
- **jrc.json declares:** partial with 1 claim(s); file evidence 1 present.

## Economics and human attention: Evidenced

*Are operating costs public, dated and sourced, with billed, estimated, donated and user-attention costs kept separate?*

Every core check found public evidence (1 of 1 core checks found). This shows the files exist, not that they're correct.

- **Operating costs are published**: found. A valid Quartermaster cost ledger was found.
  - Evidence: [<code>launch/costs.json</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/launch/costs.json), [<code>product/QUARTERMASTER.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/product/QUARTERMASTER.md)
- **Funding sources are disclosed** (supporting): not found. No funding or sponsorship file was found.
- **jrc.json declares:** partial with 1 claim(s); file evidence 1 present.

## Governance and stewardship: Partly evidenced

*Can independent contributors propose changes, see decisions, and continue the work without the founder?*

Partly evidenced: some core evidence is missing (1 of 2 core checks found, plus 1 supporting).

- **Contribution instructions exist**: not found. No CONTRIBUTING guide was found.
- **Decision-making and stewardship are documented**: found. Found 1 matching path(s).
  - Evidence: [<code>community/GOVERNANCE-AND-DEBATE.md</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/community/GOVERNANCE-AND-DEBATE.md)
- **More than one person can maintain it** (supporting): not found. No CODEOWNERS file was found. Without signing in, GitHub doesn't show how many people can merge, so this scan can't tell.
- **Anyone can propose changes in the open** (supporting): found. Issues or Discussions are open on GitHub.
  - Evidence: [<code>.github/ISSUE_TEMPLATE</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/.github/ISSUE_TEMPLATE), [<code>.github/PULL_REQUEST_TEMPLATE</code>](https://github.com/jollyrogercharter/charter/blob/08d9d293ee98000e24e19d0cd819aa43ac00fb72/.github/PULL_REQUEST_TEMPLATE)
- **jrc.json declares:** exploring with 1 claim(s); file evidence 1 present-directory, 1 present.

## Roadmap

Ordered so that nothing comes before what it depends on; then by impact, then by effort.

1. **Add CONTRIBUTING.md: how to propose a change and how it gets decided** (high impact, small effort). No CONTRIBUTING guide was found.
2. **Give a second, independent person the rights to review, merge and release** (high impact, medium effort). No CODEOWNERS file was found. Without signing in, GitHub doesn't show how many people can merge, so this scan can't tell.
3. **Add SECURITY.md: how to report a vulnerability and who responds** (medium impact, small effort). No SECURITY policy was found, so there's no public way to report a vulnerability.
4. **Commit the deployment configuration (container, IaC or host config)** (medium impact, medium effort). No container, infrastructure-as-code or hosting configuration was found.
5. **Say how the project is funded, even if the answer is 'it isn't'** (low impact, small effort). No funding or sponsorship file was found.
6. **Run jrc check and publish the report in the repository** (medium impact, small effort). Readers can only check claims they can see.
7. **Ask someone unaffiliated to take the Jolly Roger Challenge** (high impact, medium effort, after <code>publish-report</code>). This scan and any self-assessment are claims. Independent reproduction is the real test of whether the project could survive without you.

Outcomes: **found** = a matching public file exists at this commit; **not found** = the whole file list was read and nothing matched; **contradicted** = the repository shows the opposite; **couldn't check** = the evidence wasn't available to this scan.
