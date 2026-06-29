// Address autofill on the customer job-info form: typing in #e-addr suggests addresses and fills
// street/city/zip. Free Photon (no key) by default; upgrades to Google Places when a key is saved in
// Settings. The live geocoder needs network, so these tests stub the search (window._ctpAddrSearch) and
// drive the real dropdown + field-fill logic.
const { runSuite } = require('./harness');

const BODY = `
  ok(typeof window.ctpAddrApply === 'function', 'ctpAddrApply exposed');
  ok(typeof window.ctpAddrInit === 'function', 'ctpAddrInit exposed');
  window.ctpAddrInit();
  function f(id){ return document.getElementById(id); }

  T('ADR0 the address field is wired (native autocomplete disabled)', () => {
    ok(f('e-addr'), '#e-addr exists');
    ok(f('e-addr').getAttribute('autocomplete') === 'off', 'native autocomplete off (custom dropdown)');
  });

  T('ADR1 ctpAddrApply fills street/city/zip and fires downstream input', () => {
    let fired = 0; f('e-city').addEventListener('input', () => fired++);
    window.ctpAddrApply({ street:'1423 Cypress Way', city:'Fontana', zip:'92335' });
    ok(f('e-addr').value === '1423 Cypress Way', 'street filled');
    ok(f('e-city').value === 'Fontana', 'city filled');
    ok(f('e-zip').value === '92335', 'zip filled');
    ok(fired > 0, 'input event fired so the spec summary updates');
  });

  await TA('ADR2 typing shows suggestions; picking one fills the whole address', async () => {
    f('e-addr').value=''; f('e-city').value=''; f('e-zip').value='';
    window._ctpAddrSearch = function(q){ return Promise.resolve([
      { label:'1423 Cypress Way, Fontana, CA 92335', parts:{ street:'1423 Cypress Way', city:'Fontana', zip:'92335' } },
      { label:'1423 Cypress Ave, Ontario, CA 91762', parts:{ street:'1423 Cypress Ave', city:'Ontario', zip:'91762' } }
    ]); };
    f('e-addr').value = '1423 Cyp';
    f('e-addr').dispatchEvent(new Event('input', {bubbles:true}));
    await new Promise(r => setTimeout(r, 360));   // past the 260ms debounce
    const box = document.getElementById('ctp-addr-sugg');
    ok(box && box.style.display === 'block', 'suggestion dropdown shown');
    const items = box.querySelectorAll('.ctp-addr-item');
    ok(items.length === 2, 'two suggestions, got ' + items.length);
    items[0].dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
    ok(f('e-addr').value === '1423 Cypress Way', 'street filled from the selection');
    ok(f('e-city').value === 'Fontana', 'city filled');
    ok(f('e-zip').value === '92335', 'zip filled');
    ok(box.style.display === 'none', 'dropdown hides after picking');
    window._ctpAddrSearch = null;
  });

  await TA('ADR3 a short query (under 4 chars) does not query or show a dropdown', async () => {
    let called = 0; window._ctpAddrSearch = function(){ called++; return Promise.resolve([]); };
    f('e-addr').value = 'abc';
    f('e-addr').dispatchEvent(new Event('input', {bubbles:true}));
    await new Promise(r => setTimeout(r, 320));
    ok(called === 0, 'no lookup for a 3-char query');
    const box = document.getElementById('ctp-addr-sugg');
    ok(!box || box.style.display === 'none', 'no dropdown');
    window._ctpAddrSearch = null;
  });

  T('ADR4 the Settings Google Places key field persists (upgrade path)', () => {
    const kf = f('biz-placesKey');
    ok(kf, 'key field present in Settings');
    kf.value = 'TEST-KEY-123';
    kf.dispatchEvent(new Event('input', {bubbles:true}));
    ok(localStorage.getItem('ctp_places_key') === 'TEST-KEY-123', 'key saved to localStorage (auto-upgrades to Google)');
    kf.value=''; kf.dispatchEvent(new Event('input', {bubbles:true})); localStorage.removeItem('ctp_places_key');
  });
`;

if (require.main === module) runSuite('ADDRESS AUTOFILL (customer job info)', BODY).then(code => process.exit(code));
module.exports = { BODY };
