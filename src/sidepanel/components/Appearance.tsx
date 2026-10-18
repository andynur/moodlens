import {
  APPEARANCE_FLAGS,
  HIDEABLE_BLOCKS,
  type AppearanceFlag,
  type AppearancePrefs,
  type HideableBlock
} from '../../shared/appearance';
import type { TranslationKey } from '../../shared/i18n';
import type { Site } from '../../shared/types';
import { sendSiteCommand, type SitesState } from '../useSites';
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

function save(site: Site, appearance: AppearancePrefs, feedback: Feedback) {
  void sendSiteCommand({ type: 'SET_APPEARANCE', siteId: site.id, appearance }).then(
    (ok) => !ok && feedback.onError('siteActionError')
  );
}

function SiteAppearance(props: Feedback & { site: Site; prefs: AppearancePrefs; disabled: boolean }) {
  const { translate, site, prefs } = props;
  const blocks = prefs.hideBlocks ?? [];
  const check = 'h-4 w-4 accent-blue-700';
  return (
    <fieldset
      className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
      disabled={props.disabled}
    >
      <legend className="px-1 text-sm font-semibold">{site.label}</legend>
      {APPEARANCE_FLAGS.map((flag) => (
        <label key={flag} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className={check}
            checked={prefs[flag] === true}
            onChange={(event) => save(site, { ...prefs, [flag]: event.target.checked || undefined }, props)}
          />
          {translate(flagLabel[flag])}
        </label>
      ))}
      <p className="pt-1 text-xs font-semibold">{translate('appearanceHideBlocks')}</p>
      {HIDEABLE_BLOCKS.map((block) => (
        <label key={block} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className={check}
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
          />
          {translate(blockLabel[block])}
        </label>
      ))}
      {props.disabled && <p className="text-xs text-slate-500 dark:text-slate-400">{translate('siteAccessOff')}</p>}
    </fieldset>
  );
}

/** Per-site, opt-in Moodle page appearance (ML-018). Nothing changes until the student ticks an option. */
export function AppearanceSettings(props: Feedback & { state: SitesState }) {
  const { translate, state } = props;
  if (state.sites.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">{translate('appearanceTitle')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{translate('appearanceHint')}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{translate('appearanceNotices')}</p>
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
