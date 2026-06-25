// Runs every browser suite in sequence and exits non-zero if any fail.
const { runSuite } = require('./harness');

const SUITES = [
  ['SOLVER MATH', require('./solver.test').BODY],
  ['RENDER / DOM', require('./render.test').BODY],
  ['ADVERSARIAL', require('./adversarial.test').BODY],
  ['END-TO-END BUILD (real seed-template estimate)', require('./e2e-build.test').BODY],
  ['FULL UI END-TO-END (real estimate, real DOM events)', require('./e2e-ui.test').BODY],
  ['ROUNDING — CROSS-SURFACE CONSISTENCY (real estimate)', require('./rounding.test').BODY],
];

(async () => {
  let failed = 0;
  for (const [title, body] of SUITES) failed += await runSuite(title, body);
  console.log(`\n========================================`);
  console.log(failed ? `RESULT: ${failed} suite(s) had failures.` : 'RESULT: all suites passed.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
