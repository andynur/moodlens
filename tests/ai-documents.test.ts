import { describe, expect, it } from 'vitest';
import {
  chunkPages,
  chunksInRange,
  cleanDocText,
  extractionReport,
  retrieve,
  tokenize,
  type DocPage
} from '../src/shared/ai/documents';

const LONG = 'Photosynthesis converts light energy into chemical energy in chloroplasts. '.repeat(40);

describe('document text', () => {
  it('removes control and bidi characters and collapses whitespace', () => {
    expect(cleanDocText('a\u0000b‮c​d   e\n\n\n\nf')).toBe('a b c d e\n\nf');
  });

  it('reports scanned and failed pages', () => {
    const pages: DocPage[] = [
      { page: 1, text: LONG },
      { page: 2, text: '  ' }
    ];
    expect(extractionReport(3, pages, [3])).toEqual({
      pageCount: 3,
      textPages: 1,
      emptyPages: [2],
      failedPages: [3],
      scanned: 'partial'
    });
    expect(extractionReport(1, [{ page: 1, text: '' }], []).scanned).toBe('all');
    expect(extractionReport(1, [{ page: 1, text: LONG }], []).scanned).toBe('none');
  });
});

describe('chunking', () => {
  it('splits long pages into bounded chunks that never cross a page', () => {
    const chunks = chunkPages([
      { page: 1, text: LONG },
      { page: 2, text: 'Mitochondria produce ATP through cellular respiration in most cells of the body.' }
    ]);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(1200);
    expect(chunks.at(-1)).toMatchObject({ page: 2 });
    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(chunks.length);
  });

  it('skips pages without text', () => {
    expect(chunkPages([{ page: 1, text: '12' }])).toEqual([]);
  });

  it('picks a page range within a budget', () => {
    const chunks = chunkPages([
      { page: 1, text: LONG },
      { page: 2, text: LONG },
      { page: 3, text: LONG }
    ]);
    const picked = chunksInRange(chunks, 2, 3, 3000);
    expect(picked.every((chunk) => chunk.page >= 2 && chunk.page <= 3)).toBe(true);
    expect(picked.reduce((sum, chunk) => sum + chunk.text.length, 0)).toBeLessThanOrEqual(3000);
  });
});

describe('keyword retrieval', () => {
  const chunks = chunkPages([
    { page: 1, text: 'Photosynthesis happens in chloroplasts and needs light, water and carbon dioxide.' },
    { page: 4, text: 'Mitochondria are the site of cellular respiration and produce ATP for the cell.' },
    { page: 7, text: 'Sistem pencernaan manusia memecah makanan menjadi zat gizi yang diserap usus halus.' }
  ]);

  it('ranks the chunk that shares the query terms first', () => {
    expect(retrieve(chunks, 'Where is ATP produced by mitochondria?')[0]).toMatchObject({ page: 4 });
  });

  it('works for Indonesian and ignores diacritics and stopwords', () => {
    expect(tokenize('Apa itu pencernaan?')).toEqual(['pencernaan']);
    expect(retrieve(chunks, 'apa fungsi usus halus dalam pencernaan')[0]).toMatchObject({ page: 7 });
  });

  it('returns nothing when no term matches, so the panel can say evidence is insufficient', () => {
    expect(retrieve(chunks, 'quantum chromodynamics')).toEqual([]);
    expect(retrieve(chunks, 'the of and')).toEqual([]);
  });
});
