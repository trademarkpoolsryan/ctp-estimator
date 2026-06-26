// Browser Back/Forward stays inside the app, and the LAST Back lands on the Home (welcome) screen
// before the app ever exits. Each top-level nav() records a history entry on top of a seeded Home
// entry. Drives the REAL nav() + showWelcome() + the real popstate handler.
const { runSuite } = require('./harness');

const BODY = `
  function activeId(){ var el = document.querySelector('.page.active'); return el ? el.id : null; }
  function welcomeShown(){ var w = document.getElementById('welcome-screen'); return !!(w && w.style.display === 'block'); }
  function settle(){ return new Promise(function(r){ setTimeout(r, 150); }); }

  ok(typeof nav === 'function', 'nav present');
  ok(typeof window.showWelcome === 'function', 'showWelcome present');

  // First nav seeds [Home, settings]; second pushes support → [Home, settings, support]
  nav('settings'); nav('support');

  T('NH1 navigations switch the active page + record a ctpPage entry', () => {
    ok(activeId() === 'page-support', 'on support, got ' + activeId());
    ok(history.state && history.state.ctpPage === 'support', 'state: ' + JSON.stringify(history.state));
  });
  await TA('NH2 Back returns to the previous in-app page', async () => {
    history.back(); await settle();
    ok(activeId() === 'page-settings', 'back -> settings, got ' + activeId());
  });
  await TA('NH3 the LAST Back lands on the Home screen (not out of the app)', async () => {
    history.back(); await settle();
    ok(welcomeShown(), 'welcome/home screen is shown');
    ok(history.state && history.state.ctpPage === '__home__', 'at the seeded Home entry: ' + JSON.stringify(history.state));
  });
  await TA('NH4 Forward from Home re-enters the app and hides the home screen', async () => {
    history.forward(); await settle();
    ok(activeId() === 'page-settings', 'forward -> settings, got ' + activeId());
    ok(!welcomeShown(), 'home screen hidden again');
  });
  await TA('NH5 a popstate with no ctpPage is ignored (so a real Back from Home leaves the app)', async () => {
    const before = activeId();
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    await settle();
    ok(activeId() === before, 'null-state popstate is a no-op, stayed on ' + activeId());
  });
  T('NH6 going Home via showWelcome() records a Home history entry', () => {
    nav('settings');                 // move off home first
    window.showWelcome();            // sidebar-logo "Back to home"
    ok(welcomeShown(), 'home shown via showWelcome');
    ok(history.state && history.state.ctpPage === '__home__', 'logo-home recorded a Home entry: ' + JSON.stringify(history.state));
  });
`;

if (require.main === module) runSuite('NAV HISTORY (Back stays in-app, last Back → Home)', BODY).then(code => process.exit(code));
module.exports = { BODY };
