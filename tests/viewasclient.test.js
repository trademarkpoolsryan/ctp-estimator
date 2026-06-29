// "Client view" — one consistent pill toggle (the .set-switch teal slider) wherever we offer a client
// preview. Flipping it on renders the portal's CLIENT-facing view (in-portal admin controls hidden) but
// KEEPS the admin sidebar nav visible so the admin is never trapped in client chrome; off restores the
// admin portal view. Navigating away cleanly drops the preview. Reachable from the Job Portal toolbar
// and the Client Portal detail.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
  ok(typeof window.ctpToggleClientView === 'function', 'ctpToggleClientView exposed');

  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 777, name: 'Test Client', address: '1 Pool Ln', phone: '', email: '', num: 'EST-777',
    value: 50000, sqft: '450', stage: 'Active', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function navHidden(){ var n = document.querySelector('.sb .nav'); return !!(n && n.style.display === 'none'); }
  function inPreview(){ return document.body.classList.contains('ctp-client-preview'); }
  function cpTgl(){ return document.getElementById('cp-vac-toggle'); }

  T('VAC0 the Job Portal control is the shared "Client view" pill toggle', () => {
    const t = document.getElementById('jp-vac-toggle');
    ok(t && t.type === 'checkbox', '#jp-vac-toggle is a checkbox');
    const wrap = t.closest('.vac-tgl');
    ok(wrap, 'wrapped in .vac-tgl');
    ok(t.closest('.set-switch'), 'uses the .set-switch slider component');
    ok(/Client view/.test(wrap.textContent), 'labeled "Client view"');
  });

  T('VAC1 the Client Portal control is the SAME pill toggle, off when browsing', () => {
    document.body.classList.remove('ctp-client-preview');
    nav('clientportal'); CP.open('777');
    const t = cpTgl();
    ok(t && t.type === 'checkbox', '#cp-vac-toggle is a checkbox');
    ok(t.closest('.vac-tgl') && t.closest('.set-switch'), 'same .vac-tgl/.set-switch component');
    ok(!t.checked, 'toggle OFF while browsing');
    ok(/All client portals/.test(document.getElementById('cp-pane').innerHTML), 'admin back present when browsing');
  });

  T('VAC2 toggle ON shows the client view but KEEPS the admin nav visible (never trapped)', () => {
    CP.tab('selections');                 // a tab that has an admin-only control to verify it hides
    CP.toggleClientView(true);
    ok(inPreview(), 'preview flag set (portal renders client view)');
    ok(!navHidden(), 'admin sidebar nav STAYS visible in preview');
    const t = cpTgl();
    ok(t && t.checked, 'toggle is ON (checked → teal track)');
    ok(!document.getElementById('cp-fin-sel'), 'in-portal admin control (Add finish) hidden in client view');
    ok(document.getElementById('cp-msg-text'), 'job detail rendered (not the picker)');
  });

  T('VAC3 flipping it OFF restores the admin portal view, nav still visible', () => {
    CP.toggleClientView(false);
    ok(!inPreview(), 'preview flag cleared');
    ok(!navHidden(), 'nav visible');
    const cp = document.getElementById('page-clientportal');
    ok(cp && cp.classList.contains('active'), 'still on the client portal page');
    ok(cpTgl() && !cpTgl().checked, 'toggle back OFF');
  });

  T('VAC4 the Job Portal entry point drives the same preview, nav still visible', () => {
    window.ctpToggleClientView(true, '777', { kind:'job', idx: -1 });
    ok(inPreview(), 'preview flag set');
    ok(!navHidden(), 'nav visible during preview');
    ok(cpTgl() && cpTgl().checked, 'portal toggle checked during preview');
  });

  T('VAC5 navigating away via the nav cleanly exits the preview', () => {
    ok(inPreview(), 'starts in preview');
    nav('projects');                       // click any other admin page
    ok(!inPreview(), 'preview dropped on navigation away');
    ok(!navHidden(), 'nav visible');
  });
`;

if (require.main === module) runSuite('CLIENT VIEW (one shared pill toggle)', BODY).then(code => process.exit(code));
module.exports = { BODY };
