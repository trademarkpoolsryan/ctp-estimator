// Shared test harness: launches the bundled Chromium and loads the real index.html.
// Portable — auto-detects the browser; no session-specific absolute paths.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs) {
      const p = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  return undefined; // fall back to Playwright's own resolution
}

const INDEX_HTML = path.resolve(__dirname, '..', 'index.html');

// Open the app and return { browser, page, pageErrors }.
async function openApp() {
  const exe = findChromium();
  const browser = await chromium.launch(exe ? { headless: true, executablePath: exe } : { headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e.message)));
  await page.goto('file://' + INDEX_HTML, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200); // let inline init settle (Supabase/CDN failures here are expected offline)
  return { browser, page, pageErrors };
}

// Pretty-print a result set of {name, pass, err}. Returns the number of failures.
function report(title, results, pageErrors) {
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  console.log(`\n===== ${title} =====`);
  results.forEach(r => console.log((r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.pass ? '' : '   -> ' + r.err)));
  console.log(`\n${passed}/${results.length} passed.`);
  if (pageErrors && pageErrors.length) {
    // Only surface errors that aren't the expected offline CDN/Supabase failures.
    const real = pageErrors.filter(e => !/createClient|ERR_CONNECTION|Failed to load resource/.test(e));
    if (real.length) console.log('Unexpected page errors:', real.slice(0, 8));
  }
  return failed.length;
}

// Assertion helpers injected into the page (stringified into page.evaluate bodies).
const PAGE_HELPERS = `
  const __out = [];
  function T(name, fn){ try { fn(); __out.push({name, pass:true}); } catch(e){ __out.push({name, pass:false, err:e.message}); } }
  function ok(c, m){ if(!c) throw new Error(m || 'assert failed'); }
  function close(a, b, m, t){ t = t==null?1e-3:t; if(Math.abs(a-b)>t) throw new Error((m||'')+' expected '+b+' got '+a); }
  function fire(el, type){ el.dispatchEvent(new Event(type, {bubbles:true})); }
  // Silence persistence side-effects (Supabase is offline in CI/sandbox).
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
`;

// Run one suite end-to-end: open app, evaluate `body` (a string of T(...) calls that
// use the injected helpers), report, close. Returns process exit code (0 ok, 1 fail).
async function runSuite(title, body) {
  const { browser, page, pageErrors } = await openApp();
  try {
    const results = await page.evaluate(`(() => { ${PAGE_HELPERS}\n${body}\nreturn __out; })()`);
    const failures = report(title, results, pageErrors);
    return failures ? 1 : 0;
  } finally {
    await browser.close();
  }
}

module.exports = { openApp, report, runSuite, PAGE_HELPERS, INDEX_HTML, findChromium };
