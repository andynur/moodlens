# Feature Backlog and Scope Control

Definitions: **Done** = merged, tested, verified on a real site; **Provisional** = implemented against fixtures/assumptions; **Planned** = specified, not implemented; **Blocked** = needs evidence or a decision; **Post-v1** = out of v1.0 scope.

| ID | Feature | Priority | Target | Status | PRD | Dependency |
|---|---|---|---|---|---|---|
| ML-001 | MV3 side panel, EN/ID, theme | P0 | v0.2 | Provisional | PRD-001 | Typecheck/build green |
| ML-002 | Course page DOM parser (fallback) | P0 | v0.2 | Provisional | PRD-002 | Sanitized SiberMu fixture |
| ML-003 | Completion status with `unknown` | P0 | v0.2 | Provisional | PRD-002 | Fixture with manual + auto completion |
| ML-023 | Clear data (v0.2), export/import backup (v0.5) | P0 | v0.2/v0.5 | Planned | PRD-001 | — |
| ML-013 | Multi-instance support | P0 | v0.3 | Planned | PRD-007 | D-002 |
| ML-024 | Onboarding and site enablement UX | P0 | v0.3 | Planned | PRD-007 | ML-013 |
| ML-014 | Read-only Moodle AJAX client | P0 | v0.4 | Implemented; live QA pending | PRD-008 | D-003, security review |
| ML-015 | Task and deadline tracker, `.ics` export | P0 | v0.4 | Implemented; calendar import QA pending | PRD-008 | ML-014 |
| ML-005 | Attendance insight (verified data only) | P1 | v0.4 | Blocked | PRD-008 | Evidence that attendance events reach calendar/timeline |
| ML-011 | Opt-in local notifications | P1 | v0.4 | Implemented; restart QA pending | PRD-008 | ML-015, `alarms` + optional `notifications` |
| ML-004 | Today dashboard | P0 | v0.5 | Planned | PRD-009 | ML-015 |
| ML-016 | Personalization: pin, color, nickname, hide | P1 | v0.5 | Planned | PRD-009 | ML-013 |
| ML-017 | What's new since last visit | P1 | v0.5 | Planned | PRD-009 | Snapshot history |
| ML-018 | Moodle page appearance (dark mode, reading comfort) | P1 | v0.5 | Planned | PRD-009 | Opt-in CSS injection |
| ML-022 | Assessment guard (fail-closed) | P0 | v0.6 | Planned | PRD-010 | Before ML-020 and ML-009 |
| ML-019 | Flashcards with spaced repetition | P1 | v0.6 | Planned | PRD-010 | IndexedDB design |
| ML-020 | Practice from closed quiz reviews | P1 | v0.6 | Planned | PRD-010 | ML-022, D-009, review page fixture |
| ML-021 | Local XP, streaks, goals | P1 | v0.6 | Planned | PRD-010 | D-006 |
| ML-026 | Focus timer, notes per activity | P2 | v0.6 | Planned (cut if late) | PRD-010 | — |
| ML-025 | Chrome Web Store release package | P0 | v0.7/v1.0 | Planned | PRD-011 | D-001 trademark review |
| ML-007 | Local PDF extraction (PDF.js) | P1 | v0.8 | Planned (cut line) | PRD-004 | ML-022 |
| ML-008 | BYOK provider setup and consent | P1 | v0.8 | Planned (cut line) | PRD-004 | Security review |
| ML-009 | Cited AI summary, Q&A, generated practice | P1 | v0.8 | Planned (cut line) | PRD-004 | ML-007, ML-008 |
| ML-006 | Resource download manager | P2 | Post-v1 | Post-v1 | PRD-003 | D-008 |
| ML-010 | Level Up! XP display (read-only) | P2 | Post-v1 | Blocked | — | `block_xp` present on SiberMu; student-visible data not yet captured |
| ML-012 | Tool-based study agent | P2 | Post-v1 | Post-v1 | PRD-005 | D-008 |
| ML-027 | Grade what-if calculator | P2 | Post-v1 | Post-v1 | — | Grade data privacy review |

## Priority rules

- **P0** blocks the release it targets.
- **P1** ships in its target release unless it threatens the release date; then it moves one release later with a note in `docs/08_ROADMAP.md`.
- **P2** is cut first.

## Permanent defer list

Vector DB, automatic completion, autonomous attendance, quiz answer extraction during attempts, shared question banks, unsupervised course crawling, developer backend, telemetry.
