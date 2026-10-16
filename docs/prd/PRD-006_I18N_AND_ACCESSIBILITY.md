# PRD-006 — EN/ID and Accessibility

**Priority:** P0 across every release. Contract details in `docs/07_I18N.md`.

## Requirements

- Default English; Indonesian selectable; persisted; English fallback.
- All copy (errors, consent, onboarding, empty, guard states) localized with typed keys.
- Keyboard-operable controls, accessible names, visible focus.
- Side panel usable at 320px without overflow.
- Real timestamps only, formatted with explicit locale; timezone labeled.
- Status never conveyed by color alone (icon + text).
- Respect `prefers-reduced-motion` for XP and streak animations.

## Acceptance criteria

1. Switching EN/ID updates visible UI immediately.
2. Reload keeps the language.
3. Parity test passes; missing `id` key fails typecheck.
4. Keyboard-only walkthrough of every view succeeds (v0.9).
5. Contrast meets WCAG AA for text in both themes (v0.9).
6. Native Indonesian review done before v1.0.
