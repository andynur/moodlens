import { useRef, useState } from 'react';
import { Archive, Download, Upload } from 'lucide-react';
import { MAX_BACKUP_BYTES, parseBackupText, type BackupPreview } from '../../shared/backup';
import type { ExportBackupResponse, Locale } from '../../shared/types';
import { sendSiteCommand } from '../useSites';
import { Button, CardTitle, Hint } from '../ui';
import type { Feedback } from './Sites';

async function download(feedback: Feedback) {
  const response = (await chrome.runtime
    .sendMessage({ type: 'EXPORT_BACKUP' })
    .catch(() => null)) as ExportBackupResponse | null;
  if (!response?.ok) {
    feedback.onError('backupError');
    return;
  }
  // Saved by the browser's own download flow; no `downloads` permission needed.
  const url = URL.createObjectURL(new Blob([JSON.stringify(response.backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `moodlens-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Export and import of local data (ML-023 part 2). Import shows a preview and asks before replacing. */
export function BackupSettings(props: Feedback & { locale: Locale }) {
  const { translate } = props;
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ backup: unknown; preview: BackupPreview } | null>(null);

  async function choose(file: File | undefined) {
    if (input.current) input.current.value = '';
    setPending(null);
    if (!file) return;
    const text = file.size <= MAX_BACKUP_BYTES ? await file.text() : '';
    const parsed = text ? parseBackupText(text) : null;
    if (!parsed) {
      props.onError('backupInvalid');
      return;
    }
    // The background validates the same file again before replacing anything.
    setPending({ backup: JSON.parse(text) as unknown, preview: parsed.preview });
  }
  async function restore() {
    if (!pending) return;
    const ok = await sendSiteCommand({ type: 'IMPORT_BACKUP', backup: pending.backup });
    setPending(null);
    if (ok) props.onNotice('backupRestored');
    else props.onError('backupError');
  }

  return (
    <div className="space-y-3">
      <CardTitle icon={Archive} tone="sky">
        {translate('backup')}
      </CardTitle>
      <Hint>{translate('backupHint')}</Hint>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void download(props)}>
          <Download size={14} />
          {translate('exportBackup')}
        </Button>
        <Button onClick={() => input.current?.click()}>
          <Upload size={14} />
          {translate('importBackup')}
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label={translate('importBackup')}
          onChange={(event) => void choose(event.target.files?.[0])}
        />
      </div>
      {pending && (
        <div className="space-y-2 rounded-lg border border-line bg-well p-3">
          <p className="text-xs">
            {translate('backupPreview')}{' '}
            {new Date(pending.preview.exportedAt).toLocaleString(props.locale === 'id' ? 'id-ID' : 'en-US')}:{' '}
            {pending.preview.sites} {translate('backupSites')}, {pending.preview.courses} {translate('backupCourses')}
          </p>
          <p role="alert" className="text-xs font-semibold text-error-ink">
            {translate('backupConfirmQuestion')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="justify-center" onClick={() => setPending(null)}>
              {translate('cancel')}
            </Button>
            <Button variant="danger" className="justify-center" onClick={() => void restore()}>
              {translate('backupRestore')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
