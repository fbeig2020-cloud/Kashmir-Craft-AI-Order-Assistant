# STORY-015 — Optimize Customer Support Screens for Efficiency

As a customer support agent, I want to complete primary actions on screens in three clicks or fewer, so that I can assist customers efficiently.

**Release:** r4 · User Experience and Performance (weeks 5–6)
**Owner:** Customer Support Team
**Blocked by:** STORY-009

## The requirement this satisfies

- **REQ-013** (Non-functional, must) — Every screen the customer support team uses must complete its primary action in three clicks or fewer.

## How to build it

Review all customer support screens and streamline workflows to ensure primary actions are completed in three clicks or fewer. Implement logging for click counts on actions.

## Failure paths you must handle

- Primary action takes more than three clicks
- Notification for excessive clicks does not appear
- Click count logging fails

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given a customer support screen, when I perform the primary action, then it completes in three clicks or fewer.
- [ ] Given a customer support screen, when I attempt to perform an action that requires more than three clicks, then I receive a notification to streamline the process.
- [ ] Trust: Every action performed is logged with the number of clicks for audit.

When every box above is ticked, stop and show the demo.
