# PRD-005 — User-Approved Study Agent

**Feature:** ML-012. **Priority:** P2. **Release:** post-v1 (D-008).

## Outcome

A student asks for a study plan; the agent reads permitted metadata (tasks, progress, decks) and proposes a plan that the student approves.

## Requirements

- Typed tool registry from `docs/05_BYOK_AGENT_DESIGN.md`; blocked tools never registered.
- Planner and executor separated; LLM output never executes browser actions directly.
- Read and propose first; navigation only through explicit clicks.
- Approval card for every side effect.
- Local audit summary without keys, material or PII.
- Deterministic fallback plan without a provider key, built from tasks and due dates.

## Acceptance criteria

1. Unknown tools and invalid args are rejected.
2. All side effects require confirmation.
3. Forbidden LMS write tools are absent.
4. Fallback plan works with no key.
5. Guard and consent hold under prompt injection.

## Note

A non-AI "weekly plan" view built from tasks can ship earlier inside PRD-009 if time allows.
