// "View as Client": an admin previews the client portal exactly as the client sees it — sidebar
// hidden, landed directly on the job (no picker), Exit-preview bar shown — and Exit restores admin.
// Drives the real shipped ctpViewAsClient / ctpExitClientPreview against the real portal render.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
  ok(typeof window.ctpViewAsClient === 'function', 'ctpViewAsClient exposed');
  ok(typeof window.ctpExitClientPreview === 'function', 'ctpExitClientPreview exposed');

  // seed one project so the portal can render the job directly
  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 777, name: 'Test Client', address: '1 Pool Ln', phone: '', email: '', num: 'EST-777',
    value: 50000, sqft: '450', stage: 'Active', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function sidebarHidden(){ var n = document.querySelector('.sb .nav'); return !!(n && n.style.display === 'none'); }
  function bannerShown(){ var b = document.getElementById('ctp-client-preview-bar'); return !!(b && b.style.display === 'flex'); }
  function role(){ return document.body.getAttribute('data-ctp-role'); }

  T('VAC1 entering preview hides the admin sidebar + shows the Exit-preview bar', () => {
    window.ctpViewAsClient('777', -1);
    ok(role() === 'client', 'body role is client, got ' + role());
    ok(sidebarHidden(), 'admin sidebar hidden');
    ok(bannerShown(), 'preview bar shown');
    ok(document.body.classList.contains('ctp-client-preview'), 'preview class on body');
  });
  T('VAC2 it lands on the client portal page, directly on the job (no picker)', () => {
    const cp = document.getElementById('page-clientportal');
    ok(cp && cp.classList.contains('active'), 'client portal page active');
    // the per-job client detail rendered (its message compose box exists) — not the project picker
    ok(document.getElementById('cp-msg-text'), 'job detail rendered (compose box present, not the picker)');
  });
  T('VAC3 Exit preview restores the admin chrome and hides the bar', () => {
    window.ctpExitClientPreview();
    ok(role() === 'admin', 'body role restored to admin, got ' + role());
    ok(!sidebarHidden(), 'admin sidebar visible again');
    ok(!bannerShown(), 'preview bar hidden');
    ok(!document.body.classList.contains('ctp-client-preview'), 'preview class removed');
  });

  // ── entry point #2: from the Client Portal page itself ──
  T('VAC4 the Client Portal detail shows a "View as client" admin button (not in preview)', () => {
    document.body.classList.remove('ctp-client-preview');
    nav('clientportal'); CP.open('777');
    const pane = document.getElementById('cp-pane');
    ok(/CP\\.viewAsClient\\(\\)/.test(pane.innerHTML), 'admin View-as-client button present in the portal detail');
  });
  T('VAC5 CP.viewAsClient enters preview (chrome hidden) and removes the admin button', () => {
    CP.viewAsClient();
    ok(role() === 'client', 'role client');
    ok(sidebarHidden(), 'admin sidebar hidden');
    ok(bannerShown(), 'preview bar shown');
    ok(!/CP\\.viewAsClient\\(\\)/.test(document.getElementById('cp-pane').innerHTML), 'admin button hidden during preview');
  });
  T('VAC6 Exit from a portal-initiated preview returns to the Client Portal (admin)', () => {
    window.ctpExitClientPreview();
    ok(role() === 'admin', 'role admin');
    ok(!sidebarHidden(), 'sidebar restored');
    const cp = document.getElementById('page-clientportal');
    ok(cp && cp.classList.contains('active'), 'back on the client portal page');
    ok(document.getElementById('cp-msg-text'), 'job re-rendered in admin view');
  });
`;

if (require.main === module) runSuite('VIEW AS CLIENT (portal preview)', BODY).then(code => process.exit(code));
module.exports = { BODY };
