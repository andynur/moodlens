import type { Locale, TaskKind } from '../shared/types';

const taskStrings = {
  en: {
    tasks: 'Tasks',
    search: 'Search tasks',
    allSites: 'All sites',
    allCourses: 'All courses',
    allTypes: 'All types',
    overdue: 'Overdue',
    today: 'Today',
    thisWeek: 'This week',
    later: 'Later',
    noDate: 'No date',
    noTasks: 'No matching tasks.',
    refresh: 'Refresh',
    refreshedHint: 'Refresh runs on the active enabled Moodle tab.',
    source: 'Source',
    lastUpdated: 'Last updated',
    selectAll: 'Select all',
    exportSelected: 'Export selected',
    exportAll: 'Export all',
    openTask: 'Open in Moodle',
    refreshError: 'Open an enabled Moodle page, then try Refresh again.',
    exportEmpty: 'There are no dated tasks to export.',
    assign: 'Assignment',
    quiz: 'Quiz',
    attendance: 'Attendance',
    forum: 'Forum',
    event: 'Event',
    other: 'Other'
  },
  id: {
    tasks: 'Tugas',
    search: 'Cari tugas',
    allSites: 'Semua situs',
    allCourses: 'Semua mata kuliah',
    allTypes: 'Semua jenis',
    overdue: 'Terlambat',
    today: 'Hari ini',
    thisWeek: 'Minggu ini',
    later: 'Nanti',
    noDate: 'Tanpa tanggal',
    noTasks: 'Tidak ada tugas yang cocok.',
    refresh: 'Perbarui',
    refreshedHint: 'Pembaruan berjalan pada tab Moodle aktif yang sudah diaktifkan.',
    source: 'Sumber',
    lastUpdated: 'Terakhir diperbarui',
    selectAll: 'Pilih semua',
    exportSelected: 'Ekspor pilihan',
    exportAll: 'Ekspor semua',
    openTask: 'Buka di Moodle',
    refreshError: 'Buka halaman Moodle yang sudah diaktifkan, lalu coba Perbarui lagi.',
    exportEmpty: 'Tidak ada tugas bertanggal untuk diekspor.',
    assign: 'Tugas',
    quiz: 'Kuis',
    attendance: 'Presensi',
    forum: 'Forum',
    event: 'Acara',
    other: 'Lainnya'
  }
} as const;

export type TaskStringKey = keyof (typeof taskStrings)['en'];
export function taskText(locale: Locale, key: TaskStringKey): string {
  return taskStrings[locale][key];
}
export function taskKindText(locale: Locale, kind: TaskKind): string {
  return taskStrings[locale][kind];
}
