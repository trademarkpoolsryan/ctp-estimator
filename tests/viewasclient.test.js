// "View as Client": preview the client portal as the client sees it. The on/off control is the
// signature teal toggle (#cp-vac-btn) — same btn-s btn-sm + .active teal as Field Mode / Round —
// dark when off, teal in preview, exits on click. Reachable from the Job Portal and the Client Portal.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
  ok(typeof window.ctpViewAsClient === 'function', 'ctpViewAsClient exposed');
  ok(typeof window.ctpExitClientPreview === 'function', 'ctpExitClientPreview exposed');

  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 777, name: 'Test Client', address: '1 Pool Ln', phone: '', email: '', num: 'EST-777',
    value: 50000, sqft: '450', stage: 'Active', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function sidebarHidden(){ var n = document.querySelector('.sb .nav'); return !!(n && n.style.display === 'none'); }
  function role(){ return document.body.getAttribute('data-ctp-role'); }
  function vacBtn(){ return document.getElementById('cp-vac-btn'); }

  T('VAC0 the Job Portal button uses the signature toggle classes + id', () => {
    const b = document.getElementById('jp-vac-btn');
    ok(b, '#jp-vac-btn present');
    ok(/\\bbtn\\b/.test(b.className) && /\\bbtn-s\\b/.test(b.className) && /\\bbtn-sm\\b/.test(b.className), 'btn btn-s btn-sm: ' + b.className);
  });

  // ── admin browsing the Client Portal (not previewing) ──
  T('VAC1 portal detail shows the View-as-Client toggle in its OFF (dark) state', () => {
    document.body.classList.remove('ctp-client-preview');
    nav('clientportal'); CP.open('777');
    const b = vacBtn();
    ok(b, '#cp-vac-btn rendered');
    ok(/\\bbtn-s\\b/.test(b.className) && /\\bbtn-sm\\b/.test(b.className), 'signature classes: ' + b.className);
    ok(!b.classList.contains('active'), 'not active (off) when browsing');
    ok(/View as Client/.test(b.textContent), 'off label "View as Client"');
    ok(/All client portals/.test(document.getElementById('cp-pane').innerHTML), 'admin back present when browsing');
  });

  // ── enter preview: the toggle goes teal/active and exits on click ──
  T('VAC2 CP.viewAsClient enters preview: chrome hidden, toggle teal/.active = "Exit client view"', () => {
    CP.viewAsClient();
    ok(role() === 'client', 'role client');
    ok(sidebarHidden(), 'admin sidebar hidden');
    const b = vacBtn();
    ok(b && b.classList.contains('active'), 'toggle is .active (signature teal)');
    ok(/Exit client view/.test(b.textContent), 'on label "Exit client view"');
    ok(!/All client portals/.test(document.getElementById('cp-pane').innerHTML), 'admin back hidden in preview');
    ok(document.getElementById('cp-msg-text'), 'job detail rendered (not the picker)');
  });

  T('VAC3 clicking the teal toggle exits preview back to the admin Client Portal', () => {
    window.ctpExitClientPreview();
    ok(role() === 'admin', 'role admin');
    ok(!sidebarHidden(), 'sidebar restored');
    const cp = document.getElementById('page-clientportal');
    ok(cp && cp.classList.contains('active'), 'still on the client portal page');
    const b = vacBtn();
    ok(b && !b.classList.contains('active') && /View as Client/.test(b.textContent), 'toggle back to OFF');
  });

  // ── Job-Portal entry point: enter preview, exit returns to the job ──
  T('VAC4 entering via the Job Portal lands in preview (teal toggle on the portal)', () => {
    window.ctpViewAsClient('777', { kind:'job', idx: -1 });
    ok(role() === 'client', 'role client');
    ok(sidebarHidden(), 'sidebar hidden');
    const b = vacBtn();
    ok(b && b.classList.contains('active'), 'portal toggle active (teal) during preview');
  });
  T('VAC5 exit restores the admin chrome', () => {
    window.ctpExitClientPreview();
    ok(role() === 'admin', 'role admin');
    ok(!sidebarHidden(), 'sidebar restored');
  });
`;

if (require.main === module) runSuite('VIEW AS CLIENT (signature teal toggle)', BODY).then(code => process.exit(code));
module.exports = { BODY };
