// Runs quality gates in parallel and prints a short summary, so agents spend few tokens on output.
// Usage: `npm run check` (all gates) or `npm run check -- lint test` (named gates only).
// Full output for a failed step: run that step's command directly.
import { spawn } from 'node:child_process';

const MAX_LINES = 15;
const CACHE = 'node_modules/.cache';
const bin = (name) => `node_modules/.bin/${name}`;
const steps = [
  {
    name: 'lint',
    cmd: `${bin('eslint')} . --cache --cache-location ${CACHE}/eslint/ --format ./scripts/eslint-unix-formatter.cjs`,
    pick: /:\d+:\d+:/
  },
  { name: 'format', cmd: `${bin('prettier')} --check . --cache --log-level warn`, pick: /\[warn\]/ },
  {
    name: 'typecheck',
    cmd: `${bin('tsc')} --noEmit --pretty false --incremental --tsBuildInfoFile ${CACHE}/tsc.tsbuildinfo`,
    pick: /error TS\d+/
  },
  { name: 'test', cmd: `${bin('vitest')} run --reporter=dot`, pick: /FAIL|AssertionError|Error:|✗|×/ },
  {
    name: 'build',
    cmd: `${bin('vite')} build --logLevel error && node scripts/build-extension.mjs`,
    pick: /error|Error/
  }
];

const wanted = process.argv.slice(2);
const unknown = wanted.filter((name) => !steps.some((step) => step.name === name));
if (unknown.length) {
  console.log(`Unknown step(s): ${unknown.join(', ')}. Known: ${steps.map((step) => step.name).join(', ')}`);
  process.exit(2);
}
const selected = wanted.length ? steps.filter((step) => wanted.includes(step.name)) : steps;

const run = (step) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(step.cmd, { shell: true, env: { ...process.env, NO_COLOR: '1' } });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (status) => resolve({ step, status, output, seconds: (Date.now() - started) / 1000 }));
  });

const results = await Promise.all(selected.map(run));
let failed = 0;
for (const { step, status, output, seconds } of results) {
  const time = `${seconds.toFixed(1)}s`;
  if (status === 0) {
    console.log(`✓ ${step.name} ${time}`);
    continue;
  }
  failed++;
  // Strip ANSI colors some tools emit even without a TTY, so `pick` patterns match.
  const lines = output
    .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')
    .split('\n')
    .filter((line) => step.pick.test(line));
  console.log(`✗ ${step.name} ${time} (${lines.length} matching lines; command: ${step.cmd})`);
  for (const line of lines.slice(0, MAX_LINES)) console.log(`  ${line.trim().slice(0, 240)}`);
  if (lines.length > MAX_LINES) console.log(`  … ${lines.length - MAX_LINES} more`);
  if (!lines.length) console.log(`  ${output.trim().split('\n').slice(-3).join('\n  ').slice(0, 480)}`);
}
console.log(
  failed ? `FAILED: ${failed} step(s)` : `ALL CHECKS PASSED (${selected.map((step) => step.name).join(', ')})`
);
process.exit(failed ? 1 : 0);
