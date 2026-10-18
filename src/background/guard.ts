/**
 * Assessment guard wiring (ML-022). Content scripts report what they see; the background keeps the
 * reports in session storage only, and answers the side panel with one fail-closed verdict.
 *
 * Fail-closed in two ways: a report that fails validation counts as active, and a site tab with no
 * matching report is judged from its address alone (`guardFromUrl`), so a tab the content script
 * could not reach can never unlock study help.
 */
import {
  guardFromReport,
  guardFromUrl,
  isGuardState,
  type GuardReason,
  type GuardState
} from '../content/moodle/guard';
import type { GuardStatusResponse } from '../shared/types';
import { loadSites, siteTabs } from './sites';

const REPORTS_KEY = 'guard:reports';
/** Reports older than this are dropped; a browser session rarely keeps one assessment page longer. */
const REPORT_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_REPORTS = 50;

interface GuardReport {
  url: string;
  at: number;
  state: GuardState;
}
type GuardReports = Record<string, GuardReport>;

function isReport(value: unknown): value is GuardReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Partial<GuardReport>;
  return typeof report.url === 'string' && typeof report.at === 'number' && isGuardState(report.state);
}

async function loadReports(): Promise<GuardReports> {
  const stored: unknown = (await chrome.storage.session.get(REPORTS_KEY))[REPORTS_KEY];
  if (!stored || typeof stored !== 'object') return {};
  const now = Date.now();
  const reports: GuardReports = {};
  for (const [tabId, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!/^\d+$/.test(tabId) || !isReport(value) || now - value.at > REPORT_TTL_MS) continue;
    reports[tabId] = value;
  }
  return reports;
}

async function saveReports(reports: GuardReports): Promise<void> {
  const entries = Object.entries(reports)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, MAX_REPORTS);
  await chrome.storage.session.set({ [REPORTS_KEY]: Object.fromEntries(entries) });
}

/** Stores one page's guard state. Only a registered site's tab may report, and only for its own page. */
export async function reportGuard(payload: unknown, sender: chrome.runtime.MessageSender): Promise<{ ok: boolean }> {
  const tabId = sender.tab?.id;
  if (tabId === undefined || !sender.url) return { ok: false };
  const origin = sender.origin ?? new URL(sender.url).origin;
  const site = (await loadSites()).find((item) => item.origin === origin);
  if (!site) return { ok: false };
  const reports = await loadReports();
  reports[String(tabId)] = { url: sender.url, at: Date.now(), state: guardFromReport(payload) };
  await saveReports(reports);
  return { ok: true };
}

/**
 * One verdict for every open tab of every registered site. Study help is paused while any of them is
 * in an assessment state, so switching to the side panel during a quiz cannot unlock it.
 */
export async function guardStatus(): Promise<GuardStatusResponse> {
  const reports = await loadReports();
  const reasons = new Set<GuardReason>();
  const live: GuardReports = {};
  for (const site of await loadSites()) {
    for (const tab of await siteTabs(site)) {
      if (tab.id === undefined || !tab.url) continue;
      const report = reports[String(tab.id)];
      const fresh = report?.url === tab.url;
      if (fresh) live[String(tab.id)] = report;
      const state = fresh ? report.state : guardFromUrl(tab.url);
      for (const reason of state.reasons) reasons.add(reason);
    }
  }
  // Reports of closed tabs and of pages that navigated away are of no use any more.
  if (Object.keys(live).length !== Object.keys(reports).length) await saveReports(live);
  return { ok: true, active: reasons.size > 0, reasons: [...reasons] };
}

/** Drops every stored report, for "Clear all local data" and site removal. */
export async function clearGuardReports(): Promise<void> {
  await chrome.storage.session.remove(REPORTS_KEY);
}
