import { useEffect, useState } from 'react';
import { Globe, KeyRound, Pencil, Server, Trash2, TriangleAlert } from 'lucide-react';
import type { TranslationKey } from '../../shared/i18n';
import type { DetectionConfidence, Site } from '../../shared/types';
import { activeTabOrigin, enableSiteFromInput, sendSiteCommand, type SitesState } from '../useSites';
import { Alert, Badge, Button, CardTitle, Field, Hint, Input, type Tone } from '../ui';

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
const detectionTone: Record<DetectionConfidence | 'unchecked', Tone> = {
  high: 'mint',
  low: 'yellow',
  none: 'rose',
  unchecked: 'neutral'
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

export function SiteEnableForm(props: Feedback & { compact?: boolean }) {
  const { translate } = props;
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void activeTabOrigin().then((origin) => origin && setAddress((current) => current || origin));
  }, []);
  return (
    <form
      className="space-y-3"
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
          <CardTitle icon={Globe} tone="brand" level={2}>
            {translate('enableSiteTitle')}
          </CardTitle>
          <Hint>{translate('enableSiteHint')}</Hint>
        </>
      )}
      <Field label={translate('siteUrl')}>
        <Input
          type="url"
          inputMode="url"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="https://moodle.example.ac.id"
        />
      </Field>
      <Button type="submit" variant="primary" size="md" disabled={busy} className="w-full justify-center">
        <Globe size={15} />
        {translate('enableSite')}
      </Button>
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
        <Alert key={site.id} tone="warning" icon={TriangleAlert}>
          <p className="font-semibold">{site.label}</p>
          <p className="mt-0.5">{translate(state.access[site.id] === false ? 'siteAccessOff' : 'siteNotDetected')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.access[site.id] === false && (
              <Button onClick={() => void enable(site.origin, props)}>
                <KeyRound size={14} />
                {translate('grantAccess')}
              </Button>
            )}
            <RemoveSiteButton site={site} {...props} />
          </div>
        </Alert>
      ))}
    </>
  );
}

function RemoveSiteButton(props: Feedback & { site: Site }) {
  const { translate, site } = props;
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="dangerOutline" onClick={() => setConfirming(true)}>
        <Trash2 size={14} />
        {translate('removeSite')}
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2">
      <p role="alert" className="text-xs font-semibold text-error-ink">
        {translate('removeSiteConfirm')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="justify-center" onClick={() => setConfirming(false)}>
          {translate('cancel')}
        </Button>
        <Button
          variant="danger"
          className="justify-center"
          onClick={() => {
            setConfirming(false);
            void sendSiteCommand({ type: 'REMOVE_SITE', siteId: site.id }).then((ok) =>
              ok ? props.onNotice('siteRemoved') : props.onError('siteActionError')
            );
          }}
        >
          {translate('removeSite')}
        </Button>
      </div>
    </div>
  );
}

function SiteRow(props: Feedback & { site: Site; access: boolean | undefined }) {
  const { translate, site } = props;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(site.label);
  const detection = site.detection ?? 'unchecked';
  return (
    <li className="space-y-2 p-3">
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
          <Input
            aria-label={translate('siteName')}
            value={label}
            maxLength={60}
            required
            onChange={(event) => setLabel(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="md">
            {translate('save')}
          </Button>
        </form>
      ) : (
        <p className="text-sm font-medium break-words">{site.label}</p>
      )}
      <p className="text-xs break-all text-ink-3">{site.origin}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={detectionTone[detection]}>{translate(detectionLabel[detection])}</Badge>
        {site.versionHint && <Badge>{site.versionHint}</Badge>}
        {props.access === false && <Badge tone="rose">{translate('siteAccessOff')}</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!editing && (
          <Button
            onClick={() => {
              setLabel(site.label);
              setEditing(true);
            }}
          >
            <Pencil size={14} />
            {translate('rename')}
          </Button>
        )}
        {props.access === false && (
          <Button onClick={() => void enable(site.origin, props)}>
            <KeyRound size={14} />
            {translate('grantAccess')}
          </Button>
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
      <CardTitle icon={Server} tone="brand">
        {translate('sites')}
      </CardTitle>
      <Hint>{translate('sitesHint')}</Hint>
      {state.sites.length === 0 ? (
        <Hint faint>{translate('noSites')}</Hint>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {state.sites.map((site) => (
            <SiteRow key={site.id} site={site} access={state.access[site.id]} {...props} />
          ))}
        </ul>
      )}
      <SiteEnableForm compact {...props} />
    </div>
  );
}
