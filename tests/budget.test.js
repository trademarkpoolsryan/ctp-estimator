// Project Budget view — the Job Portal budget must show the SIGNED (rounded) client pricing that
// matches the estimate/proposal, not the raw unrounded cost×markup total. Drives the real shipped
// budgetSheet() against a real seed-template estimate snapshot finalized with Round ON.
const { runSuite } = require('./harness');

const BODY = `
  estLines = []; window._manualOrderLocked = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft',450); setF('pb-perim',90); setF('pb-deck',600); setF('pb-markup',17);
  addTmplToEst('Pool 1 Base Estimate Tempate'); addTmplToEst('Spa');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');
  window._roundToHundred = false; // budget must round from the SNAPSHOT flag, not the live toggle

  const snap = { id: 880011, num: 'EST-8801', date: '6/25/2026', customer: 'Client', label: 'EST-8801 — Client',
    roundToHundred: true, lines: JSON.parse(JSON.stringify(estLines)) };

  const F = n => (Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const roundedGrand = Math.round(estSnapDisp(snap).grand);
  const rawGrand = (snap.lines||[]).reduce((s,g)=>s+(g.items||[]).reduce((t,it)=>t+(it.qty||0)*(it.cost||0)*(1+(it.markup||0)/100),0),0);

  ok(typeof window.jpBudgetSheet === 'function', 'budgetSheet exposed for test');
  const html = window.jpBudgetSheet({ est: snap });
  // pull the bold SUBTOTAL price cell (font-weight:800) out of the tfoot
  const m = html.match(/SUBTOTAL[\\s\\S]*?font-weight:800[^>]*>\\$([\\d,]+\\.\\d{2})/);
  const shownGrand = m ? parseFloat(m[1].replace(/,/g,'')) : NaN;

  T('BUD0 sanity: rounded grand is clean and differs from the raw total', () => {
    ok(roundedGrand % 100 === 0, 'rounded grand clean: ' + roundedGrand);
    ok(Math.abs(roundedGrand - rawGrand) > 0.01, 'rounding changed the number (raw ' + rawGrand.toFixed(2) + ')');
  });
  T('BUD1 budget SUBTOTAL shows the rounded contract grand, not the raw total', () => {
    ok(!isNaN(shownGrand), 'parsed a subtotal price from the budget html');
    close(shownGrand, roundedGrand, 'budget subtotal == rounded grand', 0.5);
    ok(Math.abs(shownGrand - rawGrand) > 0.01, 'budget subtotal is NOT the raw unrounded total');
  });
  T('BUD2 the raw unrounded grand string does not appear anywhere in the budget', () => {
    ok(html.indexOf(F(rawGrand)) === -1, 'raw total string ' + F(rawGrand) + ' absent from budget');
  });
  T('BUD3 a Round-OFF snapshot shows the exact (unrounded) total', () => {
    const snapOff = { id: 880022, num: 'EST-8802', customer: 'Exact', label: 'x',
      roundToHundred: false, lines: JSON.parse(JSON.stringify(estLines)) };
    const h2 = window.jpBudgetSheet({ est: snapOff });
    const m2 = h2.match(/SUBTOTAL[\\s\\S]*?font-weight:800[^>]*>\\$([\\d,]+\\.\\d{2})/);
    const g2 = m2 ? parseFloat(m2[1].replace(/,/g,'')) : NaN;
    close(g2, rawGrand, 'Round-off snapshot -> exact total', 0.5);
  });
`;

if (require.main === module) runSuite('PROJECT BUDGET (signed rounded pricing)', BODY).then(code => process.exit(code));
module.exports = { BODY };
