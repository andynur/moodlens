import { Paintbrush } from 'lucide-react';
import {
  APPEARANCE_FLAGS,
  HIDEABLE_BLOCKS,
  THEME_PRESETS,
  type AppearanceFlag,
  type AppearancePrefs,
  type HideableBlock,
  type ThemePreset
} from '../../shared/appearance';
import type { TranslationKey } from '../../shared/i18n';
import type { Site } from '../../shared/types';
import { sendSiteCommand, type SitesState } from '../useSites';
import { CardTitle, Checkbox, Field, Hint, SectionLabel, Select } from '../ui';
import type { Feedback } from './Sites';

const flagLabel: Record<AppearanceFlag, TranslationKey> = {
  dark: 'appearanceDark',
  largeText: 'appearanceLargeText',
  comfortableWidth: 'appearanceWidth'
};
const blockLabel: Record<HideableBlock, TranslationKey> = {
  online_users: 'blockOnlineUsers',
  calendar_month: 'blockCalendarMonth',
  recentlyaccesseditems: 'blockRecentItems',
  badges: 'blockBadges'
};
const themeLabel: Record<ThemePreset, TranslationKey> = {
  clean: 'themeClean',
  sepia: 'themeSepia',
  contrast: 'themeContrast'
};

function save(site: Site, appearance: AppearancePrefs, feedback: Feedback) {
  void sendSiteCommand({ type: 'SET_APPEARANCE', siteId: site.id, appearance }).then(
    (ok) => !ok && feedback.onError('siteActionError')
  );
}

function SiteAppearance(props: Feedback & { site: Site; prefs: AppearancePrefs; disabled: boolean }) {
  const { translate, site, prefs } = props;
  const blocks = prefs.hideBlocks ?? [];
  return (
    <fieldset className="space-y-2 rounded-lg border border-line p-3" disabled={props.disabled}>
      <legend className="px-1 text-sm font-medium">{site.label}</legend>
      <Field label={translate('appearanceTheme')}>
        <Select
          compact
          value={prefs.theme ?? ''}
          onChange={(event) =>
            save(site, { ...prefs, theme: (event.target.value || undefined) as ThemePreset | undefined }, props)
          }
        >
          <option value="">{translate('appearanceThemeNone')}</option>
          {THEME_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {translate(themeLabel[preset])}
            </option>
          ))}
        </Select>
      </Field>
      {prefs.theme && <Hint faint>{translate('appearanceThemeGuard')}</Hint>}
      {APPEARANCE_FLAGS.map((flag) => (
        <Checkbox
          key={flag}
          className="text-xs"
          checked={prefs[flag] === true}
          onChange={(event) => save(site, { ...prefs, [flag]: event.target.checked || undefined }, props)}
          label={translate(flagLabel[flag])}
        />
      ))}
      <SectionLabel className="pt-1">{translate('appearanceHideBlocks')}</SectionLabel>
      {HIDEABLE_BLOCKS.map((block) => (
        <Checkbox
          key={block}
          className="text-xs"
          checked={blocks.includes(block)}
          onChange={(event) =>
            save(
              site,
              {
                ...prefs,
                hideBlocks: event.target.checked ? [...blocks, block] : blocks.filter((item) => item !== block)
              },
              props
            )
          }
          label={translate(blockLabel[block])}
        />
      ))}
      {props.disabled && <Hint faint>{translate('siteAccessOff')}</Hint>}
    </fieldset>
  );
}

/** Per-site, opt-in Moodle page appearance (ML-018). Nothing changes until the student ticks an option. */
export function AppearanceSettings(props: Feedback & { state: SitesState }) {
  const { translate, state } = props;
  if (state.sites.length === 0) return null;
  return (
    <div className="space-y-3">
      <CardTitle icon={Paintbrush} tone="peach">
        {translate('appearanceTitle')}
      </CardTitle>
      <Hint>{translate('appearanceHint')}</Hint>
      <Hint faint>{translate('appearanceNotices')}</Hint>
      {state.sites.map((site) => (
        <SiteAppearance
          key={site.id}
          site={site}
          prefs={state.appearance[site.id] ?? {}}
          disabled={state.access[site.id] === false}
          {...props}
        />
      ))}
    </div>
  );
}
