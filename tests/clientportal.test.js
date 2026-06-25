// Client portal: data-priming + send-message (ported from PRs #6/#8/#9). The Edge Functions
// (get-my-*, send-message) are server-side and can't run offline, so this drives the real
// client-side wiring up to the network boundary: the exposed functions, local-only priming,
// the in-memory reload, the compose UI render, and sendMessage's offline/empty handling.
const { runSuite } = require('./harness');

const BODY = `
  T('CPT0 the ported functions are exposed', () => {
    ok(window.Backend && typeof window.Backend.setLocalRaw === 'function', 'Backend.setLocalRaw');
    ok(typeof window.jpReloadFromLocal === 'function', 'jpReloadFromLocal');
    ok(window.CP && typeof window.CP.sendMessage === 'function', 'CP.sendMessage');
    ok(window.CP && typeof window.CP.open === 'function', 'CP.open');
  });

  T('CPT1 Backend.setLocalRaw writes to localStorage', () => {
    window.Backend.setLocalRaw('ctp_test_raw', JSON.stringify({ ok: 1 }));
    ok(localStorage.getItem('ctp_test_raw') === '{\"ok\":1}', 'value written: ' + localStorage.getItem('ctp_test_raw'));
    localStorage.removeItem('ctp_test_raw');
  });

  T('CPT2 jpReloadFromLocal re-reads ctp_projects into the in-memory list', () => {
    window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{ id: 9001, name: 'Primed Client', stage: 'Active' }]));
    window.jpReloadFromLocal();
    const list = window.jpProjects();
    ok(list.some(p => String(p.id) === '9001'), 'primed project visible in jpProjects(): ' + list.length);
  });

  T('CPT3 CP.open renders the client detail incl. the message compose box', () => {
    window.CP.open('9001');
    const ta = document.getElementById('cp-msg-text');
    const btn = document.getElementById('cp-msg-send');
    ok(ta, '#cp-msg-text textarea rendered');
    ok(btn && /Send message/.test(btn.textContent), '#cp-msg-send button rendered');
  });

  T('CPT4 sendMessage with empty text is a no-op (no error shown)', () => {
    window.CP.open('9001');
    const ta = document.getElementById('cp-msg-text'); ta.value = '   ';
    window.CP.sendMessage();
    const err = document.getElementById('cp-msg-err');
    ok(!err || err.style.display === 'none', 'no error for empty message');
  });

  T('CPT5 sendMessage offline surfaces an inline error AND preserves the typed text', () => {
    window.CP.open('9001');
    const ta = document.getElementById('cp-msg-text'); ta.value = 'Hi team, any update?';
    const _supa = window.supa; window.supa = null;        // force the offline path
    window.CP.sendMessage();
    const err = document.getElementById('cp-msg-err');
    const ta2 = document.getElementById('cp-msg-text');
    ok(err && err.style.display === 'block' && /offline/i.test(err.textContent), 'inline offline error shown: ' + (err && err.textContent));
    ok(ta2 && ta2.value === 'Hi team, any update?', 'typed text preserved, not cleared');
    ok(ta2 && ta2.disabled === false, 'input re-enabled after failure');
    window.supa = _supa;
  });

  await TA('CPT6 sendMessage success path appends to the local thread + re-renders (stubbed function)', async () => {
    window.CP.open('9001');
    const ta = document.getElementById('cp-msg-text'); ta.value = 'Looks great, thanks!';
    window.supa = { functions: { invoke: function(name, opts){
      return Promise.resolve({ data: { message: { id: 'srv1', body: opts.body.body, ts: 1234, channel: 'app' } } });
    } } };
    window.CP.sendMessage();
    await new Promise(function(r){ setTimeout(r, 80); });
    const store = JSON.parse(localStorage.getItem('ctp_messages') || '{}');
    const th = store['c:9001'] || [];
    ok(th.some(function(m){ return m.body === 'Looks great, thanks!' && m.dir === 'in'; }), 'message appended to c:9001 thread: ' + JSON.stringify(th));
  });
`;

if (require.main === module) runSuite('CLIENT PORTAL (priming + send-message)', BODY).then(code => process.exit(code));
module.exports = { BODY };
