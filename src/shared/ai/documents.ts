/**
 * Local document text, chunks and keyword retrieval (ML-007, ML-009). Document text is untrusted data:
 * it is cleaned, size-limited and only ever quoted as evidence, never treated as instructions.
 */

export interface DocPage {
  /** 1-based page number as the PDF viewer shows it. */
  page: number;
  text: string;
}

export interface DocChunk {
  id: string;
  page: number;
  text: string;
}

export type ScanState = 'none' | 'partial' | 'all';

export interface ExtractionReport {
  pageCount: number;
  textPages: number;
  /** Pages with almost no text: likely scanned images. */
  emptyPages: number[];
  /** Pages PDF.js could not read. */
  failedPages: number[];
  scanned: ScanState;
}

export const MAX_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_PDF_PAGES = 400;
export const MAX_PAGE_CHARS = 20_000;
export const MAX_DOC_CHARS = 1_500_000;
/** A page with fewer letters than this is treated as an image page. */
const MIN_PAGE_TEXT = 25;
const CHUNK_CHARS = 1_200;
const CHUNK_OVERLAP = 150;

/** Strips control and bidi-override characters and collapses whitespace. */
export function cleanDocText(input: string, max = MAX_PAGE_CHARS): string {
  return (
    input
      // eslint-disable-next-line no-control-regex -- removing control characters is the point
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, max)
  );
}

/** Summarizes an extraction so the panel can warn about scanned PDFs and missing pages. */
export function extractionReport(pageCount: number, pages: readonly DocPage[], failedPages: readonly number[]) {
  const emptyPages: number[] = [];
  let textPages = 0;
  for (const page of pages) {
    if (page.text.replace(/[^\p{L}\p{N}]/gu, '').length < MIN_PAGE_TEXT) emptyPages.push(page.page);
    else textPages += 1;
  }
  const scanned: ScanState = textPages === 0 ? 'all' : emptyPages.length > 0 ? 'partial' : 'none';
  return { pageCount, textPages, emptyPages, failedPages: [...failedPages], scanned } satisfies ExtractionReport;
}

/** Splits each page into overlapping chunks. Chunks never cross a page, so every citation is one page. */
export function chunkPages(pages: readonly DocPage[]): DocChunk[] {
  const chunks: DocChunk[] = [];
  let total = 0;
  for (const page of pages) {
    const text = cleanDocText(page.text);
    if (text.replace(/[^\p{L}\p{N}]/gu, '').length < MIN_PAGE_TEXT) continue;
    let start = 0;
    while (start < text.length && total < MAX_DOC_CHARS) {
      let end = Math.min(text.length, start + CHUNK_CHARS);
      if (end < text.length) {
        const space = text.lastIndexOf(' ', end);
        if (space > start + CHUNK_CHARS / 2) end = space;
      }
      const piece = text.slice(start, end).trim();
      if (piece) {
        chunks.push({ id: `c${chunks.length + 1}`, page: page.page, text: piece });
        total += piece.length;
      }
      if (end >= text.length) break;
      start = Math.max(end - CHUNK_OVERLAP, start + 1);
    }
  }
  return chunks;
}

const STOPWORDS = new Set(
  (
    'the a an and or of to in on for is are was were be been with as by at from this that these those it its ' +
    'what which who whom how why when where do does did can could should would will about into than then there ' +
    'yang dan atau di ke dari ini itu adalah ialah untuk dengan pada dalam oleh sebagai juga tidak bukan apa ' +
    'bagaimana mengapa kenapa kapan dimana siapa akan sudah telah dapat bisa harus jika karena maka tersebut'
  ).split(' ')
);

/** Lowercase word tokens without diacritics or stopwords; works for English and Indonesian text. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

export interface ScoredChunk extends DocChunk {
  score: number;
}

/** BM25 keyword retrieval. Returns only chunks that share at least one query term, best first. */
export function retrieve(chunks: readonly DocChunk[], query: string, limit = 6): ScoredChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0 || chunks.length === 0) return [];
  const docs = chunks.map((chunk) => tokenize(chunk.text));
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const frequency = new Map<string, number>();
  for (const doc of docs) for (const term of new Set(doc)) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const k1 = 1.2;
  const b = 0.75;
  const scored: ScoredChunk[] = [];
  docs.forEach((doc, index) => {
    let score = 0;
    for (const term of terms) {
      const tf = doc.filter((token) => token === term).length;
      if (tf === 0) continue;
      const df = frequency.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.length) / average));
    }
    const chunk = chunks[index];
    if (score > 0 && chunk) scored.push({ ...chunk, score });
  });
  return scored.sort((x, y) => y.score - x.score || x.page - y.page).slice(0, limit);
}

/** Chunks of a page range, in page order, until the character budget is spent. */
export function chunksInRange(chunks: readonly DocChunk[], from: number, to: number, maxChars: number): DocChunk[] {
  const picked: DocChunk[] = [];
  let used = 0;
  for (const chunk of chunks) {
    if (chunk.page < from || chunk.page > to) continue;
    if (used + chunk.text.length > maxChars) break;
    picked.push(chunk);
    used += chunk.text.length;
  }
  return picked;
}
