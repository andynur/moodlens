// Moodle page appearance (ML-018): per-site opt-in, CSS only, applied through classes on <html>
// so turning an option off restores the page exactly. Block selectors are standard Moodle
// `block_<name>` classes, unverified on SiberMu (its fixtures contain none of these blocks).

/**
 * Blocks the student may hide. Fixed list; blocks that carry deadlines, restrictions, announcements
 * or integrity notices (timeline, upcoming events, news, HTML) are never offered.
 */
export const HIDEABLE_BLOCKS = ['online_users', 'calendar_month', 'recentlyaccesseditems', 'badges'] as const;
export type HideableBlock = (typeof HIDEABLE_BLOCKS)[number];

/** Fixed theme presets (PRD-009); the tokens live in `public/appearance.css`. */
export const THEME_PRESETS = ['clean', 'sepia', 'contrast'] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export interface AppearancePrefs {
  dark?: true;
  largeText?: true;
  comfortableWidth?: true;
  hideBlocks?: HideableBlock[];
  theme?: ThemePreset;
}

export const APPEARANCE_FLAGS = ['dark', 'largeText', 'comfortableWidth'] as const;
export type AppearanceFlag = (typeof APPEARANCE_FLAGS)[number];

/** Class set on <html> for each option; `appearance.css` styles nothing without them. */
export const APPEARANCE_CLASS: Record<AppearanceFlag, string> = {
  dark: 'moodlens-dark',
  largeText: 'moodlens-large-text',
  comfortableWidth: 'moodlens-width'
};
export const HIDE_ATTRIBUTE = 'data-moodlens-hide';
/** Shared preset rules hang on THEME_CLASS; the tokens on `moodlens-theme-<preset>`. */
export const THEME_CLASS = 'moodlens-theme';
export const themeClass = (preset: ThemePreset) => `${THEME_CLASS}-${preset}`;

export function appearanceKey(siteId: string): string {
  return `site:${siteId}:appearance`;
}

/** Validated prefs with defaults removed (blocks in fixed order); null when malformed. */
export function cleanAppearance(input: unknown): AppearancePrefs | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const known: readonly string[] = [...APPEARANCE_FLAGS, 'hideBlocks', 'theme'];
  if (Object.keys(raw).some((key) => !known.includes(key))) return null;
  const prefs: AppearancePrefs = {};
  for (const flag of APPEARANCE_FLAGS) {
    if (raw[flag] === true) prefs[flag] = true;
    else if (raw[flag] !== undefined && raw[flag] !== false) return null;
  }
  if (raw.hideBlocks !== undefined) {
    if (!Array.isArray(raw.hideBlocks) || raw.hideBlocks.some((block) => !HIDEABLE_BLOCKS.includes(block))) return null;
    const blocks = HIDEABLE_BLOCKS.filter((block) => (raw.hideBlocks as unknown[]).includes(block));
    if (blocks.length > 0) prefs.hideBlocks = blocks;
  }
  if (raw.theme !== undefined) {
    if (!THEME_PRESETS.includes(raw.theme as ThemePreset)) return null;
    prefs.theme = raw.theme as ThemePreset;
  }
  return prefs;
}

export function isAppearancePrefs(input: unknown): input is AppearancePrefs {
  const clean = cleanAppearance(input);
  return clean !== null && JSON.stringify(clean) === JSON.stringify(input);
}

export function appearanceActive(prefs: AppearancePrefs): boolean {
  return Object.keys(prefs).length > 0;
}

/**
 * Sets or clears every Moodlens class and attribute on the root element. Idempotent; empty prefs
 * leave the root as it was before Moodlens touched it. `guarded` (assessment guard active) keeps the
 * theme preset off; the other options stay as chosen.
 */
export function applyAppearance(root: HTMLElement, prefs: AppearancePrefs, guarded = false): void {
  for (const flag of APPEARANCE_FLAGS) root.classList.toggle(APPEARANCE_CLASS[flag], prefs[flag] === true);
  if (prefs.hideBlocks?.length) root.setAttribute(HIDE_ATTRIBUTE, prefs.hideBlocks.join(' '));
  else root.removeAttribute(HIDE_ATTRIBUTE);
  const theme = guarded ? undefined : prefs.theme;
  root.classList.toggle(THEME_CLASS, theme !== undefined);
  for (const preset of THEME_PRESETS) root.classList.toggle(themeClass(preset), preset === theme);
}
