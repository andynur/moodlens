# Security Review Prompt

Audit Moodlens as a Chrome Web Store submission. First read `AGENTS.md`, `docs/06_SECURITY_PRIVACY.md`, `docs/14_DECISIONS.md` and `docs/03_ARCHITECTURE.md`.

Check:

- **Permissions:** manifest matches the permissions plan; no static host access; optional host permission requested per origin on user click; removal revokes access.
- **Context boundaries:** content scripts have no sensitive storage access; sender validation against the site registry; message guards with size caps.
- **Session AJAX (D-003):** function allowlist; write-name guard; `sesskey` never stored, messaged or logged; no background polling; rate limits; response validation; raw responses stay in the content script.
- **URL handling:** per-site allowlist, lookalike domains, redirects.
- **DOM and XSS:** no `dangerouslySetInnerHTML`; appearance CSS static.
- **Assessment guard:** fail-closed on every attempt path and state; practice capture and AI disabled.
- **Quiz-derived data (D-009):** never exported, backed up, shared or sent to providers.
- **AI (if present):** consent before transfer, visible destination, session-only keys, forget key, prompt injection from PDFs, citations.
- **Storage:** retention, pruning, clear-all, per-site deletion, IndexedDB scoping.
- **Service worker restarts and alarms.**
- **CSP and remote code.**
- **Localization of disclosure and consent screens.**
- **Store accuracy:** privacy practices tab and listing match actual behavior.

Return findings as Critical/High/Medium/Low with evidence (file:line), realistic exploit or failure mode, specific fix and a test proposal. Do not imply institutional authorization or legal compliance certification.
