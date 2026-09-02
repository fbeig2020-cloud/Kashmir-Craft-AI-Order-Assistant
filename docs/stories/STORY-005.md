# STORY-005 — Assess Risk of Recommended Actions

As a customer support agent, I want to assess the risk of recommended actions so that I can decide on approvals.

**Release:** r2 · Risk Assessment and Approval (weeks 3–3)
**Owner:** Customer Support Team
**Blocked by:** STORY-004

## The requirement this satisfies

- **REQ-007** (Functional, must) — The system must check the risk level of each recommended action.

## How to build it

Develop risk assessment logic for recommended actions.

## Failure paths you must handle

- Risk assessment failure
- Incorrect risk levels
- Logging failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a recommended action, when risk is assessed, then it is displayed with the action.
- [ ] Given a recommended action, when risk assessment fails, then an alert is generated.
- [ ] Trust: All risk assessments are logged with action details.

When every box above is ticked, stop and show the demo.
