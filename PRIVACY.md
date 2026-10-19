# Moodlens Privacy Policy / Kebijakan Privasi Moodlens

Effective date / Tanggal berlaku: 19 October 2026 / 19 Oktober 2026

## English

Moodlens is a free, open-source Chrome extension that helps students organize information from Moodle course sites they choose to enable. Moodlens is an independent project and is not affiliated with or endorsed by Moodle Pty Ltd or any university.

### The short version

- Moodlens has no developer backend, advertising, analytics or telemetry.
- Your study data stays in Chrome's local extension storage and IndexedDB on your device.
- Moodlens reads only the Moodle sites you explicitly enable, using your existing signed-in browser session. It does not read your password or cookies.
- Moodlens never sells, rents or transfers your data for advertising, profiling or unrelated purposes.

### Data Moodlens handles

| Data | Why it is used | Storage and sharing |
|---|---|---|
| Language, theme, dashboard layout and appearance choices | Personalize the extension and enabled Moodle pages | Stored locally; not shared |
| Enabled site origin and label | Limit Moodlens to sites you chose | Stored locally; not shared |
| Course names, activities, completion states and deadlines | Show courses, Today, Tasks and changes since your last visit | Stored locally per enabled site; not shared |
| Flashcards, review history, notes, focus sessions, XP, streaks and goals | Provide local study tools | Stored locally; not shared |
| Quiz-review cards from your own finished review page | Let you privately review mistakes after an assessment | Stored locally; excluded from backup and card export; not shared |
| Reminder settings | Schedule optional local deadline notifications | Stored locally; not shared |

Moodlens does not intentionally read or store passwords, cookies, grades, messages, participant lists or other students' data. A Moodle `sesskey` may be read from the open page for one same-site, read-only request; it stays in page memory for that call and is never stored, logged or sent to another extension context.

### Network activity

Moodlens has no developer-operated server. While an enabled Moodle tab is open, it may make bounded, read-only requests to that same Moodle site's standard AJAX endpoint to obtain course and calendar information. The browser attaches your existing Moodle session; Moodlens does not extract or retain the session cookie. Moodlens does not poll Moodle while the site is closed.

The v0.7 beta contains no external AI-provider integration. If a future release adds optional AI, this policy and the in-product consent screen must be updated before any student content can be sent to a provider.

### Permissions

- `storage`: save settings and study data locally.
- `sidePanel`: show Moodlens beside the current course.
- `scripting`: install the packaged, read-only course reader and optional appearance stylesheet only on a site you enable.
- `alarms`: schedule local deadline reminders and focus-session completion.
- Optional `notifications`: show deadline reminders only after you turn reminders on.
- Optional `https://*/*` host access: Chrome can ask for one HTTPS Moodle origin at a time after you click Enable. Moodlens has no static access to every website.

### Retention, export and deletion

Course snapshots are limited to the latest two versions per course. Review-log retention is controlled by you: 90 days, 1 year or 2 years. Cards and notes remain until you delete them, their deck or their site. Removing a site deletes its local Moodlens data and revokes its host access. Settings also provides Clear all local data.

The optional JSON backup contains allowlisted settings, enabled-site metadata, course snapshots and preferences. It excludes API keys, quiz-derived cards, notes, tasks and reminders. Card export includes only cards you authored or imported, never quiz-derived cards. Calendar export creates an `.ics` file only when you request it. You decide where exported files go.

Uninstalling the extension removes its Chrome extension storage according to Chrome's behavior. Files you previously exported are outside the extension and must be deleted separately.

### Your choices

You can inspect the source, enable or remove sites individually, keep notifications off, change review-log retention, export permitted data, or erase all local data. Moodlens has no account, so the developer has no server-side profile to access, correct or delete.

### Changes and contact

Material policy changes will be recorded in the repository and extension release notes. For privacy questions, open a GitHub issue without personal or course data. For a security vulnerability, follow [`SECURITY.md`](SECURITY.md) and report it privately.

## Bahasa Indonesia

Moodlens adalah ekstensi Chrome gratis dan sumber terbuka yang membantu mahasiswa mengatur informasi dari situs mata kuliah Moodle yang mereka pilih untuk diaktifkan. Moodlens merupakan proyek independen dan tidak berafiliasi dengan atau didukung oleh Moodle Pty Ltd maupun universitas mana pun.

### Ringkasnya

- Moodlens tidak memiliki backend pengembang, iklan, analitik, atau telemetri.
- Data belajar Anda tetap berada di penyimpanan lokal ekstensi Chrome dan IndexedDB pada perangkat Anda.
- Moodlens hanya membaca situs Moodle yang Anda aktifkan secara langsung, menggunakan sesi browser yang sudah masuk. Moodlens tidak membaca kata sandi atau cookie Anda.
- Moodlens tidak pernah menjual, menyewakan, atau memindahkan data Anda untuk iklan, pembuatan profil, atau tujuan lain yang tidak terkait.

### Data yang ditangani Moodlens

| Data | Alasan penggunaan | Penyimpanan dan pembagian |
|---|---|---|
| Bahasa, tema, tata letak dasbor, dan pilihan tampilan | Menyesuaikan ekstensi dan halaman Moodle yang diaktifkan | Disimpan secara lokal; tidak dibagikan |
| Origin dan label situs yang diaktifkan | Membatasi Moodlens ke situs yang Anda pilih | Disimpan secara lokal; tidak dibagikan |
| Nama mata kuliah, aktivitas, status penyelesaian, dan tenggat | Menampilkan Mata kuliah, Hari ini, Tugas, dan perubahan sejak kunjungan terakhir | Disimpan secara lokal per situs; tidak dibagikan |
| Kartu belajar, riwayat tinjauan, catatan, sesi fokus, XP, rentetan harian, dan target | Menyediakan alat belajar lokal | Disimpan secara lokal; tidak dibagikan |
| Kartu tinjauan kuis dari halaman tinjauan milik Anda yang telah selesai | Meninjau kesalahan secara pribadi setelah penilaian | Disimpan secara lokal; tidak masuk cadangan atau ekspor kartu; tidak dibagikan |
| Pengaturan pengingat | Menjadwalkan notifikasi tenggat lokal opsional | Disimpan secara lokal; tidak dibagikan |

Moodlens tidak dengan sengaja membaca atau menyimpan kata sandi, cookie, nilai, pesan, daftar peserta, atau data mahasiswa lain. `sesskey` Moodle dapat dibaca dari halaman terbuka untuk satu permintaan baca-saja ke situs yang sama; nilainya hanya berada di memori halaman selama panggilan tersebut dan tidak pernah disimpan, dicatat, atau dikirim ke konteks ekstensi lain.

### Aktivitas jaringan

Moodlens tidak memiliki server yang dioperasikan pengembang. Saat tab Moodle yang diaktifkan terbuka, Moodlens dapat membuat permintaan baca-saja yang dibatasi ke endpoint AJAX standar pada situs Moodle yang sama untuk memperoleh informasi mata kuliah dan kalender. Browser menyertakan sesi Moodle yang sudah ada; Moodlens tidak mengambil atau menyimpan cookie sesi. Moodlens tidak melakukan polling ketika situs Moodle ditutup.

Beta v0.7 tidak berisi integrasi penyedia AI eksternal. Jika rilis mendatang menambahkan AI opsional, kebijakan ini dan layar persetujuan di dalam produk harus diperbarui sebelum konten mahasiswa dapat dikirim ke penyedia.

### Izin

- `storage`: menyimpan pengaturan dan data belajar secara lokal.
- `sidePanel`: menampilkan Moodlens di samping mata kuliah.
- `scripting`: memasang pembaca mata kuliah baca-saja dan stylesheet tampilan yang dikemas hanya pada situs yang Anda aktifkan.
- `alarms`: menjadwalkan pengingat tenggat lokal dan penyelesaian sesi fokus.
- `notifications` opsional: menampilkan pengingat tenggat hanya setelah Anda mengaktifkannya.
- Akses host `https://*/*` opsional: Chrome dapat meminta satu origin Moodle HTTPS setiap kali setelah Anda mengeklik Aktifkan. Moodlens tidak memiliki akses statis ke semua situs web.

### Retensi, ekspor, dan penghapusan

Cuplikan mata kuliah dibatasi pada dua versi terbaru per mata kuliah. Retensi log tinjauan Anda pilih sendiri: 90 hari, 1 tahun, atau 2 tahun. Kartu dan catatan tetap tersimpan sampai Anda menghapusnya, deck-nya, atau situsnya. Menghapus situs akan menghapus data lokal Moodlens untuk situs tersebut dan mencabut akses host. Pengaturan juga menyediakan Hapus semua data lokal.

Cadangan JSON opsional hanya berisi pengaturan, metadata situs aktif, cuplikan mata kuliah, dan preferensi yang diizinkan. Cadangan tidak berisi kunci API, kartu turunan kuis, catatan, tugas, atau pengingat. Ekspor kartu hanya berisi kartu yang Anda tulis atau impor, bukan kartu turunan kuis. Ekspor kalender membuat berkas `.ics` hanya saat Anda memintanya. Anda menentukan tujuan berkas hasil ekspor.

Menghapus pemasangan ekstensi akan menghapus penyimpanan ekstensi Chrome sesuai perilaku Chrome. Berkas yang sebelumnya Anda ekspor berada di luar ekstensi dan perlu dihapus secara terpisah.

### Pilihan Anda

Anda dapat memeriksa kode sumber, mengaktifkan atau menghapus situs satu per satu, membiarkan notifikasi mati, mengubah retensi log tinjauan, mengekspor data yang diizinkan, atau menghapus semua data lokal. Moodlens tidak memiliki akun, sehingga pengembang tidak memiliki profil sisi server untuk diakses, diperbaiki, atau dihapus.

### Perubahan dan kontak

Perubahan kebijakan yang penting akan dicatat di repositori dan catatan rilis ekstensi. Untuk pertanyaan privasi, buka issue GitHub tanpa data pribadi atau data mata kuliah. Untuk kerentanan keamanan, ikuti [`SECURITY.md`](SECURITY.md) dan laporkan secara privat.
