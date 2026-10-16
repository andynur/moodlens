export const en = {
  appName: 'Moodlens', tagline: 'All in One Moodle AI Agent for Student',
  unofficial: 'Independent project · Not affiliated with your university or Moodle HQ',
  navigation: 'Navigation',
  activityResource: 'Resource', activityPage: 'Page', activityUrl: 'Link',
  activityAttendance: 'Attendance', activityQuiz: 'Quiz', activityForum: 'Forum',
  activityAssign: 'Assignment', activityUnknown: 'Other activity',
  today: 'Today', courses: 'Courses', study: 'Study AI', settings: 'Settings',
  currentCourse: 'Last viewed course', activities: 'Activities',
  noData: 'Open a course in the LMS to load its activities.',
  lastSeen: 'Last captured', preview: 'Browser preview: extension APIs are unavailable.',
  completed: 'Completed', incomplete: 'Not completed', unknown: 'Unknown',
  statusSummary: 'Activity overview', open: 'Open in LMS',
  ready: 'Ready to inspect course activities',
  studyPlanned: 'AI study features are planned for a future release.',
  studyPrivacy: 'No API keys or course documents are sent to AI providers in this starter.',
  language: 'Language', theme: 'Appearance', light: 'Light', dark: 'Dark',
  refreshHint: 'Visit or refresh the course page to update this snapshot.',
  emptyActivities: 'No supported activities were detected on this page.',
  limitations: 'Completion and deadline details must be verified against the actual LMS.',
  noNavigation: 'This activity link could not be validated.',
  untitledCourse: 'Untitled course',
  storageError: 'Saved data could not be loaded. Reload the side panel and try again.',
  copyright: 'Local development build · v0.1.0'
} as const;

export type TranslationKey = keyof typeof en;
