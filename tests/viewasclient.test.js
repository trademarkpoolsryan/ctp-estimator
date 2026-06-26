// "Client view" — one consistent pill toggle (the .set-switch teal slider) everywhere we offer a
// client preview. Flipping it on hides the admin chrome and lands on the job as the client sees it;
// off restores admin. Reachable from the Job Portal toolbar and the Client Portal detail.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
  ok(typeof window.ctpToggleClientView === 'function', 'ctpToggleClientView exposed');

  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 777, name: 'Test Client', address: '1 Pool Ln', phone: '', email: '', num: 'EST-777',
    value: 50000, sqft: '450', stage: 'Active', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function sidebarHidden(){ var n = document.querySelector('.sb .nav'); return !!(n && n.style.display === 'none'); }
  function role(){ return document.body.getAttribute('data-ctp-role'); }
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

  T('VAC2 flipping the toggle ON enters preview: chrome hidden, toggle checked (teal)', () => {
    CP.toggleClientView(true);
    ok(role() === 'client', 'role client');
    ok(sidebarHidden(), 'admin sidebar hidden');
    const t = cpTgl();
    ok(t && t.checked, 'toggle is ON (checked → teal track)');
    ok(!/All client portals/.test(document.getElementById('cp-pane').innerHTML), 'admin back hidden in preview');
    ok(document.getElementById('cp-msg-text'), 'job detail rendered (not the picker)');
  });

  T('VAC3 flipping it OFF exits preview back to the admin Client Portal', () => {
    CP.toggleClientView(false);
    ok(role() === 'admin', 'role admin');
    ok(!sidebarHidden(), 'sidebar restored');
    const cp = document.getElementById('page-clientportal');
    ok(cp && cp.classList.contains('active'), 'still on the client portal page');
    ok(cpTgl() && !cpTgl().checked, 'toggle back OFF');
  });

  T('VAC4 the Job Portal entry point drives the same preview (toggle on the portal goes checked)', () => {
    window.ctpToggleClientView(true, '777', { kind:'job', idx: -1 });
    ok(role() === 'client', 'role client');
    ok(sidebarHidden(), 'sidebar hidden');
    ok(cpTgl() && cpTgl().checked, 'portal toggle checked during preview');
  });
  T('VAC5 exit restores the admin chrome', () => {
    window.ctpToggleClientView(false);
    ok(role() === 'admin', 'role admin');
    ok(!sidebarHidden(), 'sidebar restored');
  });
`;

if (require.main === module) runSuite('CLIENT VIEW (one shared pill toggle)', BODY).then(code => process.exit(code));
module.exports = { BODY };
