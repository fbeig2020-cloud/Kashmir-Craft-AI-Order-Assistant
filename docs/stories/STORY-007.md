# STORY-007 — Verify Outcome of Actions

As a customer support agent, I want to verify the outcome of actions so that I can confirm their success.

**Release:** r3 · Outcome Verification and Processing Control (weeks 4–4)
**Owner:** Customer Support Team
**Blocked by:** STORY-006

## The requirement this satisfies

- **REQ-009** (Functional, must) — The system must verify the outcome of each action taken.

## How to build it

Develop outcome verification process for actions.

## Failure paths you must handle

- Verification process failure
- Incorrect outcome logging
- Alert failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given an action is taken, when the outcome is verified, then it is logged as successful or failed.
- [ ] Given an action is taken, when verification fails, then an alert is generated.
- [ ] Trust: All outcomes are logged with verification details.

When every box above is ticked, stop and show the demo.
