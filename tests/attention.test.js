// "Needs your attention" action-items strip at the top of the client portal. It surfaces, from data
// the portal already has, the two things that actually need the client: selections still to choose and
// draws currently due — each row jumping (CP.focusSec) to the relevant card. When nothing is pending it
// shows a calm "all caught up" state. These tests drive the REAL portal DOM.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};

  // A job mid-build (Gunite) with money collected so a draw reads as "due".
  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 779, name: 'Attn Client', address: '3 Pool Ln', phone: '', email: '', num: 'EST-779',
    value: 100000, collected: 12000, sqft: '500', stage: 'Gunite / Shell', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function pane(){ return document.getElementById('cp-pane'); }
  function attnCard(){ return pane().querySelector('.cp-attn'); }
  function openPortal(){ nav('clientportal'); CP.open('779'); }

  T('ATN0 the attention band renders at the top with a heading', () => {
    openPortal();
    const card = attnCard();
    ok(card, '.cp-attn card present');
    ok(/Needs your attention/.test(card.innerHTML), 'has the heading');
    // It comes before the "Your build" timeline card.
    const cards = pane().querySelectorAll('.cp-card');
    ok(cards[0].classList.contains('cp-attn'), 'attention band is the first card');
  });

  T('ATN1 pending selections surface as one actionable row pointing at the selections card', () => {
    openPortal();
    const row = pane().querySelector('.cp-attn-row.act .cp-attn-ic.choose');
    ok(row, 'a "choose" action row exists');
    const r = row.closest('.cp-attn-row');
    ok(/selection/i.test(r.textContent), 'mentions selections');
    ok(/cp-sec-selections/.test(r.getAttribute('onclick')), 'jumps to the selections card');
    ok(document.getElementById('cp-sec-selections'), 'selections card has the target id');
  });

  T('ATN2 a due draw surfaces as a payment row with an amount, pointing at the investment card', () => {
    openPortal();
    const rows = Array.prototype.slice.call(pane().querySelectorAll('.cp-attn-row.act'));
    const pay = rows.filter(r => r.querySelector('.cp-attn-ic.pay'))[0];
    ok(pay, 'a "pay" action row exists');
    ok(/Payment due/.test(pay.textContent), 'labeled Payment due');
    ok(/\\$/.test(pay.querySelector('.cp-attn-sub').textContent), 'shows a dollar amount');
    ok(/cp-sec-invest/.test(pay.getAttribute('onclick')), 'jumps to the investment card');
    ok(document.getElementById('cp-sec-invest'), 'investment card has the target id');
  });

  T('ATN3 CP.focusSec flashes the target card without throwing', () => {
    openPortal();
    ok(typeof CP.focusSec === 'function', 'CP.focusSec exposed');
    CP.focusSec('cp-sec-selections');
    ok(document.getElementById('cp-sec-selections').classList.contains('cp-flash'), 'target gets the flash class');
    CP.focusSec('nope-no-such-id'); // must be a safe no-op
  });

  T('ATN4 with everything chosen and nothing due, it shows the calm all-caught-up state', () => {
    // A finished, fully-paid job leaves every draw "paid" (none due).
    window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
      id: 780, name: 'Clear Client', address: '4 Pool Ln', num: 'EST-780',
      value: 100000, collected: 100000, stage: 'Complete & Startup', type: 'New Pool', date: '6/26/2026'
    }]));
    window.jpReloadFromLocal();
    nav('clientportal'); CP.open('780');
    // Choose every selection through the real toggle so none remain pending.
    let g = 0;
    while (pane().querySelector('.cp-attn-ic.choose') && g++ < 30) {
      const chips = pane().querySelectorAll('#cp-sec-selections .cp-chip');
      let clicked = false;
      for (const c of chips) {
        if (!/Selected/.test(c.textContent)) {
          const m = (c.getAttribute('onclick') || '').match(/toggleSel\\((\\d+)\\)/);
          if (m) { CP.toggleSel(Number(m[1])); clicked = true; break; }
        }
      }
      if (!clicked) break;
    }
    const card = attnCard();
    ok(card, 'attention card still present');
    ok(/all caught up/i.test(card.textContent), 'shows the caught-up message');
    ok(card.querySelector('.cp-attn-ic.ok'), 'uses the green ok dot');
    ok(!card.querySelector('.cp-attn-row.act'), 'no actionable rows remain');
  });
`;

if (require.main === module) runSuite('ATTENTION STRIP (portal action items)', BODY).then(code => process.exit(code));
module.exports = { BODY };
