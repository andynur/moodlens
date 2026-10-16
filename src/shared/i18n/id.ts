import type { TranslationKey } from './en';

export const id = {
  appName: 'Moodlens', tagline: 'Agen AI Moodle All in One untuk Mahasiswa',
  unofficial: 'Proyek independen · Tidak berafiliasi dengan universitas atau Moodle HQ',
  navigation: 'Navigasi',
  activityResource: 'Materi', activityPage: 'Halaman', activityUrl: 'Tautan',
  activityAttendance: 'Presensi', activityQuiz: 'Kuis', activityForum: 'Forum',
  activityAssign: 'Tugas', activityUnknown: 'Aktivitas lain',
  today: 'Hari ini', courses: 'Mata kuliah', study: 'AI Belajar', settings: 'Pengaturan',
  currentCourse: 'Mata kuliah terakhir dibuka', activities: 'Aktivitas',
  noData: 'Buka mata kuliah di LMS untuk memuat aktivitasnya.',
  lastSeen: 'Terakhir diambil', preview: 'Pratinjau browser: API ekstensi tidak tersedia.',
  completed: 'Selesai', incomplete: 'Belum selesai', unknown: 'Belum diketahui',
  statusSummary: 'Ringkasan aktivitas', open: 'Buka di LMS',
  ready: 'Siap memeriksa aktivitas perkuliahan',
  studyPlanned: 'Fitur AI untuk belajar direncanakan pada rilis mendatang.',
  studyPrivacy: 'Starter ini tidak mengirim API key atau dokumen kuliah ke penyedia AI.',
  language: 'Bahasa', theme: 'Tampilan', light: 'Terang', dark: 'Gelap',
  refreshHint: 'Buka atau muat ulang halaman mata kuliah untuk memperbarui data.',
  emptyActivities: 'Tidak ditemukan aktivitas yang didukung di halaman ini.',
  limitations: 'Status penyelesaian dan tenggat perlu diverifikasi pada LMS asli.',
  noNavigation: 'Tautan aktivitas ini tidak dapat divalidasi.',
  untitledCourse: 'Mata kuliah tanpa judul',
  storageError: 'Data tersimpan tidak dapat dimuat. Muat ulang panel samping lalu coba lagi.',
  copyright: 'Versi pengembangan lokal'
} as const satisfies Record<TranslationKey, string>;
