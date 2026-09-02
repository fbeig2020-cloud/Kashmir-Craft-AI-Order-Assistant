# STORY-004 — Recommend Actions for Payment Failures

As a customer support agent, I want the system to recommend actions for payment failures so that I can resolve them efficiently.

**Release:** r1 · Evidence Gathering and Recommendation (weeks 2–2)
**Owner:** Customer Support Team
**Blocked by:** STORY-003

## The requirement this satisfies

- **REQ-006** (Functional, must) — The system must recommend an action for each order issue.

## How to build it

Implement recommendation engine for payment failures.

## Failure paths you must handle

- Recommendation engine failure
- Incorrect recommendations
- Notification failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a payment failure, when an action is recommended, then it appears in the action list.
- [ ] Given a payment failure, when no recommendation is possible, then a notification is sent.
- [ ] Trust: All recommendations are logged with rationale.

When every box above is ticked, stop and show the demo.
