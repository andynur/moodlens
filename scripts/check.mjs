// Runs every quality gate and prints a short summary, so agents spend few tokens on output.
// Full output for a failed step: run that step's command directly.
import { spawnSync } from 'node:child_process';

const MAX_LINES = 15;
const steps = [
  { name: 'lint', cmd: 'npx eslint . --format ./scripts/eslint-unix-formatter.cjs', pick: /:\d+:\d+:/ },
  { name: 'format', cmd: 'npx prettier --check . --log-level warn', pick: /\[warn\]/ },
  { name: 'typecheck', cmd: 'npx tsc --noEmit --pretty false', pick: /error TS\d+/ },
  { name: 'test', cmd: 'npx vitest run --reporter=dot', pick: /FAIL|AssertionError|Error:|✗|×/ },
  { name: 'build', cmd: 'npx vite build --logLevel error && node scripts/build-extension.mjs', pick: /error|Error/ }
];

let failed = 0;
for (const step of steps) {
  const run = spawnSync(step.cmd, { shell: true, encoding: 'utf8' });
  if (run.status === 0) {
    console.log(`✓ ${step.name}`);
    continue;
  }
  failed++;
  const lines = `${run.stdout}\n${run.stderr}`.split('\n').filter((l) => step.pick.test(l));
  console.log(`✗ ${step.name} (${lines.length} matching lines; command: ${step.cmd})`);
  for (const line of lines.slice(0, MAX_LINES)) console.log(`  ${line.trim().slice(0, 240)}`);
  if (lines.length > MAX_LINES) console.log(`  … ${lines.length - MAX_LINES} more`);
}
console.log(failed ? `FAILED: ${failed} step(s)` : 'ALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
