# Launch Briefing

**For human review. Nothing here has been posted.**

Prepared by Claude on 2026-10-18 under Priority E of the overnight handoff. Every piece below is a draft for a human to read, rewrite in their own voice and publish (or not) from their own account. Nothing has been scheduled, automated or sent. Paid media: none. No bots, no vote coordination, no bulk messaging.

**The news is the tool and the challenge:** a working, offline `jrc` command and a repeatable test ("could your software survive without you?") that a stranger can run without asking anyone. It is not a claim to have invented software freedom, and nothing here says so.

## Facts you may rely on, and facts you must not add

Verified from this repository on 2026-10-18 (`jrc.json`, `launch/status.json`, the site):

- `jrc` is at **0.1 draft**. Schema and CLI may change through public RFCs. It is CC0, offline, with no runtime dependencies.
- Self-assessment of the charter repository: **1 of 5 applicable pillars evidenced** (development), **3 partial** (code and rights, operations, economics), **governance exploring**, **data not-applicable** (static site, no user records).
- That self-assessment was written by the AI agent that built most of the repository. **No independent reproduction exists.**
- The OpenTimestamps proof for the launch digests is **pending**, not confirmed.
- JRCv1 is a draft conformance charter. It is **not** a licence, a certification or an OSI-approved anything.
- Origin: the idea came from a conversation between the human initiator and ChatGPT. The repository, site and tool were built by Claude, with the human accountable for what is published.

Do not add: user or adopter counts, stars, downloads, testimonials, endorsements, or any "first of its kind" claim. There are none to report. Re-verify the status numbers against https://jollyrogercharter.org/status/ and https://jollyrogercharter.org/check/ on the day you post, because they may have changed.

Real links:

- Quickstart: https://jollyrogercharter.org/check/
- Challenge: https://jollyrogercharter.org/challenge/
- Status: https://jollyrogercharter.org/status/
- Spec: https://jollyrogercharter.org/spec/
- Repository: https://github.com/jollyrogercharter/charter

Sourced quotes (use only exactly as shown, with this attribution):

- Thomas Jefferson to Isaac McPherson, August 13, 1813: “He who receives an idea from me, receives instruction himself without lessening mine.” Source: https://tjrs.monticello.org/letter/293 (spelling normalized).
- Steve Wozniak's reply to Stewart Brand at the 1984 Hackers Conference, as recounted by Steven Levy in WIRED, November 21, 2014: “Information should be free but your time should not.” Source: https://www.wired.com/story/hackers-at-30-hackers-and-information-wants-to-be-free/ . This is Levy's account of the exchange, not a transcript of 1984, and should never be presented as one.

---

## (a) Technical article

*Suggested title:* A small offline tool for asking whether your project could survive without you

*Draft (about 700 words):*

> Most software that calls itself free stops being reproducible somewhere between the source code and the running service. The build step needs a machine nobody documented. The deployment lives in one person's account. The bill is a mystery and the user's data can't leave. None of this is new, and the older work on free software, open source and public-domain dedication got the first step right. The question we're working on is what comes after publishing the code.
>
> Thomas Jefferson put the founding intuition well in an August 13, 1813 letter to Isaac McPherson: “He who receives an idea from me, receives instruction himself without lessening mine.” Steve Wozniak, replying to Stewart Brand at the 1984 Hackers Conference as Steven Levy recounted it in WIRED in 2014, added the caveat: “Information should be free but your time should not.” Our project sits between those two sentences. It asks whether the freedoms can be extended past source code to process, operations, cost and data, and it counts human time as a real cost.
>
> **What exists today.** A command-line tool called `jrc`, version 0.1 draft. You write a `jrc.json` that says how your project meets six pillars: code and rights, reproducible development, user data, operations and resiliency, economics including human attention, and governance. Each claim cites evidence: a file (optionally pinned by SHA-256), a URL, or a command a reviewer can run. `jrc check` validates the manifest and the local files it cites. It rejects evidence paths that escape your project, hashes that don't match, independence claims with no named reviewer, wording like "certified" or "OSI-approved," and anything that looks like a token, key or home-directory path. It never fetches a URL or runs a command from your manifest, and it needs no account, network or AI provider. An incomplete manifest is valid. Gaps are the point.
>
> `jrc report` writes a JSON report, a Markdown report and an optional badge. They are byte-identical on every run from the same manifest. The badge says "self-reported" unless a named, separate reviewer is recorded, and it should link to the report it summarises.
>
> **Try it in five minutes.** You need Node 20 or newer.
>
> ```
> npx --yes --package=github:jollyrogercharter/charter jrc --help
> ```
>
> or clone it and run it with no install step:
>
> ```
> git clone https://github.com/jollyrogercharter/charter.git jrc-tool
> node jrc-tool/bin/jrc.mjs --help
> ```
>
> Then, in your own project (where `jrc` stands for either form above):
>
> ```
> cd your-project
> jrc init            # writes jrc.json; refuses to overwrite an existing one
> jrc check           # exit 0: valid (incomplete is fine) · 1: invalid · 2: usage error
> jrc report --out jrc-report     # jrc-report.json, JRC-REPORT.md, jrc-badge.svg
> ```
>
> Between `init` and `check` you edit `jrc.json`: set a status per pillar and add claims with evidence. The full quickstart is at https://jollyrogercharter.org/check/ and the field reference is at https://jollyrogercharter.org/spec/ .
>
> **Where we stand, honestly.** The charter repository's own self-assessment reports 1 of 5 applicable pillars evidenced (development), 3 partial, governance exploring, and data not-applicable because the site is static and holds no user records. That assessment was written by the AI agent that built most of the repository, so treat it as a starting point for criticism. No one unaffiliated has reproduced anything. The OpenTimestamps proof for the launch digests is still pending. `jrc` is a 0.1 draft whose schema may change. And a report is not a licence, a certification or an endorsement: `jrc` can check that a file exists, not that your statement about it is true.
>
> **The challenge.** A manifest says what you claim. The [Jolly Roger Challenge](https://jollyrogercharter.org/challenge/) tests it: can someone who didn't build the project rebuild it on a clean machine, deploy it elsewhere, work out what it costs to run, and carry on without the original author? Partial attempts are valid results, and the blockers are the useful part.
>
> **How it was made.** The idea began as a conversation between a human and ChatGPT. Claude then built the repository, site and tool, with the human accountable for what is published. The prompts, plans and run records are in the repository.
>
> **What we want.** Try it on your own project and tell us where it misleads you. We'd most like to hear how this approach fails: self-assessment theatre, evidence that exists but proves nothing, burden on small maintainers. Source: https://github.com/jollyrogercharter/charter .

---

## (b) LinkedIn post

*First person, for the human to adapt. Put the repo link in the post text or the first comment, whichever you prefer.*

> **Could your software survive without you?**
>
> I've been working on a way to ask that question that doesn't rely on anyone's good intentions, including mine.
>
> The idea started as a long conversation between me and ChatGPT. The repository, the website and a small command-line tool were then built by Claude, an AI model, under my direction. I decide what gets published and I'm accountable for it, but much of the writing and engineering was done by AI, and the project says so.
>
> What exists now: a tool called jrc. You write down how your project meets six pillars (code and rights, reproducible development, user data, operations, economics, governance), point at evidence, and it checks the manifest and the local files it cites. It runs offline, needs no account, and says "self-reported" on everything it produces. It can't tell whether your claims are true.
>
> Where we actually are: our own self-assessment shows one of five applicable pillars evidenced, three partial, governance still exploring. An AI wrote that assessment. Nobody independent has reproduced any of it, and the timestamp proof is still pending. The tool is a 0.1 draft. It is not a licence, a certification or an endorsement.
>
> We didn't invent software freedom. Others did the foundational work, and the repository credits them. This is a narrower attempt: make "could someone else run this without you?" something a stranger can check.
>
> I'd like it broken. Try the five-minute quickstart on a project you know well, or try the challenge, and tell me where it misleads you or what it misses. Partial results are welcome.
>
> https://jollyrogercharter.org/check/
> https://github.com/jollyrogercharter/charter

---

## (c) Bluesky thread

Six posts. Each is under 300 characters (counts below were measured, all plain ASCII).

**1/6 (274 characters)**

```
1/ Could your software survive without you? We built a small, offline tool to help you ask that honestly. It's called jrc: you write down how a project meets six pillars, cite evidence, and it checks the manifest and the local files it points at. 0.1 draft, CC0, no account.
```

**2/6 (277 characters)**

```
2/ What it does: validates a jrc.json, checks that cited files exist and match their hashes, rejects words like "certified", and writes a report plus a badge that says self-reported. What it can't do: tell whether your claims are true. It never fetches a URL or runs a command.
```

**3/6 (283 characters)**

```
3/ Honest status. Our own self-assessment: 1 of 5 applicable pillars evidenced, 3 partial, governance exploring, data not-applicable (static site, no user records). It was written by the AI agent that built the repo. No independent reproduction yet. Timestamp proof is still pending.
```

**4/6 (276 characters)**

```
4/ Where this came from: the idea began as a conversation between a human and ChatGPT. The repo, site and tool were built by Claude, with the human accountable for what's published. Not a licence, a certification or an OSI-approved anything. We didn't invent software freedom.
```

**5/6 (246 characters)**

```
5/ Try it in five minutes, no permission needed: https://jollyrogercharter.org/check/ . Then the harder test, someone rebuilding your project without you: https://jollyrogercharter.org/challenge/ . Incomplete attempts count; blockers are results.
```

**6/6 (289 characters)**

```
6/ Mostly we want it broken. What would make this approach fail? Self-assessment theatre, evidence that proves nothing, badge misuse? Source and issues: https://github.com/jollyrogercharter/charter . Spec: https://jollyrogercharter.org/spec/ . Status: https://jollyrogercharter.org/status/
```

Notes: Bluesky counts graphemes, and these are plain ASCII, so characters equal graphemes. Bluesky may shorten link display but the post text stays as written. Recount after any edit. Attach no images unless the human adds one with alt text. Do not tag other accounts or ask for reposts.

---

## (d) Hacker News: for a later, manual "Show HN" by the human

**Do not submit this on the human's behalf.** Hacker News expects a submission from a person who made the thing and will answer questions, and it penalises coordinated voting. This text is a draft for the human to use or discard.

*Suggested title (70 characters):*

```
Show HN: jrc, an offline CLI to check if a project can run without you
```

*Suggested URL:* https://jollyrogercharter.org/check/ (or the repository, whichever the human prefers).

*First comment / description (two paragraphs):*

> jrc is a 0.1-draft, dependency-free, offline Node CLI (CC0). You write a jrc.json describing how your project meets six pillars (code and rights, reproducible development, user data, operations, economics, governance) and cite evidence as files (optionally SHA-256 pinned), URLs or commands. `jrc check` validates the manifest and local files, rejects escaping paths, hash mismatches, independence claims without a named reviewer, and wording like "certified"; it never fetches URLs or runs commands. `jrc report` emits a byte-reproducible JSON and Markdown report and a badge that says "self-reported". Quickstart: https://jollyrogercharter.org/check/ . Source: https://github.com/jollyrogercharter/charter .
>
> Limits up front: a report is not a licence or certification and proves only that the manifest is well-formed and the cited local files exist. Our own self-assessment (1 of 5 applicable pillars evidenced, 3 partial, governance exploring, data not-applicable) was written by the AI agent that built the repo; no one has independently reproduced it, and the OpenTimestamps proof for our launch digests is pending. The idea came from a human and ChatGPT conversation and the code was built by Claude, with the human accountable for it. I'd most like to hear how the approach fails, and whether the clean-machine challenge (https://jollyrogercharter.org/challenge/) is reproducible for you.

Before posting to HN, rewrite the second paragraph in the human's own words and in the first person. HN readers respond to someone who built the thing and can answer questions.

### Checklist: what must be true before submitting

- [ ] The human is submitting from their own account, personally, and will be available to answer comments for several hours afterwards.
- [ ] No one has been asked to upvote, comment or share for votes, and no one will be. Do not post the link in chats or groups with a request for votes. Links shared for discussion are fine; asking for votes is not.
- [ ] The clean-clone quickstart has been run today, from scratch, on a machine that isn't the build machine, using exactly the commands on /check/, and it works. A broken first run is the fastest way to lose the thread.
- [ ] `npm ci && npm test` passes on the commit being linked, and the site's status page agrees with what the post says.
- [ ] The numbers in the post (1 of 5 evidenced, 3 partial, governance exploring, data not-applicable) match https://jollyrogercharter.org/check/ today. If an independent reproduction or a confirmed OpenTimestamps proof exists by then, update the text. Do not mention either unless it exists.
- [ ] The title and text contain no marketing claims, no adopter or user counts, no "first," and nothing that calls JRCv1 a licence, certification or standard that has been approved by anyone.
- [ ] AI authorship is stated plainly in the text, not buried.
- [ ] The repository has a visible place for criticism: GitHub Discussions exists, and the "What Would Make This Fail?" thread (see `launch/RFC-DRAFTS-OVERNIGHT.md`) is posted if the human wants the traffic to land somewhere.
- [ ] The human has decided how they will respond to hostile or dismissive feedback without arguing, and is ready for "this is just a checklist" to be a fair comment.
- [ ] Nothing in the repository links to private data, tokens, billing identifiers or personal contact details (the checks in `jrc check` help here, but do a manual pass).

---

## What a human still needs to do

- Read and rewrite all four pieces in their own voice. Remove anything you would not say yourself.
- Confirm every number against the live status page on posting day.
- Decide whether and when to post anywhere. Nothing has been scheduled.
- Decide whether to name themselves. These drafts deliberately do not.
- Check each claim against the repository. If this briefing disagrees with the repository, trust the repository.
