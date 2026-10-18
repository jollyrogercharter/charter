# AT Protocol and User Sovereignty

## Intent

AT Protocol is a core technical pillar because the product should not make the service operator the sole authority over a user's digital identity and records. The goal is **meaningful user control and portability**, not the legally inaccurate statement that all data is owned exclusively by one person.

## Proposed architecture

- Use decentralized identifiers, portable handles where appropriate, user-associated repositories and open Lexicons for records and integrations.
- Keep authoritative user-generated records portable; treat search indexes, analytics projections and app views as derived and rebuildable.
- Publish proposed Lexicon NSIDs and versioning rules; let anyone build compatible clients and servers.
- Design import/export, verification, key rotation, recovery, deletion and migration as product features, not administrative favors.
- Use least-privilege access for third-party apps; report access and offer revocation where supported.
- Define shared spaces, jointly authored records, organizational records, provenance and conflicting rights explicitly.
- Keep the user-facing app interchangeable; avoid centralizing essential state in one provider-only database.

## AT Protocol limits as of October 17, 2026

- Default AT Protocol public repositories are public and can be replicated. Removing content from the primary server cannot promise removal from all copies.
- AT Protocol account migration is a design goal and supported in important contexts, but portability of all app data and operational recovery are not automatic.
- Atproto Spaces (permissioned/non-public data) was **alpha** as of August 20, 2026 and under development in October; do not claim production-grade private-data security merely because Spaces exists.
- Encryption, key management, access controls, recovery policies, legal data-subject requests and physical backups require additional engineering.

## Promise to users

The service itself will not claim ownership of personal content because it hosts it. It will specify legitimate processing rights and obligations in binding terms. Do not sell personally identifying data or train models on private user information without explicit informed consent in services that adopt the stewardship pledge.

## Unanswered design questions

How should collaborative ownership work? How does recovery work when a user loses keys? Can public records be selectively forgotten? How should shared data be exported when participants disagree? What must an app do if atproto support is partial?

Sources: https://atproto.com/guides/overview ; https://atproto.com/specs/lexicon ; https://atproto.com/blog/atproto-spaces-alpha ; https://atproto.com/blog/devex-goals-for-spaces
