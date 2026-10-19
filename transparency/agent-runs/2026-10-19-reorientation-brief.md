# Brief: Reorientation and Simplification (2026-10-19)

The prompt the human initiator gave the agent, reproduced verbatim for transparency. The run record is [`2026-10-19-reorientation.md`](2026-10-19-reorientation.md).

---

# Jolly Roger: Reorientation and Simplification

You are the lead product strategist, editor, designer, and engineer for Jolly Roger Charter.

Repository: https://github.com/jollyrogercharter/charter
Website: https://jollyrogercharter.org/

## Your mission

We have spent considerable effort building the philosophical, technical, and operational foundations of Jolly Roger. But the project has grown too complicated, and we've lost sight of its most important goal.

**Jolly Roger is fundamentally a movement to change how people earn a living from software in an age when AI makes software creation increasingly abundant.**

It should be possible to earn a good living creating and caring for software without charging for development hours, restricting access to source code, or manufacturing dependence on a particular provider.

Users should pay for ongoing value, stewardship, trust, and accountability. Software should return human attention rather than capture it.

Our movement must be simple enough for someone unfamiliar with software licensing, decentralized protocols, or AI agents to understand in 30 seconds.

Your assignment is to refocus the philosophy, simplify the public presentation, and reorganize the project around this central economic proposition.

**This is a simplification project, not an invitation to build another framework.**

## 1. The three principles

Everything should revolve around three ideas:

### Software should be free.

Anyone should be able to use, copy, modify, improve, distribute, and build upon software released under genuinely free terms.

The ability to use or continue software should not depend on its original creator.

### Stewardship should be rewarded.

People deserve to earn meaningful, sustainable income by creating value, maintaining trust, keeping software reliable and secure, supporting users, and accepting responsibility.

Compensation should not be inherently tied to hours worked or lines of code written.

AI automation should allow excellent stewards to become more productive and potentially earn more, not force them to charge less merely because work requires fewer hours.

We are not against profit. We are against manufacturing dependency to extract it.

### Human attention is precious.

Technology should return people's time to them.

AI should automate unnecessary work, eliminate friction, and reduce the attention that software demands from its users.

Users' attention is an economic resource to respect, not something to exploit through surveillance, advertising, addiction, or engagement-maximization.

Distinguish clearly between compensating people for valuable stewardship attention and reducing unnecessary attention demanded from users.

These three principles must remain central.

## 2. Simplify the manifesto

Rewrite `MANIFESTO.md` into a short, powerful, coherent manifesto.

Target approximately 200–300 words.

It must:

- Be understandable to a nontechnical reader.
- Explain why AI changes software economics.
- Make meaningful stewardship income central.
- Embrace free copying, modification, and commercial reuse.
- Emphasize the value of human attention.
- Reject artificial scarcity and vendor lock-in without rejecting legitimate profits.
- Invite others to participate and challenge the ideas.
- Preserve the movement's personality and optimism.

Retain these phrases:

**Free. Libre. Truly Free.**

**You can't pirate what belongs to everyone.**

**Free the code. Reward the stewards. Give people their time back.**

Use the following as the primary editorial starting point:

"Software is becoming easier to create. We believe that should benefit everyone.

Code should be free. Free to use, copy, modify, share, and improve. We shouldn't have to lock people into software to make a living from it.

Stewardship should be rewarded. People deserve to prosper by creating value, maintaining trust, and taking responsibility for the software others depend on. Not by counting hours or restricting access.

Human attention is precious. Technology should give us more time, not demand more of it. As AI makes creation increasingly automated, the value of human judgment, care, and attention should become more important, not less.

We believe people can earn a good living building and caring for software without owning everyone else's ability to use it.

Anyone should be free to make something better. Anyone should be free to leave."

Polish this carefully, but don't expand it into another multi-page philosophical document.

Do not fill the manifesto with discussions of Bitcoin, AT Protocol, WebMCP, DIDs, software signing, or financial schemas.

Those are tools, not the movement.

Avoid em dashes and unnecessary jargon. Use cohesive, natural paragraphs.

Preserve the previous manifesto as an explicitly dated historical draft without changing frozen provenance artifacts, committed historical records, or existing timestamp proofs.

## 3. Reorient the economic philosophy

This is the most important substantive change.

Our earlier language emphasized cost recovery, open operating expenses, and preventing excessive profits.

That is too narrow.

The objective is not to make software businesses nonprofit or limit compensation to operating expenses.

The objective is to enable people to earn sustainable and potentially substantial incomes without requiring proprietary software ownership, hourly billing, or captive customers.

Develop a concise explanation of the **Open Stewardship Economy**.

It should answer:

- What are customers actually paying for if the software is free?
- Why would someone voluntarily pay a steward instead of self-hosting?
- How does AI change the cost and value of software development?
- How can a highly automated steward earn meaningful income?
- How can users measure the value of attention saved?
- How do contributors participate in the value being created?
- How do users change stewards without losing their software or data?
- How can trust, reliability, security, and accountability become economic differentiators?

Describe several optional revenue approaches, such as stewardship subscriptions, service guarantees, outcome-based compensation, and community-funded maintenance.

Keep the explanation approachable and practical.

Make an important distinction:

**We are not trying to eliminate software profits. We are trying to separate them from artificial scarcity and dependency.**

Preserve economic transparency as an accountability principle, but don't equate transparency with a requirement to disclose everyone's personal finances.

Do not introduce a universal hourly valuation of human attention as a settled fact.

Do not claim this business model has already been validated.

## 4. Simplify the project's organization

Reorganize our public-facing information into three conceptual layers.

### The Manifesto

What we believe.

Short, memorable, accessible, and compelling.

### The Charter

What those beliefs mean in practice.

A small set of voluntary, understandable commitments.

Detailed conformance requirements and evidence definitions may continue to exist underneath this layer, but should not overwhelm the reader.

### The Projects

How we experiment with and implement the principles.

Examples include Quartermaster, reproducible software, canonical project identity, WebMCP, AT Protocol, decentralized updates, and financial transparency.

These technologies should support the principles without becoming mandatory components of the movement.

Existing technical specifications, tests, provenance records, and working prototypes should be retained and clearly organized.

Avoid large-scale directory moves or needless refactoring. Prefer simple navigation and editorial restructuring.

Do not delete valuable work to create the appearance of simplicity.

## 5. Redesign the website's message

Update the Eleventy site so a new visitor immediately understands what Jolly Roger stands for.

The home page should communicate, in approximately 30 seconds:

1. Software should be free.
2. Stewardship should be rewarded.
3. Human attention is precious.

The hero should communicate the economic vision rather than lead with technical conformance.

Suggested positioning:

**Free. Libre. Truly Free.**

"Free the code. Reward the stewards. Give people their time back."

Explain the idea in plain language immediately below.

Make the primary invitation easy to understand: read the manifesto, explore stewardship economics, or help prove the idea in practice.

Keep the pirate identity, but prioritize readability, clarity, accessibility, and trust.

Simplify primary navigation. Preserve existing technical pages under suitable secondary navigation or a projects/resources section.

Do not break existing URLs, machine-readable APIs, WebMCP tools, conformance reports, or other functionality.

Update the README, site descriptions, social preview metadata, and introductory documentation to use the same consistent message.

## 6. Make the economic experiment the priority

Our previous roadmap emphasized building more technology before validating the economic model.

Reverse that priority.

Create a concise, actionable proposal for a real-world test of stewardship-based income.

We want to demonstrate:

**Can someone earn a living from software without making anyone dependent on them?**

Design a modest pilot around a real, independently deployable application.

It should test:

- Whether people voluntarily pay for ongoing stewardship.
- What specific services or outcomes they value.
- Whether a steward can deliver those services efficiently using AI.
- Whether customers retain meaningful switching and self-hosting freedom.
- Whether users actually save attention or time.
- Whether the income can support sustainable stewardship.

Define simple metrics and an honest method of collecting evidence.

Do not fabricate traction, customers, revenue, cost savings, or endorsements.

Make this a small experiment, not a new startup platform that requires six months of development before we can test the hypothesis.

## 7. Preserve the project's integrity

Before making changes, inspect the complete repository and current PR state.

Pay particular attention to the existing stacked PRs, their actual base branches, and the differences between GitHub's merged status and the contents of `main`.

Protect all existing implementation work, especially the conformance CLI, Quartermaster ledger, adoption workflow, WebMCP integration, and provenance system.

Preserve:

- Existing CC0 licensing and rights notices.
- Authentic historical records and timestamps.
- Explicit AI and human attribution.
- Honest conformance and verification claims.
- Privacy protections.
- Existing security controls.
- Public debate and governance processes.
- Machine-readable specifications and API compatibility.

Do not silently redefine a proposed technical standard as approved community consensus.

This reorientation is a founder-proposed editorial and strategic change. Make substantive standards changes reviewable through the existing governance process.

Where a technical charter requirement conflicts with the simplified philosophical framing, document the conflict and propose a resolution rather than silently weakening technical guarantees.

## 8. Simplification acceptance criteria

Evaluate your work using these tests.

**The 30-second test**

Can a first-time visitor explain the three principles after reading the home page for 30 seconds?

**The income test**

Does a visitor understand how someone could earn a good living from free software without charging by the hour?

**The attention test**

Is it clear that we want software to save human attention rather than capture it?

**The freedom test**

Do the materials preserve the freedom to copy, fork, improve, compete, and change stewards?

**The complexity test**

Have we removed unnecessary concepts from the primary narrative rather than just adding new material?

**The integrity test**

Do all existing builds, tests, URLs, APIs, and transparency safeguards continue working?

**The authenticity test**

Does the website distinguish real accomplishments from aspirations and proposed experiments?

## 9. Deliverables

Produce:

1. Revised, one-page `MANIFESTO.md`.
2. Simplified `CHARTER.md` introduction and public-facing structure.
3. Updated website home page and navigation.
4. Consistent repository introduction and project messaging.
5. A short, readable economic explanation of stewardship-based income and the value of user attention.
6. A practical pilot proposal to test whether this economic model works.
7. A concise explanation of how the existing technical projects support the movement.
8. Updated tests and documentation.
9. A draft pull request with before-and-after screenshots where practical.

Use the existing architecture. Do not introduce unnecessary dependencies, frameworks, or elaborate new abstractions.

Run the existing test suite and verify that the public site builds.

Use independent editorial and engineering review passes to identify unnecessary complexity, contradictions, and broken behavior.

Document actual results rather than claiming verification that hasn't occurred.

Do not merge into main or deploy publicly without approval.

## 10. Final editorial challenge

Before finishing, ask:

"Would someone who has never heard of Jolly Roger understand the movement without needing an explanation from its founder?"

If not, simplify further.

We are no longer trying to communicate every technical possibility.

We are trying to establish a simple idea that people can believe in, adopt, improve, and ultimately build livelihoods around.

**The code is free. Your attention is valuable. Stewardship is worth paying for.**

**Free the code. Reward the stewards. Give people their time back.**

Free. Libre. Truly Free.
