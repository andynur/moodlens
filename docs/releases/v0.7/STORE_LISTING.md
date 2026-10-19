# Chrome Web Store Listing Draft — v0.7 Closed Beta

Dashboard-ready copy for the first beta submission. Use **Private / trusted testers** for the initial ten-person cohort; use **Unlisted** only if link-based installation is intentionally acceptable. Both modes receive the same Chrome Web Store policy review.

## Shared settings

- **Name:** Moodlens
- **Fallback name if written trademark permission is absent:** BelajarLens (see `TRADEMARK_REVIEW.md`)
- **Primary category:** Education
- **Primary language:** English
- **Visibility:** Private / trusted testers
- **Support URL:** `https://github.com/andynur/moodlens/issues`
- **Privacy policy URL after push:** `https://github.com/andynur/moodlens/blob/main/PRIVACY.md`
- **Homepage:** `https://github.com/andynur/moodlens`
- **Independent-project disclaimer:** Independent project. Not affiliated with or endorsed by Moodle Pty Ltd or any university.

## Single purpose

> A local-first study companion that organizes courses, deadlines, progress and private practice from Moodle course sites the student chooses to enable.

Every shipped feature supports that purpose: read-only course capture, Today and Tasks organization, reminders and calendar export, local flashcards and practice, study notes, focus sessions, appearance preferences and local motivation.

## English listing

### Short description

> Organize Moodle courses, deadlines and private study practice in one local-first side panel.

### Detailed description

> Moodlens is a bilingual, local-first study companion for Moodle course sites you choose to enable.
>
> See what needs attention without changing Moodle:
>
> - Bring courses and deadlines from enabled sites into one Today and Tasks view.
> - Pin, rename, color and hide courses locally.
> - Track what changed since your last visit.
> - Export deadlines to an `.ics` calendar and turn on optional local reminders.
> - Create private flashcard decks with spaced repetition.
> - Save mistakes from your own finished quiz review when Moodle already shows the answer.
> - Use local XP, streaks, focus sessions and per-activity notes.
> - Adjust enabled Moodle pages with opt-in dark mode, larger text and a comfortable reading width.
>
> Privacy and control:
>
> - No Moodlens account, backend, advertising, analytics or telemetry.
> - Study data stays in your browser.
> - Access is requested for one HTTPS Moodle site at a time after you click Enable.
> - Removing a site revokes its access and deletes its local Moodlens data.
> - Open source, with a public privacy policy and security design.
>
> Integrity first:
>
> - Read-only toward Moodle: Moodlens never submits, posts, marks complete or changes Moodle data.
> - The assessment guard pauses study help during active assessments and fails closed.
> - Quiz-derived practice cards stay on the device and cannot be exported or backed up.
>
> English and Bahasa Indonesia are included.
>
> Optional AI study is on the roadmap and is **not included in this beta**.
>
> Independent project. Not affiliated with or endorsed by Moodle Pty Ltd or any university.

## Indonesian listing / Daftar Bahasa Indonesia

### Deskripsi singkat

> Atur mata kuliah Moodle, tenggat, dan latihan privat dalam satu panel samping yang lokal.

### Deskripsi lengkap

> Moodlens adalah pendamping belajar dwibahasa dan lokal untuk situs mata kuliah Moodle yang Anda pilih untuk diaktifkan.
>
> Lihat hal yang perlu diperhatikan tanpa mengubah Moodle:
>
> - Satukan mata kuliah dan tenggat dari situs aktif dalam tampilan Hari ini dan Tugas.
> - Sematkan, beri nama panggilan, warna, dan sembunyikan mata kuliah secara lokal.
> - Lacak perubahan sejak kunjungan terakhir.
> - Ekspor tenggat ke kalender `.ics` dan aktifkan pengingat lokal opsional.
> - Buat deck kartu belajar privat dengan pengulangan terjadwal.
> - Simpan kesalahan dari tinjauan kuis milik Anda yang telah selesai ketika Moodle sudah menampilkan jawabannya.
> - Gunakan XP lokal, rentetan harian, sesi fokus, dan catatan per aktivitas.
> - Sesuaikan halaman Moodle aktif dengan mode gelap, teks lebih besar, dan lebar baca yang nyaman.
>
> Privasi dan kendali:
>
> - Tanpa akun Moodlens, backend, iklan, analitik, atau telemetri.
> - Data belajar tetap berada di browser Anda.
> - Akses diminta untuk satu situs Moodle HTTPS setiap kali setelah Anda mengeklik Aktifkan.
> - Menghapus situs mencabut akses dan menghapus data lokal Moodlens untuk situs tersebut.
> - Sumber terbuka, dengan kebijakan privasi dan desain keamanan publik.
>
> Mengutamakan integritas:
>
> - Baca-saja terhadap Moodle: Moodlens tidak pernah mengirim, memposting, menandai selesai, atau mengubah data Moodle.
> - Pengaman penilaian menjeda bantuan belajar selama penilaian aktif dan gagal secara tertutup.
> - Kartu latihan turunan kuis tetap di perangkat serta tidak dapat diekspor atau dicadangkan.
>
> Tersedia dalam English dan Bahasa Indonesia.
>
> Fitur belajar AI opsional ada di roadmap dan **belum disertakan dalam beta ini**.
>
> Proyek independen. Tidak berafiliasi dengan atau didukung oleh Moodle Pty Ltd maupun universitas mana pun.

## Permission justifications

Paste these into the corresponding dashboard fields.

### `storage`

Moodlens saves the student's language, theme, enabled-site registry, dashboard preferences, bounded course/task snapshots, reminder choices and local study progress in Chrome extension storage. The data is used only for the visible study-companion features and is not sent to the developer.

### `sidePanel`

Moodlens's primary interface is a Chrome side panel so students can view their study dashboard beside an open course without replacing or modifying the Moodle page.

### `scripting`

After the student explicitly enables one Moodle origin, Moodlens registers its packaged read-only course reader and, when selected, its packaged appearance stylesheet for that origin. It never injects remote code.

### `alarms`

Moodlens uses local Chrome alarms to recreate opted-in deadline reminders after browser restart and to finish a student-started focus session. Alarms never poll Moodle or contact a server.

### Optional `notifications`

Requested only when the student turns reminders on. It displays local deadline reminders generated from the student's stored task list. The feature remains off if permission is declined.

### Optional host access `https://*/*`

Moodle can be hosted on many HTTPS domains, so the manifest declares a broad optional pattern. Moodlens requests access to only one student-entered Moodle origin after the student clicks Enable and Chrome shows its permission prompt. There are no static host permissions, and removing the site revokes access.

### Optional AI provider hosts

Not declared in v0.7. AI is not shipped in this beta.

## Privacy practices dashboard

Answer from the shipped v0.7 behavior, including local processing:

| Dashboard data type | Answer | Explanation |
|---|---|---|
| Personally identifiable information | No | Moodlens has no account and does not intentionally read names, email addresses or student identifiers. |
| Health information | No | Not used. |
| Financial and payment information | No | Not used. |
| Authentication information | Yes, handled transiently | The content script reads a Moodle `sesskey` from the open enabled page for one same-site read-only request. It is never stored, messaged, logged or sent to the developer. Passwords and cookies are never read. |
| Personal communications | No | Messages and forum content are not read. |
| Location | No | Not used. |
| Web history / browsing activity | Yes, limited | Enabled Moodle origins and course/activity URLs are handled only to provide navigation and the visible course/task features. They stay local. |
| Website content | Yes | Bounded course names, activities, completion states, deadlines and finished-review practice fields are read from enabled Moodle sites and stored locally for the disclosed features. |
| User activity | Yes, limited | Local study actions such as card reviews, focus sessions, notes and dashboard choices are stored only to provide those features. |

Data usage declarations:

- Not sold to third parties.
- Not used or transferred for purposes unrelated to Moodlens's single purpose.
- Not used or transferred to determine creditworthiness or for lending.
- Not used for personalized advertising.
- No humans read user data; Moodlens has no developer backend. A user may voluntarily include sanitized information in a GitHub issue.
- All network access is HTTPS and limited to the student-selected Moodle origin in v0.7.

Limited Use certification statement:

> Moodlens's use of information received through Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. Moodlens uses user data only to provide or improve its disclosed study-companion purpose and does not sell it, use it for advertising or credit decisions, or permit human access except with explicit user consent or when required for security or law.

## Graphic assets

- Store icon: `store-assets/icon-128.png`
- Small promo tile: `store-assets/promo-440x280.png`
- English screenshots: `store-assets/en/01-today-1280x800.png`, `02-tasks-1280x800.png`, `03-practice-1280x800.png`
- Indonesian screenshots: matching files under `store-assets/id/`
- Every screenshot uses synthetic course and site data only.

## Submission notes

- The listing title remains Moodlens only after written trademark permission; otherwise activate the BelajarLens fallback before upload.
- Do not use the owner-facing tagline “All in One Moodle AI Agent for Student” as a shipped-feature claim. AI must remain explicitly labeled “coming soon” until PRD-004 gates pass.
- For a separate beta item published alongside a production item, append `BETA` to the name and start the description with `THIS EXTENSION IS FOR BETA TESTING`, per Chrome's distribution guidance.
- Select Limited Use certification only after comparing the final ZIP, policy URL and dashboard answers to this file.
