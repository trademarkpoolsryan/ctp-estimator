// Browser Back/Forward stays inside the app: each top-level nav() records a history entry, and
// history.back()/forward() step through the in-app pages instead of leaving on the first press.
// Drives the REAL nav() + the real popstate handler against the real page elements.
const { runSuite } = require('./harness');

const BODY = `
  function activeId(){ var el = document.querySelector('.page.active'); return el ? el.id : null; }
  function settle(){ return new Promise(function(r){ setTimeout(r, 150); }); }

  ok(typeof nav === 'function', 'nav present');
  // three plain top-level pages (no heavy nav side-effects): settings -> support -> vendors
  nav('settings'); nav('support'); nav('vendors');

  T('NH1 navigations switch the active page', () => {
    ok(activeId() === 'page-vendors', 'on vendors, got ' + activeId());
  });
  T('NH2 the current page recorded a ctpPage history entry', () => {
    ok(history.state && history.state.ctpPage === 'vendors', 'history.state: ' + JSON.stringify(history.state));
  });
  await TA('NH3 Back returns to the previous in-app page (does NOT leave the app)', async () => {
    history.back(); await settle();
    ok(activeId() === 'page-support', 'back -> support, got ' + activeId());
  });
  await TA('NH4 Back again steps further back through in-app pages', async () => {
    history.back(); await settle();
    ok(activeId() === 'page-settings', 'back -> settings, got ' + activeId());
  });
  await TA('NH5 Forward re-advances through the in-app pages', async () => {
    history.forward(); await settle();
    ok(activeId() === 'page-support', 'forward -> support, got ' + activeId());
  });
  await TA('NH6 a popstate with no ctpPage is ignored (lets the real Back leave the app)', async () => {
    const before = activeId();
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await settle();
    ok(activeId() === before, 'null-state popstate is a no-op, stayed on ' + activeId());
  });
`;

if (require.main === module) runSuite('NAV HISTORY (Back button stays in-app)', BODY).then(code => process.exit(code));
module.exports = { BODY };
