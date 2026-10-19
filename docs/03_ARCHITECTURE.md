# Technical Architecture

Target architecture for v1.0. Sections marked *(v0.x)* arrive in that release; see `docs/08_ROADMAP.md`.

## Runtime topology

```text
Student-enabled Moodle site (origin granted at runtime, D-002)
  -> content/index.ts (registered dynamically per origin)
     -> moodle/detect.ts        is this Moodle? version hints           (v0.3)
     -> moodle/ajax.ts          allowlisted read-only service.php calls (v0.4, D-003)
     -> moodle/adapter.ts       DOM parser fallback / course details
     -> moodle/guard.ts         assessment guard, fail-closed           (v0.6)
     -> normalized, validated payloads only
     -> chrome.runtime.sendMessage({ type, siteId, payload })
  -> background/index.ts (MV3 service worker, stateless between events)
     -> validates sender origin against site registry + payload shape
     -> storage layer (chrome.storage.local + IndexedDB)
     -> alarms for reminders (v0.4)
  -> sidepanel/ (React)
     -> views: Today, Tasks, Courses, Practice, Study AI, Settings
     -> reads storage, subscribes to changes, sends user commands
```

## Source layout (target)

```text
src/
  background/      message router, site registry, alarms, storage migrations
  content/
    index.ts       entry, observer, message sending
    moodle/        detect.ts, ajax.ts, adapter.ts, guard.ts, appearance.ts
  shared/          types.ts, validation.ts, i18n/ (en.ts, id.ts), messages.ts, days.ts, xp.ts, srs.ts, cards.ts
  sidepanel/       App.tsx, views/, components/, hooks/
  shared/ai/       (v0.8) providers.ts, prompt.ts, documents.ts (chunks, retrieval), flag.ts
  background/ai.ts (v0.8) session keys, prepare (consent preview) and one-time send
  sidepanel/pdf.ts (v0.8) PDF.js extraction; components/AiStudy.tsx, AiSettings.tsx
tests/
  fixtures/        sanitized HTML and JSON per site variant
```

## Bundle design

- Vite builds `sidepanel.html` and React assets.
- esbuild builds `background.js` and `content.js` as IIFE.
- `scripts/build-extension.mjs` writes `dist/manifest.json` with the version from `package.json` (v0.2).
- PDF.js worker is packaged locally in v0.8; no remote code.

## Permissions plan

| Permission | Release | Reason |
|---|---|---|
| `storage` | v0.1 | Preferences, snapshots, site registry |
| `sidePanel` | v0.1 | Main UI |
| `scripting` | v0.3 | Register content scripts for enabled origins |
| `optional_host_permissions: https://*/*` | v0.3 | Request one Moodle origin at a time, on user click |
| `alarms` | v0.4 | Local reminders |
| optional `notifications` | v0.4 | Requested only when the student turns reminders on |
| optional provider origins | v0.8 | the chosen provider's fixed origin (`PROVIDER_INFO` in `src/shared/ai/providers.ts`: OpenAI, Gemini, DeepSeek, Qwen, Kimi, Command Code, SumoPod; D-019), covered by the optional `https://*/*` entry; requested on the consent screen's Continue click |

No `<all_urls>`, no `tabs`, no `cookies`, no `webRequest`, no `downloads` in v1.

## Data boundaries

| Boundary | Allowed | Forbidden |
|---|---|---|
| Moodle page -> content | visible metadata, allowlisted AJAX read responses, `sesskey` used in memory once per call | cookies, passwords, other students' data, write functions |
| content -> background | validated normalized records (courses, activities, tasks, completion) | `sesskey`, raw HTML, raw AJAX responses, API keys |
| background -> storage | preferences, site registry, normalized records, Moodlens data (XP, cards, notes) | API keys in `local`, raw PDFs in `chrome.storage` |
| sidepanel -> browser | user-triggered navigation to validated LMS URLs, `.ics` download | LMS writes |
| ai -> provider (v0.8) | user-selected chunks after consent | full course, identifiers, cookies |

## Storage plan

- `chrome.storage.local`, keyed by site: `sites`, `site:<id>:lastCourseSnapshot`, `site:<id>:snapshots` (what's new records per course), `site:<id>:courses` (personalization per course), `site:<id>:tasks`, global `locale`, `theme`, `onboarded`, `dashboard`, `xp`. Access level `TRUSTED_CONTEXTS`. Backup export is allowlist-based (`src/shared/backup.ts`).
- `chrome.storage.session`: BYOK keys (v0.8), short-lived caches.
- IndexedDB (v0.6, D-014): database `moodlens-study` v1 with stores `decks`, `cards`, `reviewLogs` (`src/background/studyStore.ts`). Every record carries `siteId` and a `bySite` index; site removal and clear-all delete by index. Caps per site: 200 decks, 10,000 cards, 50,000 review logs. Review logs kept 90, 365 (default) or 730 days. Schema v2 adds `notes` (ML-026, indexes `bySite` and `byCourse`); PDF chunks (v0.8) add stores in later schema versions. The focus timer session is a `chrome.storage.local` key (`focus`) with the `moodlens-focus` alarm.
- Storage schema has a `schemaVersion` and a migration function in background (v0.3).
- Size caps per site; oldest snapshots pruned (keep last 2 per course for diff).

## Core data types (v0.4 target)

```ts
interface Site { id: string; origin: string; label: string; enabledAt: string; moodleVersion?: string }
interface Course { siteId: string; id: string; name: string; shortName?: string; visible: boolean; progress?: number }
interface Task {
  siteId: string; courseId: string; activityId?: string;
  kind: 'assign' | 'quiz' | 'attendance' | 'forum' | 'event' | 'other';
  title: string; dueAt?: string; url: string;
  status: 'open' | 'overdue' | 'done' | 'unknown';
  source: 'ajax' | 'dom';
}
```

`dueAt` is set only from Moodle timestamps. `status: 'done'` only from Moodle evidence.

## Messaging

- All messages defined in `src/shared/messages.ts` as a discriminated union with runtime guards.
- Content messages: accepted only when `sender.tab` exists and `sender.origin` is in the site registry.
- UI messages: accepted only from extension pages (`!sender.tab`, `sender.id === chrome.runtime.id`).
- Payload length and array caps enforced in guards.

## Service worker lifecycle

No critical state in globals. Rehydrate from storage on each event. Alarms recreated on startup from stored reminders.

## AI boundaries (v0.8)

```text
Explicit selection + consent -> local PDF.js extraction -> sanitize -> chunk
  -> keyword retrieval -> cited evidence -> chosen provider (BYOK) -> answer with citations or "insufficient evidence"
```

- PDF text and chunks live only in side panel memory; nothing is written to IndexedDB (no opt-in retention yet).
- `AI_PREPARE` builds the exact prompt and stores it in `chrome.storage.session` under a one-time nonce (10-minute TTL); the panel shows it. `AI_SEND` carries only the nonce, so the text sent is the text shown. Both steps re-check the guard; send also checks the host permission, the key and a 6 requests/minute limit, and runs outside the serialized message queue.
- Replies are parsed as JSON; citations must name an excerpt that was sent, otherwise the result is "insufficient evidence". Generated cards become student cards only after the student keeps them.
- Build flag: `MOODLENS_AI=off` builds with every AI control hidden and every AI message refused (D-007).

Tool registry for the post-v1 agent stays in `docs/05_BYOK_AGENT_DESIGN.md`.
