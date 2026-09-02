# STORY-001 — Identify Duplicate Orders

As a customer support agent, I want to identify duplicate orders so that I can prevent processing errors.

**Release:** r0 · Initial Skeleton (weeks 1–1)
**Owner:** Customer Support Team
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-001** (Functional, must) — The system must identify duplicate orders from the online data source.
- **REQ-015** (Safety, must) — The system must log all actions and decisions for audit purposes.

## How to build it

Implement order scanning logic to detect duplicates from the online data source.

## Failure paths you must handle

- Failure to detect duplicates
- Incorrect duplicate detection
- Logging failure

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given an order submission, when a duplicate order is detected, then log the detection.
- [ ] Given an order submission, when no duplicate is found, then log the result.
- [ ] Trust: All duplicate detections are logged for audit.

When every box above is ticked, stop and show the demo.
