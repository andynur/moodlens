import { useEffect, useState } from 'react';
import { Globe, KeyRound, Pencil, Trash2 } from 'lucide-react';
import type { TranslationKey } from '../../shared/i18n';
import type { DetectionConfidence, Site } from '../../shared/types';
import { activeTabOrigin, enableSiteFromInput, sendSiteCommand, type SitesState } from '../useSites';

export interface Feedback {
  translate: (key: TranslationKey) => string;
  onNotice: (key: TranslationKey) => void;
  onError: (key: TranslationKey) => void;
}

const detectionLabel: Record<DetectionConfidence | 'unchecked', TranslationKey> = {
  high: 'detectionHigh',
  low: 'detectionLow',
  none: 'detectionNone',
  unchecked: 'detectionUnchecked'
};

/** Message shown after enabling; low and absent Moodle markers are warnings, not success. */
function reportEnabled(site: Site, { onNotice, onError }: Feedback) {
  if (site.detection === 'high') onNotice('siteEnabled');
  else if (site.detection === 'low') onError('siteLowConfidence');
  else if (site.detection === 'none') onError('siteNotDetected');
  else onNotice('siteEnabledUnchecked');
}

async function enable(input: string, feedback: Feedback): Promise<boolean> {
  const outcome = await enableSiteFromInput(input);
  if (outcome.kind === 'enabled') reportEnabled(outcome.site, feedback);
  else
    feedback.onError(
      outcome.kind === 'invalid'
        ? 'siteInvalidUrl'
        : outcome.kind === 'denied'
          ? 'sitePermissionDenied'
          : 'siteEnableError'
    );
  return outcome.kind === 'enabled';
}

const buttonClass = 'inline-flex items-center gap-1 rounded-lg border p-2 text-xs font-semibold';
const neutralButton = `${buttonClass} border-slate-300 dark:border-slate-700`;
const dangerButton = `${buttonClass} border-red-300 text-red-700 dark:border-red-800 dark:text-red-400`;

export function SiteEnableForm(props: Feedback & { compact?: boolean }) {
  const { translate } = props;
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void activeTabOrigin().then((origin) => origin && setAddress((current) => current || origin));
  }, []);
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void enable(address, props).then((ok) => {
          setBusy(false);
          if (ok) setAddress('');
        });
      }}
    >
      {!props.compact && (
        <>
          <h2 className="text-base font-bold">{translate('enableSiteTitle')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{translate('enableSiteHint')}</p>
        </>
      )}
      <label className="block text-xs font-semibold">
        {translate('siteUrl')}
        <input
          type="url"
          inputMode="url"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="https://moodle.example.ac.id"
          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 p-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <Globe size={15} />
        {translate('enableSite')}
      </button>
    </form>
  );
}

/** Problems that block data for a site: revoked access (Chrome settings) or a page that is not Moodle. */
export function SiteAlerts(props: Feedback & { state: SitesState }) {
  const { translate, state } = props;
  const alerts = state.sites.filter((site) => state.access[site.id] === false || site.detection === 'none');
  if (alerts.length === 0) return null;
  return (
    <>
      {alerts.map((site) => (
        <section
          key={site.id}
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <p className="font-semibold">{site.label}</p>
          <p className="mt-1">{translate(state.access[site.id] === false ? 'siteAccessOff' : 'siteNotDetected')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.access[site.id] === false && (
              <button type="button" className={neutralButton} onClick={() => void enable(site.origin, props)}>
                <KeyRound size={13} />
                {translate('grantAccess')}
              </button>
            )}
            <RemoveSiteButton site={site} {...props} />
          </div>
        </section>
      ))}
    </>
  );
}

function RemoveSiteButton(props: Feedback & { site: Site }) {
  const { translate, site } = props;
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className={dangerButton} onClick={() => setConfirming(true)}>
        <Trash2 size={13} />
        {translate('removeSite')}
      </button>
    );
  }
  return (
    <div className="w-full space-y-2">
      <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-400">
        {translate('removeSiteConfirm')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={neutralButton} onClick={() => setConfirming(false)}>
          {translate('cancel')}
        </button>
        <button
          type="button"
          className="rounded-lg bg-red-600 p-2 text-xs font-semibold text-white"
          onClick={() => {
            setConfirming(false);
            void sendSiteCommand({ type: 'REMOVE_SITE', siteId: site.id }).then((ok) =>
              ok ? props.onNotice('siteRemoved') : props.onError('siteActionError')
            );
          }}
        >
          {translate('removeSite')}
        </button>
      </div>
    </div>
  );
}

function SiteRow(props: Feedback & { site: Site; access: boolean | undefined }) {
  const { translate, site } = props;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(site.label);
  return (
    <li className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendSiteCommand({ type: 'RENAME_SITE', siteId: site.id, label }).then((ok) => {
              if (ok) setEditing(false);
              else props.onError('siteActionError');
            });
          }}
        >
          <input
            aria-label={translate('siteName')}
            value={label}
            maxLength={60}
            required
            onChange={(event) => setLabel(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button type="submit" className={neutralButton}>
            {translate('save')}
          </button>
        </form>
      ) : (
        <p className="break-words text-sm font-semibold">{site.label}</p>
      )}
      <p className="break-all text-xs text-slate-500 dark:text-slate-400">{site.origin}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {translate(detectionLabel[site.detection ?? 'unchecked'])}
        {site.versionHint ? ` · ${site.versionHint}` : ''}
        {props.access === false ? ` · ${translate('siteAccessOff')}` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {!editing && (
          <button
            type="button"
            className={neutralButton}
            onClick={() => {
              setLabel(site.label);
              setEditing(true);
            }}
          >
            <Pencil size={13} />
            {translate('rename')}
          </button>
        )}
        {props.access === false && (
          <button type="button" className={neutralButton} onClick={() => void enable(site.origin, props)}>
            <KeyRound size={13} />
            {translate('grantAccess')}
          </button>
        )}
        <RemoveSiteButton {...props} />
      </div>
    </li>
  );
}

export function SitesSettings(props: Feedback & { state: SitesState }) {
  const { translate, state } = props;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold">{translate('sites')}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{translate('sitesHint')}</p>
      </div>
      {state.sites.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{translate('noSites')}</p>
      ) : (
        <ul className="space-y-2">
          {state.sites.map((site) => (
            <SiteRow key={site.id} site={site} access={state.access[site.id]} {...props} />
          ))}
        </ul>
      )}
      <SiteEnableForm compact {...props} />
    </div>
  );
}
