# STORY-013 — Identify Inventory Issues

As a system, I want to identify inventory issues from the online data source, so that I can alert the inventory management team.

**Release:** r1 · Evidence Gathering and Recommendation (weeks 2–2)
**Owner:** Inventory Management System
**Blocked by:** STORY-012

## The requirement this satisfies

- **REQ-003** (Functional, must) — The system must identify inventory issues from the online data source.

## How to build it

Connect to the online data source and implement checks for inventory thresholds. Log identified issues in the inventory_issues table.

## Failure paths you must handle

- Data source unavailable
- Incorrect threshold detection
- Issue not logged

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given the online data source, when inventory levels fall below threshold, then the system identifies an issue.
- [ ] Given the online data source, when inventory data is missing, then the system logs an error.
- [ ] Trust: Every identified inventory issue is logged with details and timestamp.

When every box above is ticked, stop and show the demo.
