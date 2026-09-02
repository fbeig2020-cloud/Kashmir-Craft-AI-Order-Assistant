# STORY-014 — Detect Shipping Delays

As a system, I want to detect shipping delays from the online data source, so that I can notify the logistics team.

**Release:** r1 · Evidence Gathering and Recommendation (weeks 2–2)
**Owner:** Logistics Management System
**Blocked by:** STORY-012

## The requirement this satisfies

- **REQ-004** (Functional, must) — The system must detect shipping delays from the online data source.

## How to build it

Connect to the online data source and implement checks for expected shipping durations. Log detected delays in the shipping_delays table.

## Failure paths you must handle

- Data source unavailable
- Incorrect delay detection
- Delay not logged

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given the online data source, when shipping times exceed expected duration, then the system detects a delay.
- [ ] Given the online data source, when shipping data is incomplete, then the system logs an error.
- [ ] Trust: Every detected shipping delay is logged with details and timestamp.

When every box above is ticked, stop and show the demo.
