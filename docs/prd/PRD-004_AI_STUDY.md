# PRD-004 — BYOK Study Assistant with Cited Answers

**Features:** ML-007, ML-008, ML-009. **Priority:** P1. **Release:** v0.8, behind the v1 cut line (D-007).

## Outcome

A student selects a course document and gets cited summaries, answers and practice material in English or Indonesian, using their own provider key.

## Dependencies

ML-022 assessment guard (v0.6), IndexedDB store (v0.6), security review.

## Requirements

- Providers: OpenAI, Gemini, optional Ollama (loopback). Student enters key; stored in `chrome.storage.session`; "Forget key" always visible.
- Provider origin requested as optional host permission when chosen.
- PDF.js packaged locally; extract text with page numbers; warn on scanned PDFs.
- Consent screen before every new document transfer: provider, destination URL, what text, purpose. Cancel and Continue.
- Keyword retrieval over local chunks; answers cite document and page or say evidence is insufficient.
- Generate flashcards and practice questions from selected material into the PRD-010 deck system.
- Forum help limited to idea outlines that the student writes and submits themselves.
- Token and cost hints; clear error states.

## Acceptance criteria (gates for the cut line)

1. Zero provider requests before affirmative consent (test + network check).
2. Destination and transferred text visible before sending.
3. Every knowledge answer has page citations or an "insufficient evidence" message.
4. Errors handled: scanned PDF, missing pages, rate limit, bad key, provider down, permission refused.
5. Guard active on assessment pages: AI UI disabled, no requests.
6. Prompt-injection corpus (instructions inside PDFs) does not change system behavior.
7. EN/ID strings and privacy disclosure complete.

If any gate fails at the v0.8 deadline, ship v1.0 with AI disabled by build flag.

## Non-goals

Guaranteed correctness, covert exam help, sending whole courses, persistent keys in v1.
