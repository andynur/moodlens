import { describe, expect, it } from 'vitest';
import {
  buildPrompt,
  MAX_EVIDENCE,
  MAX_EVIDENCE_TOTAL,
  parseReply,
  promptPreview,
  validateTaskInput,
  type AiEvidence
} from '../src/shared/ai/prompt';
import { buildProviderRequest, classifyHttpError, cleanKey, cleanModel, replyText } from '../src/shared/ai/providers';

const evidence = [
  { page: 3, text: 'Photosynthesis happens in chloroplasts.' },
  { page: 5, text: 'Mitochondria produce ATP.' }
];
const task = (extra: Record<string, unknown> = {}) =>
  validateTaskInput({
    purpose: 'question',
    language: 'en',
    docName: 'bio.pdf',
    question: 'Where is ATP made?',
    evidence,
    ...extra
  });

describe('task validation', () => {
  it('numbers the excerpts and keeps their pages', () => {
    expect(task()?.evidence).toEqual([
      { id: 'S1', page: 3, text: 'Photosynthesis happens in chloroplasts.' },
      { id: 'S2', page: 5, text: 'Mitochondria produce ATP.' }
    ]);
  });

  it('refuses out-of-bounds input', () => {
    expect(task({ purpose: 'submit-quiz' })).toBeNull();
    expect(task({ question: '' })).toBeNull();
    expect(task({ evidence: [] })).toBeNull();
    expect(task({ evidence: Array.from({ length: MAX_EVIDENCE + 1 }, () => evidence[0]) })).toBeNull();
    expect(task({ evidence: [{ page: 0, text: 'x' }] })).toBeNull();
  });

  it('cuts each excerpt so the total stays within the budget', () => {
    const big = Array.from({ length: MAX_EVIDENCE }, () => ({ page: 1, text: 'word '.repeat(400) }));
    const total = task({ evidence: big })!.evidence.reduce((sum, item) => sum + item.text.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_EVIDENCE_TOTAL);
  });

  it('drops the question for purposes that do not use it', () => {
    expect(task({ purpose: 'summary' })?.question).toBeUndefined();
  });
});

describe('provider requests', () => {
  const prompt = buildPrompt(task()!);

  it('puts the key only in a header and the destination is fixed', () => {
    const openai = buildProviderRequest('openai', 'gpt-x', 'sk-secret-123', prompt);
    expect(openai.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(openai.init.headers.Authorization).toBe('Bearer sk-secret-123');
    expect(openai.init.body).not.toContain('sk-secret-123');
    const gemini = buildProviderRequest('gemini', 'gemini-x', 'AIza-secret-1', prompt);
    expect(gemini.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent');
    expect(gemini.url).not.toContain('AIza');
    expect(gemini.init.headers['x-goog-api-key']).toBe('AIza-secret-1');
  });

  it('refuses model names and keys that could change the request', () => {
    expect(cleanModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(cleanModel('../../v1/files')).toBeNull();
    expect(cleanModel('x?key=1')).toBeNull();
    expect(cleanKey('sk-abc 123')).toBeNull();
    expect(cleanKey('short')).toBeNull();
    expect(cleanKey('  sk-proj-abcdef123456  ')).toBe('sk-proj-abcdef123456');
  });

  it('reads reply text and classifies errors', () => {
    expect(replyText('openai', { choices: [{ message: { content: 'hi' } }] })).toBe('hi');
    expect(replyText('gemini', { candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] })).toBe('ab');
    expect(replyText('openai', { error: {} })).toBeNull();
    expect(classifyHttpError('openai', 401, '')).toBe('bad-key');
    expect(classifyHttpError('gemini', 400, 'API_KEY_INVALID')).toBe('bad-key');
    expect(classifyHttpError('openai', 429, '')).toBe('rate-limit');
    expect(classifyHttpError('gemini', 503, '')).toBe('provider-down');
    expect(classifyHttpError('openai', 403, '')).toBe('bad-key');
  });
});

describe('reply parsing', () => {
  const sent: AiEvidence[] = task()!.evidence;
  const reply = (value: unknown) => JSON.stringify(value);

  it('keeps answers that cite sent excerpts and maps them to pages', () => {
    expect(
      parseReply('question', reply({ status: 'answer', text: 'In mitochondria [S2].', sources: ['S2'] }), sent)
    ).toEqual({
      kind: 'answer',
      text: 'In mitochondria [S2].',
      citations: [{ id: 'S2', page: 5 }]
    });
  });

  it('turns an uncited answer into insufficient evidence', () => {
    expect(parseReply('question', reply({ status: 'answer', text: 'Probably the nucleus.' }), sent)).toEqual({
      kind: 'insufficient'
    });
    expect(parseReply('summary', reply({ status: 'insufficient', text: '' }), sent)).toEqual({ kind: 'insufficient' });
  });

  it('accepts fenced JSON and rejects non-JSON', () => {
    expect(parseReply('summary', '```json\n{"status":"answer","text":"- ATP [S2]"}\n```', sent)?.kind).toBe('answer');
    expect(parseReply('summary', 'Sure! Here is a summary.', sent)).toBeNull();
  });

  it('keeps only cited cards and caps their text', () => {
    const result = parseReply(
      'flashcards',
      reply({
        status: 'answer',
        cards: [
          { front: 'ATP site?', back: 'Mitochondria', source: 'S2' },
          { front: 'Uncited', back: 'x' },
          { front: 'Forged', back: 'y', source: 'S9' },
          { front: 'x'.repeat(5000), back: 'long', source: 's1' }
        ]
      }),
      sent
    );
    expect(result?.kind).toBe('cards');
    if (result?.kind !== 'cards') return;
    expect(result.cards.map((card) => card.page)).toEqual([5, 3]);
    expect(result.cards[1]?.front.length).toBe(2000);
  });

  it('shows everything that is sent in the preview', () => {
    const prompt = buildPrompt(task()!);
    const preview = promptPreview(prompt);
    expect(preview).toContain(prompt.system);
    expect(preview).toContain(prompt.user);
    expect(preview).toContain('Where is ATP made?');
  });
});
