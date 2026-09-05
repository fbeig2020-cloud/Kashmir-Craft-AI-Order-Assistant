# STORY-002 — Log Actions for Audit

As a system auditor, I want all actions logged so that I can review them for compliance.

**Release:** r0 · Initial Skeleton (weeks 1–1)
**Owner:** System Auditor
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-015** (Safety, must) — The system must log all actions and decisions for audit purposes.

## How to build it

Set up logging mechanism to record all actions and decisions.

## Failure paths you must handle

- Logging system failure
- Incomplete logs
- Timestamp errors

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [x] Given an action is taken, when it is logged, then it appears in the audit trail.
- [x] Given an action is taken, when logging fails, then an alert is generated.
- [x] Trust: All actions are logged with timestamps.

When every box above is ticked, stop and show the demo.
