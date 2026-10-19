# Lecturer Guide / Panduan Dosen

## English

Moodlens is a student-controlled Chrome side panel that organizes information already visible to that student on Moodle. It is independent from Moodle Pty Ltd and every institution.

### Integrity safeguards

- Read-only by design: Moodlens has no feature or allowed Moodle function for submitting, posting, marking complete or changing a record.
- The assessment guard pauses study assistance during quiz attempts, timed or locked assessments, assignment editing, lessons and guarded H5P states. Unknown states fail closed.
- A student may save mistakes only from their own finished quiz review after Moodle displays the review and correct answer. Those cards stay on that device and cannot be exported or backed up.
- Moodle page content is treated as untrusted data. Moodlens extracts bounded fields and never executes page instructions.
- Moodlens XP rewards local study actions. It is clearly separate from Moodle grades and completion.

### Data and access

Students choose each Moodle origin through Chrome's permission prompt. Moodlens reads course, activity, completion and deadline information from an open, enabled site and stores a bounded local copy. It has no developer backend, telemetry or hidden background crawl. Removing a site revokes permission and deletes that site's local study data.

### What lecturers and administrators can expect

- No Moodle plugin, server integration or institution-wide installation is required.
- Moodlens does not provide lecturers with monitoring, dashboards or student data.
- Moodle remains the system of record; an `unknown` state is shown instead of guessing.
- Theme and version differences may affect read-only detection. Site compatibility reports should contain only sanitized markup, never real student or course content.

Report integrity or security concerns privately through [`SECURITY.md`](../../../SECURITY.md). General compatibility reports can use the repository's site compatibility issue template.

## Bahasa Indonesia

Moodlens adalah panel samping Chrome yang dikendalikan mahasiswa untuk mengatur informasi yang sudah terlihat oleh mahasiswa tersebut di Moodle. Moodlens independen dari Moodle Pty Ltd dan setiap institusi.

### Pengaman integritas

- Baca-saja sejak desain awal: Moodlens tidak memiliki fitur atau fungsi Moodle yang diizinkan untuk mengirim, memposting, menandai selesai, atau mengubah catatan.
- Pengaman penilaian menjeda bantuan belajar selama percobaan kuis, penilaian berwaktu atau terkunci, penyuntingan tugas, lesson, dan keadaan H5P yang dijaga. Keadaan yang tidak diketahui gagal secara tertutup.
- Mahasiswa hanya dapat menyimpan kesalahan dari tinjauan kuis miliknya yang telah selesai setelah Moodle menampilkan tinjauan dan jawaban benar. Kartu tersebut tetap di perangkat dan tidak dapat diekspor atau dicadangkan.
- Konten halaman Moodle diperlakukan sebagai data tidak tepercaya. Moodlens mengambil field yang dibatasi dan tidak pernah menjalankan instruksi dari halaman.
- XP Moodlens memberi penghargaan pada aktivitas belajar lokal. XP dinyatakan terpisah dari nilai dan penyelesaian Moodle.

### Data dan akses

Mahasiswa memilih setiap origin Moodle melalui dialog izin Chrome. Moodlens membaca informasi mata kuliah, aktivitas, penyelesaian, dan tenggat dari situs terbuka yang diaktifkan lalu menyimpan salinan lokal terbatas. Tidak ada backend pengembang, telemetri, atau perayapan latar belakang tersembunyi. Menghapus situs mencabut izin dan menghapus data belajar lokal situs tersebut.

### Yang dapat diharapkan dosen dan administrator

- Tidak diperlukan plugin Moodle, integrasi server, atau pemasangan tingkat institusi.
- Moodlens tidak menyediakan pemantauan, dasbor, atau data mahasiswa kepada dosen.
- Moodle tetap menjadi sumber data utama; status `unknown` ditampilkan daripada membuat perkiraan.
- Perbedaan tema dan versi dapat memengaruhi deteksi baca-saja. Laporan kompatibilitas situs hanya boleh berisi markup yang sudah disanitasi, bukan data mahasiswa atau konten mata kuliah nyata.

Laporkan masalah integritas atau keamanan secara privat melalui [`SECURITY.md`](../../../SECURITY.md). Laporan kompatibilitas umum dapat menggunakan template issue kompatibilitas situs di repositori.
