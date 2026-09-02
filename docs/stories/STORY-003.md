# STORY-003 — Gather Evidence for Payment Failures

As a customer support agent, I want to gather evidence for payment failures so that I can understand the issue better.

**Release:** r1 · Evidence Gathering and Recommendation (weeks 2–2)
**Owner:** Customer Support Team
**Blocked by:** STORY-001

## The requirement this satisfies

- **REQ-002** (Functional, must) — The system must detect payment failures from the online data source.
- **REQ-005** (Functional, must) — The system must gather evidence for each identified order issue.

## How to build it

Develop evidence collection for payment failures using online data.

## Failure paths you must handle

- Evidence collection failure
- Incorrect evidence
- Storage failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a payment failure, when evidence is gathered, then it is stored for review.
- [ ] Given a payment failure, when evidence gathering fails, then an alert is generated.
- [ ] Trust: All evidence is logged with the issue details.

When every box above is ticked, stop and show the demo.
