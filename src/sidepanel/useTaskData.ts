import { useEffect, useState } from 'react';
import { taskDataKey } from '../shared/sites';
import type { Site, TaskDataset } from '../shared/types';
import { isTaskDataset } from '../shared/validation';
import { hasChrome } from './useSites';

export function useTaskData(sites: Site[]): Record<string, TaskDataset> {
  const [datasets, setDatasets] = useState<Record<string, TaskDataset>>({});
  useEffect(() => {
    if (!hasChrome) return;
    let active = true;
    const load = async () => {
      const values = await chrome.storage.local.get(sites.map((site) => taskDataKey(site.id)));
      if (!active) return;
      const next: Record<string, TaskDataset> = {};
      for (const site of sites) {
        const value: unknown = values[taskDataKey(site.id)];
        if (isTaskDataset(value, site.id, site.origin)) next[site.id] = value;
      }
      setDatasets(next);
    };
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && Object.keys(changes).some((key) => key.endsWith(':tasks'))) void load();
    };
    void load();
    chrome.storage.onChanged.addListener(changed);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, [sites]);
  return datasets;
}
