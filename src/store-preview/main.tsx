import React from 'react';
import { createRoot } from 'react-dom/client';
import { buildPrompt, estimateTokens, promptPreview, validateTaskInput } from '../shared/ai/prompt';
import { buildProviderRequest, PROVIDER_INFO } from '../shared/ai/providers';
import type { AiConsentPreview, TaskDataset } from '../shared/types';
import './preview.css';

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const taskData: Record<string, TaskDataset> = {
  'demo-a': {
    siteId: 'demo-a',
    capturedAt: iso(-8 * 60_000),
    source: 'ajax',
    unsupported: [],
    courses: [
      { siteId: 'demo-a', id: '101', name: 'Data Structures', visible: true, progress: 72 },
      { siteId: 'demo-a', id: '102', name: 'Academic Writing', visible: true, progress: 45 }
    ],
    tasks: [
      {
        siteId: 'demo-a',
        courseId: '101',
        activityId: '501',
        kind: 'assign',
        title: 'Linked list worksheet',
        dueAt: iso(5 * 60 * 60_000),
        url: 'https://learn.example/mod/assign/view.php?id=501',
        status: 'open',
        source: 'ajax'
      },
      {
        siteId: 'demo-a',
        courseId: '102',
        activityId: '502',
        kind: 'forum',
        title: 'Peer review reflection',
        dueAt: iso(2 * 86_400_000),
        url: 'https://learn.example/mod/forum/view.php?id=502',
        status: 'open',
        source: 'ajax'
      },
      {
        siteId: 'demo-a',
        courseId: '102',
        activityId: '503',
        kind: 'assign',
        title: 'Essay outline',
        dueAt: iso(-20 * 60 * 60_000),
        url: 'https://learn.example/mod/assign/view.php?id=503',
        status: 'overdue',
        source: 'ajax'
      }
    ]
  },
  'demo-b': {
    siteId: 'demo-b',
    capturedAt: iso(-12 * 60_000),
    source: 'ajax',
    unsupported: [],
    courses: [{ siteId: 'demo-b', id: '201', name: 'Statistics Lab', visible: true, progress: 60 }],
    tasks: [
      {
        siteId: 'demo-b',
        courseId: '201',
        activityId: '601',
        kind: 'quiz',
        title: 'Probability practice check',
        dueAt: iso(5 * 86_400_000),
        url: 'https://practice.example/mod/quiz/view.php?id=601',
        status: 'open',
        source: 'ajax'
      }
    ]
  }
};

const storageValues: Record<string, unknown> = {
  'site:demo-a:tasks': taskData['demo-a'],
  'site:demo-b:tasks': taskData['demo-b']
};

const locale = new URLSearchParams(window.location.search).get('locale') === 'id' ? 'id' : 'en';
// Synthetic AI reply for the AI screenshots: no provider is called; the consent text is the real prompt.
const aiAnswer = {
  en: '• A stack removes the newest item first (LIFO) [S1]\n• A queue removes the oldest item first (FIFO), which suits waiting lines and breadth-first search [S2]\n• Both push and pop in constant time with a linked list [S3]',
  id: '• Stack mengambil item terbaru lebih dulu (LIFO) [S1]\n• Queue mengambil item terlama lebih dulu (FIFO), cocok untuk antrean dan breadth-first search [S2]\n• Dengan linked list, push dan pop keduanya berjalan dalam waktu konstan [S3]'
}[locale];
const aiProvider = 'gemini' as const;
const aiModel = PROVIDER_INFO[aiProvider].defaultModel;

function aiPrepare(task: unknown): { ok: true; preview: AiConsentPreview } | { ok: false; error: 'invalid' } {
  const input = validateTaskInput(task);
  if (!input) return { ok: false, error: 'invalid' };
  const prompt = buildPrompt(input);
  const text = promptPreview(prompt);
  return {
    ok: true,
    preview: {
      nonce: 'preview',
      provider: aiProvider,
      model: aiModel,
      destination: buildProviderRequest(aiProvider, aiModel, '', prompt).url,
      purpose: input.purpose,
      text,
      tokens: estimateTokens(text),
      permission: PROVIDER_INFO[aiProvider].permission
    }
  };
}

const listeners = { addListener: () => undefined, removeListener: () => undefined };
Object.defineProperty(globalThis, 'chrome', {
  configurable: true,
  value: {
    runtime: {
      id: 'moodlens-store-preview',
      sendMessage: async (message: { type?: string; task?: unknown }) => {
        if (message.type === 'AI_SETTINGS') {
          return {
            ok: true,
            enabled: true,
            provider: aiProvider,
            models: {
              ...Object.fromEntries(Object.entries(PROVIDER_INFO).map(([id, info]) => [id, info.defaultModel]))
            },
            keys: Object.fromEntries(Object.keys(PROVIDER_INFO).map((id) => [id, id === aiProvider]))
          };
        }
        if (message.type === 'AI_PREPARE') return aiPrepare(message.task);
        if (message.type === 'AI_SEND') {
          return {
            ok: true,
            result: {
              kind: 'answer',
              text: aiAnswer,
              citations: [
                { id: 'S1', page: 1 },
                { id: 'S2', page: 2 },
                { id: 'S3', page: 3 }
              ]
            }
          };
        }
        if (message.type === 'STUDY_OVERVIEW') {
          return {
            ok: true,
            decks: [
              { id: 'deck-1', siteId: 'demo-a', name: 'Algorithms essentials', cards: 24, due: 6 },
              { id: 'deck-2', siteId: 'demo-b', name: 'Statistics formulas', cards: 18, due: 3 }
            ],
            queue: [
              {
                id: 'card-1',
                siteId: 'demo-a',
                deckId: 'deck-1',
                front: locale === 'id' ? 'Apa arti FIFO pada queue?' : 'What does FIFO mean in a queue?',
                back:
                  locale === 'id'
                    ? 'First In, First Out: item yang pertama masuk adalah yang pertama keluar.'
                    : 'First In, First Out: the earliest item added is the first item removed.',
                origin: 'manual',
                intervals: { again: 1, hard: 2, good: 4, easy: 8 }
              }
            ],
            offer: { siteId: 'demo-a', count: 3 },
            later: 15
          };
        }
        if (message.type === 'XP_STATE') {
          return {
            ok: true,
            totalXp: 460,
            level: 5,
            levelStartXp: 400,
            nextLevelXp: 600,
            today: 35,
            streak: 8,
            longestStreak: 14,
            weeklyGoal: 150,
            weeklyEarned: 95
          };
        }
        return { ok: true };
      }
    },
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          const wanted = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(
            wanted.filter((key) => key in storageValues).map((key) => [key, storageValues[key]])
          );
        },
        set: async () => undefined
      },
      onChanged: listeners
    },
    permissions: {
      contains: async () => true,
      request: async () => true,
      remove: async () => true,
      onAdded: listeners,
      onRemoved: listeners
    },
    tabs: {
      create: async () => undefined,
      query: async () => [],
      sendMessage: async () => ({ ok: true })
    }
  }
});

const element = document.getElementById('root');
if (!element) throw new Error('Root element missing');
const { StorePreview } = await import('./PreviewApp');
createRoot(element).render(
  <React.StrictMode>
    <StorePreview />
  </React.StrictMode>
);
