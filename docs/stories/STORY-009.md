# STORY-009 — Provide Summary of Prepared Actions

As a customer support agent, I want to see a summary of prepared actions so that I can review them before execution.

**Release:** r4 · User Experience and Performance (weeks 5–6)
**Owner:** Customer Support Team
**Blocked by:** STORY-008

## The requirement this satisfies

- **REQ-011** (Functional, must) — The system must provide a summary of actions prepared before execution.

## How to build it

Develop summary generation for prepared actions.

## Failure paths you must handle

- Summary generation failure
- Incorrect summary
- Alert failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given actions are prepared, when a summary is generated, then it is displayed to the agent.
- [ ] Given actions are prepared, when summary generation fails, then an alert is generated.
- [ ] Trust: All summaries are logged with action details.

When every box above is ticked, stop and show the demo.
