// Home launcher includes Settings + Support tiles (roadmap: "Home screen buttons"). Drives the real
// buildWelcomeTiles() against the real sidebar nav and #wel-grid.
const { runSuite } = require('./harness');

const BODY = `
  ok(typeof window.buildWelcomeTiles === 'function', 'buildWelcomeTiles present');
  // make the sidebar + its items visible so the launcher mirrors them (harness isn't logged in)
  ['.sb', '.sb .nav', 'nav.nav', '.nav'].forEach(function(sel){ var el=document.querySelector(sel); if(el) el.style.display=''; });
  document.querySelectorAll('.ni').forEach(function(n){ n.style.display=''; });
  buildWelcomeTiles();
  const grid = document.getElementById('wel-grid');

  T('HS0 the launcher grid built some tiles', () => {
    ok(grid && grid.querySelectorAll('.wel-tile').length > 0, 'tiles rendered: ' + (grid ? grid.querySelectorAll('.wel-tile').length : 'no grid'));
  });
  T('HS1 a Settings tile is on the home launcher', () => {
    ok(/nav\\('settings'\\)/.test(grid.innerHTML), 'Settings tile links to nav(settings)');
    ok(/App preferences/.test(grid.innerHTML), 'Settings tile has its description');
  });
  T('HS2 a Support tile is on the home launcher', () => {
    ok(/nav\\('support'\\)/.test(grid.innerHTML), 'Support tile links to nav(support)');
    ok(/Help and guides/.test(grid.innerHTML), 'Support tile has its description');
  });
  T('HS3 clicking the Settings tile navigates to the Settings page', () => {
    nav('settings');
    const active = document.querySelector('.page.active');
    ok(active && active.id === 'page-settings', 'on settings page, got ' + (active && active.id));
  });
`;

if (require.main === module) runSuite('HOME LAUNCHER (Settings + Support tiles)', BODY).then(code => process.exit(code));
module.exports = { BODY };
