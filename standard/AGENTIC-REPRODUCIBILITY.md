# Open, Agent-Native Development

## Foundational claim

An application is not truly independently reproducible if others can only copy today's code but lack the intent, context, specifications, release process and operational knowledge necessary to maintain it. Publish the **full process**, as far as rights, privacy and security permit.

## Expected repository artifacts

1. Product rationale, user requirements, tradeoffs, roadmap and structured specifications.
2. Architecture decisions and rejected alternatives, including performance and security tradeoffs.
3. Agent instructions (for example `AGENTS.md`), model/tool and runtime versions, skills and safe environment setup.
4. Sanitized prompts, conversation transcripts or equivalent structured intent histories, with provenance and redaction indicators.
5. Build scripts, lockfiles, dependency manifests, test suites, validation commands and expected outputs.
6. CI/CD workflows, environment templates, release checklist, release signing method, rollback instructions and deployment playbooks.
7. Infrastructure-as-code and open infrastructure manifest, with safe stand-ins for secrets and billing IDs.
8. Security model, responsible disclosure, dependency update process, incident-response playbook and support runbooks.
9. A contributor path to use any competent coding agent, not one locked proprietary assistant.
10. Public issue/PR records that connect suggested improvements to tests, accepted decisions and production results.

## What FULLY means in practice

Publish enough detail that someone can reconstruct the decisions and produce a functioning independent instance. *Not* publishing actual credentials, user private messages, undisclosed vulnerabilities, third-party proprietary data, or copyrighted source you cannot redistribute. Use a public redaction policy identifying protected categories and disclose where omissions exist without revealing the protected material.

## Agent workflow

Propose -> clarify -> specify -> threat-model -> implement -> test -> compare -> review -> merge -> release -> measure -> publish lessons. Agents can automate bounded work, produce proposed patches and raise safety concerns. Humans authorize critical deployments and operational changes.

## Measurements

- Clean-room build pass rate.
- Independent reproduction time and blockers.
- Recovery time for restoring from backups.
- Percentage of major decisions traced to evidence.
- Number of agent-specific dependencies that cannot be replaced.
- Security review and regression coverage.

## Existing precedent

GitHub Spec Kit demonstrates specification-driven workflows, agent integration and reproducible development assets. The proposed innovation is to tie this to public-domain intent, independent operations, data sovereignty and cost transparency as a shared movement: https://github.github.com/spec-kit/
