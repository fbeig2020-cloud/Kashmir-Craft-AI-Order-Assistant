# STORY-006 — Require Approval for High-Risk Actions

As a customer support agent, I want high-risk actions to require approval so that I can ensure safety.

**Release:** r2 · Risk Assessment and Approval (weeks 3–3)
**Owner:** Customer Support Team
**Blocked by:** STORY-005

## The requirement this satisfies

- **REQ-008** (Functional, must) — The system must require human approval for high-risk actions.

## How to build it

Implement approval workflow for high-risk actions.

## Failure paths you must handle

- Approval workflow failure
- Notification failure
- Logging failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a high-risk action, when approval is required, then a notification is sent to the approver.
- [ ] Given a high-risk action, when approval is not obtained, then the action is paused.
- [ ] Trust: All approval requests are logged with timestamps.

When every box above is ticked, stop and show the demo.
