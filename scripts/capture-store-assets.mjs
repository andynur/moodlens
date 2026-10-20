// Renders the Chrome Web Store and README images from store-preview.html with synthetic data only.
// Usage: npm run store:assets   (set CHROME_PATH if Chrome is not in the default location)
// Starts the Vite dev server, drives headless Chrome over a CDP pipe (no extra dependency) and writes
// exact-size JPEGs into store-assets/.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'store-assets');
const chromePath =
  process.env.CHROME_PATH ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ].find((candidate) => existsSync(candidate));
if (!chromePath) throw new Error('Chrome not found; set CHROME_PATH.');

const labels = {
  en: { show: 'Show answer', choose: 'Choose PDF', prepare: 'Review what will be sent', send: 'Continue and send' },
  id: {
    show: 'Tampilkan jawaban',
    choose: 'Pilih PDF',
    prepare: 'Tinjau yang akan dikirim',
    send: 'Lanjutkan dan kirim'
  }
};

const shots = [];
for (const locale of ['en', 'id']) {
  shots.push(
    { file: `${locale}/01-today-1280x800.jpg`, query: `screen=today&locale=${locale}`, size: [1280, 800] },
    { file: `${locale}/02-tasks-1280x800.jpg`, query: `screen=tasks&locale=${locale}`, size: [1280, 800], scroll: 130 },
    {
      file: `${locale}/03-practice-1280x800.jpg`,
      query: `screen=practice&locale=${locale}`,
      size: [1280, 800],
      steps: [['click', labels[locale].show]],
      scroll: 200
    },
    {
      file: `${locale}/04-ai-1280x800.jpg`,
      query: `screen=ai&locale=${locale}`,
      size: [1280, 800],
      steps: [['pdf'], ['click', labels[locale].prepare], ['click', labels[locale].send]],
      scroll: 240
    },
    {
      file: `${locale}/05-consent-1280x800.jpg`,
      query: `screen=consent&locale=${locale}`,
      size: [1280, 800],
      steps: [['pdf'], ['click', labels[locale].prepare]],
      scroll: 120
    },
    { file: `marquee-${locale}-1400x560.jpg`, query: `asset=marquee&locale=${locale}`, size: [1400, 560] },
    { file: `hero-${locale}-1280x640.jpg`, query: `asset=hero&locale=${locale}`, size: [1280, 640] }
  );
}
shots.push({ file: 'promo-440x280.jpg', query: 'asset=promo', size: [440, 280] });

const work = mkdtempSync(path.join(tmpdir(), 'moodlens-assets-'));
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--remote-debugging-pipe',
    `--user-data-dir=${path.join(work, 'profile')}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank'
  ],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] }
);
let nextId = 1;
const pending = new Map();
let buffer = '';
chrome.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\0')) >= 0) {
    const message = JSON.parse(buffer.slice(0, index));
    buffer = buffer.slice(index + 1);
    if (message.method === 'Runtime.exceptionThrown') {
      console.error('page error:', message.params.exceptionDetails.exception?.description?.split('\n')[0]);
    }
    const waiter = pending.get(message.id);
    if (!waiter) continue;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
    else waiter.resolve(message.result);
  }
});
function send(method, params = {}, sessionId) {
  const id = nextId++;
  chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openPage(width, height) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
  return { targetId, sessionId };
}
async function evaluate(sessionId, expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed');
  return result.result.value;
}
async function until(sessionId, expression, what) {
  for (let i = 0; i < 50; i++) {
    if (await evaluate(sessionId, expression)) return;
    await wait(100);
  }
  throw new Error(`timed out waiting for ${what}`);
}

// A synthetic three-page lecture handout, printed by Chrome itself, for the AI screenshots.
async function makePdf() {
  const { targetId, sessionId } = await openPage(800, 1000);
  const page = (title, body) =>
    `<section style="page-break-after:always;font:16px/1.6 sans-serif;padding:40px"><h1>${title}</h1><p>${body.repeat(6)}</p></section>`;
  const html =
    page(
      'Stacks',
      'A stack is a last in, first out (LIFO) structure. Push adds an item on top and pop removes the newest item. '
    ) +
    page(
      'Queues',
      'A queue is a first in, first out (FIFO) structure. Enqueue adds at the back and dequeue removes the oldest item. Queues drive breadth-first search. '
    ) +
    page(
      'Linked lists',
      'With a linked list, push, pop, enqueue and dequeue each take constant time because only head or tail pointers change. '
    );
  await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` }, sessionId);
  await wait(500);
  const { data } = await send('Page.printToPDF', {}, sessionId);
  await send('Target.closeTarget', { targetId });
  const file = path.join(work, 'data-structures-week-4.pdf');
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

const clickText = (text) =>
  `(() => { const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === ${JSON.stringify(text)} && !el.disabled); if (b) b.click(); return Boolean(b); })()`;

try {
  const pdf = await makePdf();
  for (const shot of shots) {
    const [width, height] = shot.size;
    const { targetId, sessionId } = await openPage(width, height);
    await send('Page.navigate', { url: `${base}store-preview.html?${shot.query}` }, sessionId);
    await until(sessionId, `document.fonts.status === 'loaded' && document.querySelector('main') !== null`, 'render');
    await wait(600);
    for (const [kind, arg] of shot.steps ?? []) {
      if (kind === 'click') {
        await until(sessionId, clickText(arg), `button "${arg}"`);
      } else if (kind === 'pdf') {
        const { root: doc } = await send('DOM.getDocument', {}, sessionId);
        const { nodeId } = await send(
          'DOM.querySelector',
          { nodeId: doc.nodeId, selector: 'input[type=file]' },
          sessionId
        );
        await send('DOM.setFileInputFiles', { nodeId, files: [pdf] }, sessionId);
      }
      await wait(500);
    }
    if (shot.scroll) await evaluate(sessionId, `document.querySelector('.preview-panel').scrollTop = ${shot.scroll}`);
    await wait(300);
    const { data } = await send(
      'Page.captureScreenshot',
      { format: 'jpeg', quality: 90, clip: { x: 0, y: 0, width, height, scale: 1 } },
      sessionId
    );
    const file = path.join(out, shot.file);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, 'base64'));
    await send('Target.closeTarget', { targetId });
    console.log(`${shot.file} ${width}x${height}`);
  }
} finally {
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  await server.close();
  rmSync(work, { recursive: true, force: true, maxRetries: 5 });
}
