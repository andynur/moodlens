# v0.9 Indonesian (ID) Review

Date: 2026-10-20
Status: **done.** Agent pre-review below; the owner, a native Indonesian speaker, accepted the Indonesian text as is on 2026-10-20. The reviewer sheet stays for later wording passes.

## Automated checks (agent)

- Key parity: `en`/`id` in `src/shared/i18n/` (256 keys after cleanup), `src/sidepanel/aiStrings.ts` (67 keys plus 12 error codes) and `src/sidepanel/taskStrings.ts` (34 keys). No missing key, no empty value, every `{placeholder}` matches.
- Register: no "Anda" anywhere in UI strings; "kamu"/"-mu" throughout.
- Strings identical in both languages are proper names or loanwords Moodle itself uses in Indonesian: Moodlens, Forum, Folder, Level, Model.
- 320 px layout with the longer Indonesian labels: no overflow on any side panel screen (`docs/releases/v0.9/ACCESSIBILITY.md`).

## Changes made in this pass

| Key | Before | After | Why |
|---|---|---|---|
| `reviewToday`, `startReview` (removed, unused), `reviewFinished`, `reviewEmpty`, `studyRetention*`, `deleteDeckConfirm`, `flashcardsHint`, `streakEmpty` | "ulangan" | "ulas" / "ulasan kartu" | "Ulangan" usually means a class test; next to the assessment guard it could read as "today's test". |
| `dueCount` | "jatuh tempo" | "perlu diulas" | "Jatuh tempo" is a payment term; elsewhere deadlines are "tenggat". |
| `guardReasonQuizReview`, `practiceOffer`, `practiceSaveError`, `flashcardsHint` | "ulasan kuis" | "tinjauan kuis" | Matches the term Moodle and `PRIVACY.md` use for the quiz review page. |
| `guardPaused`, `guardReasonTimer`, `guardReasonUnknown` | "asesmen" | "penilaian" | One term for assessment, as in the AI strings and privacy pages. |
| `onboardingDoes1` | "kursus" | "mata kuliah" | Glossary term. |
| `dueSoon` | "Segera tenggat" | "Tenggat terdekat" | More natural heading. |
| `aiConsentDestination` | "Tujuan" | "Alamat tujuan" | "Tujuan" was also used for purpose ("Tujuan penggunaan") on the same screen. |
| `practiceOfferHint` (EN and ID) | ended with "(D-009)" | removed | Internal decision id shown to students. |
| `copyright` (EN and ID) | "Local development build" / "Versi pengembangan lokal" | "Free and open source (MIT)" / "Gratis dan sumber terbuka (MIT)" | The footer said "development build" in store builds too. |
| `currentCourse`, `ready`, `studyPlanned`, `startReview`, `viewCourse` | — | removed | Unused; `studyPlanned` also said AI was "planned", which is no longer true. |

The glossary in `docs/07_I18N.md` now lists these terms.

## Native-speaker reviewer sheet

Read every ID string in context (load the extension, switch to ID, go through each page) and answer:

1. Does any sentence sound translated rather than written in Indonesian?
2. "Rentetan" / "Rentetan hari" for a daily streak: natural, or prefer "runtutan", "beruntun", or the loanword "streak"?
3. Navigation uses short "Kuliah" and "Setelan" while page titles say "Mata kuliah" and "Pengaturan". Acceptable, or use one word each?
4. Flashcard ratings "Ulang / Sulit / Bagus / Mudah": natural for a student?
5. Tagline "Agen AI Moodle All in One untuk Mahasiswa" keeps the English "All in One". Keep for brand, or "Serba Ada"?
6. "Tanda warna", "Lebar baris nyaman", "Baca sepia", "Preset tema": clear?
7. Error messages in AI study (`errorStrings.id` in `src/sidepanel/aiStrings.ts`): clear about what to do next?
8. Consent screen: is it unmistakable that text leaves the device after "Lanjutkan dan kirim"?

Record answers and any wording changes as a PR or an issue; once accepted, tick the roadmap item.
