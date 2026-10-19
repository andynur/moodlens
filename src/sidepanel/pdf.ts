/**
 * Local PDF text extraction (ML-007). PDF.js and its worker ship inside the extension package; no
 * remote code, no network. The PDF is a file the student picked; its text stays in panel memory.
 */
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  cleanDocText,
  extractionReport,
  MAX_DOC_CHARS,
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  type DocPage,
  type ExtractionReport
} from '../shared/ai/documents';

export type PdfResult =
  | { ok: true; pages: DocPage[]; report: ExtractionReport }
  | { ok: false; error: 'too-large' | 'password' | 'unreadable' };

export async function extractPdf(file: File): Promise<PdfResult> {
  if (file.size > MAX_PDF_BYTES) return { ok: false, error: 'too-large' };
  // Loaded on first use so the panel opens without the PDF engine.
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
    useSystemFonts: false,
    enableXfa: false,
    stopAtErrors: false
  });
  let doc: Awaited<typeof task.promise>;
  try {
    doc = await task.promise;
  } catch (error) {
    void task.destroy();
    return { ok: false, error: (error as { name?: string }).name === 'PasswordException' ? 'password' : 'unreadable' };
  }
  try {
    if (doc.numPages > MAX_PDF_PAGES) return { ok: false, error: 'too-large' };
    const pages: DocPage[] = [];
    const failed: number[] = [];
    let total = 0;
    for (let number = 1; number <= doc.numPages && total < MAX_DOC_CHARS; number++) {
      try {
        const page = await doc.getPage(number);
        const content = await page.getTextContent();
        let text = '';
        for (const item of content.items) {
          if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ');
        }
        const clean = cleanDocText(text);
        total += clean.length;
        pages.push({ page: number, text: clean });
        page.cleanup();
      } catch {
        failed.push(number);
      }
    }
    return { ok: true, pages, report: extractionReport(doc.numPages, pages, failed) };
  } finally {
    void task.destroy();
  }
}
