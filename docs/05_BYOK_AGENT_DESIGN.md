# BYOK Learning AI and Future Agent Design

**Status:** BYOK study (ML-007/008/009) implemented in v0.8 (D-018): `src/shared/ai/` (providers, prompt, documents/retrieval), `src/background/ai.ts` (keys, prepare/send), `src/sidepanel/pdf.ts` and `components/AiStudy.tsx`. The tool-based agent below is still specification only and **post-v1** (D-008). The assessment guard (ML-022) gates every AI request.

## Provider model

Supported future configurations:

- OpenAI (user-supplied key, explicitly selected model / endpoint).
- Gemini (user-supplied key, explicitly selected model / endpoint).
- OpenAI-compatible Chat Completions providers with fixed endpoints: DeepSeek, Qwen (Model Studio international), Kimi (Moonshot global), Command Code, SumoPod (D-019).
- Ollama local (loopback endpoint, user-managed local service; Chrome permission/CORS review needed). Deferred past v0.8 (D-018).

API keys are provided **by the student**. They must never be shipped in the bundle, logged, transmitted to content scripts, or saved in an ordinary `.env` file in a distributable extension. Default future policy: use `chrome.storage.session` and provide `Forget key` / `Clear session`. Persistent key storage, if ever offered, must have explicit warning and additional review.

## User consent before AI use

Ask user to select a provider and a specific course document/chunk. Show exactly what will be transmitted, where it will go, and for what purpose, with **Cancel** and **Continue**. Do not automatically send an entire course or page body. Disclose provider-specific privacy/data retention practices accurately and separately from extension-local processing.

## RAG minimum viable design

1. Explicit document selection -> browser fetch/download with user authorization.
2. Local extraction: PDF.js in the extension package (no remotely hosted worker), plain text where possible; warn for scanned PDFs and extraction errors.
3. Sanitize for length, PII, malicious HTML and prompt injection. Documents are **data**, not trusted instructions.
4. Split into small overlapping chunks; retain course / document / page / offset metadata.
5. Start with keyword retrieval; add embeddings/hybrid search only after retrieval evaluation.
6. Return explanation with source document and page/section. If evidence is insufficient, say so.
7. Local cache expiration/clear controls, per-course separation and opt-in retention.

## Student learning features

- Sourced short/long summary and concept explanations.
- Flashcards and low-stakes practice quizzes based only on selected study materials.
- Forum **idea outlines / drafts** requiring a student's review and submission on the LMS itself.
- Tone/language preference EN/ID independent from coding language.
- No direct assistance to answer or auto-submit an active graded assessment.

## Tool registry for later autonomous agent

| Tool | Risk | Default |
|---|---|---|
| `getCurrentCourse` | read | user initiated |
| `listVisibleActivities` | read | user initiated |
| `getProgressSnapshot` | read | user initiated |
| `searchSelectedDocuments` | read | with document consent |
| `proposeStudyPlan` | propose | draft only |
| `openActivity` | navigation | user confirmation/click |
| `downloadSelectedResource` | local side effect | explicit click and filename preview |
| `markActivityComplete` | Moodle write | BLOCKED |
| `submitAttendance` | Moodle write | BLOCKED |
| `postForumResponse` | Moodle write | BLOCKED |
| `answerOrSubmitGradedQuiz` | graded assessment | BLOCKED |

## Agent orchestration

- Planner generates candidate read/propose tool calls (typed JSON); rule-based executor validates tool allowlist, schema, user interaction and allowed URL before action.
- UI displays an approval card for any permitted state-changing step. No hidden tool chaining.
- Limit tool count, tokens, timeout, request size and budget. Bound per-provider retries/rate limits.
- Record only non-sensitive local audit event metadata (not prompts, keys or course content by default).
- Treat provider output as untrusted: never execute JS, HTML, URLs or tool arguments without independent validation.

## Acceptance gate for phase 4/5

Document retrieval tests, citation recall checks, opt-in provider consent, fail-closed assessment detection, host-permission prompts, storage review, predictable error states, EN/ID parity, clear-data UI and security review completed.
