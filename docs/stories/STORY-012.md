# STORY-012 — Trigger System on Order Submission

As a system, I want to be triggered by an order submission event, so that I can start processing immediately.

**Release:** r0 · Initial Skeleton (weeks 1–1)
**Owner:** Order Processing System
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

- **REQ-012** (Functional, must) — The system must be triggered by an order submission event.

## How to build it

Implement an event listener for order submissions. Ensure the system logs each event with a timestamp and status in the order_events table.

## Failure paths you must handle

- Event not received
- Event received but not logged
- Event triggers incorrect processing

## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Given an order is submitted, when the system receives the event, then it starts processing the order.
- [ ] Given an order is submitted, when the system fails to receive the event, then it logs an error and retries.
- [ ] Trust: Every order submission event is logged with a timestamp and status.

When every box above is ticked, stop and show the demo.
