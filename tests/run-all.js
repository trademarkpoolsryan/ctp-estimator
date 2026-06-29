// Runs every browser suite in sequence and exits non-zero if any fail.
const { runSuite } = require('./harness');

const SUITES = [
  ['SOLVER MATH', require('./solver.test').BODY],
  ['RENDER / DOM', require('./render.test').BODY],
  ['ADVERSARIAL', require('./adversarial.test').BODY],
  ['END-TO-END BUILD (real seed-template estimate)', require('./e2e-build.test').BODY],
  ['FULL UI END-TO-END (real estimate, real DOM events)', require('./e2e-ui.test').BODY],
  ['ROUNDING — CROSS-SURFACE CONSISTENCY (real estimate)', require('./rounding.test').BODY],
  ['ESTIMATE → ACTIVE PROJECT (contract value)', require('./activate.test').BODY],
  ['PROJECT BUDGET (signed rounded pricing)', require('./budget.test').BODY],
  ['EDIT JOB # / NAME (from the estimate sheet)', require('./editmeta.test').BODY],
  ['VERSION HISTORY (per-estimate scope)', require('./history.test').BODY],
  ['CLIENT PORTAL (priming + send-message)', require('./clientportal.test').BODY],
  ['POOL SAFETY ACT §115922 (checklist → proposal)', require('./safety.test').BODY],
  ['NAV HISTORY (Back button stays in-app)', require('./navhistory.test').BODY],
  ['HOME LAUNCHER (Settings + Support tiles)', require('./homescreen.test').BODY],
  ['CLIENT VIEW (one shared pill toggle)', require('./viewasclient.test').BODY],
  ['CLIENT DOCUMENT UPLOADS (portal Documents card)', require('./clientdocs.test').BODY],
  ['ATTENTION STRIP (portal action items)', require('./attention.test').BODY],
  ['CLIENT PORTAL OVERHAUL (tabs + curated finishes)', require('./portal.test').BODY],
  ['JOB PORTAL — SITE PHOTOS (stage-tagged)', require('./jobphotos.test').BODY],
];

(async () => {
  let failed = 0;
  for (const [title, body] of SUITES) failed += await runSuite(title, body);
  console.log(`\n========================================`);
  console.log(failed ? `RESULT: ${failed} suite(s) had failures.` : 'RESULT: all suites passed.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
