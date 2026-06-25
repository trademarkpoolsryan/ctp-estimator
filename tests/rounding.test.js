// Rounding mode — cross-surface consistency on a REAL seed-template estimate. The whole point of
// the feature: with Round ON, the sheet, the proposal, and the budget must all show the SAME numbers
// and every subtotal must add up to the bottom line. This proves it against the real shipped
// roundPrice / _groupDispPrice / estDispGrand / estTotals and the live totals bar.
const { runSuite } = require('./harness');

const BODY = `
  // ---- build a real estimate (no login / network) ----
  estLines = []; window._manualOrderLocked = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft',450); setF('pb-perim',90); setF('pb-deck',600); setF('pb-markup',17);
  addTmplToEst('Pool 1 Base Estimate Tempate'); addTmplToEst('Spa');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');

  // visible line price (matches _groupDispPrice's q!==0 filter)
  function leafSum(round){
    let s = 0;
    (estLines||[]).forEach(g => (g.items||[]).forEach(it => {
      const q = it.qty||0; if (q === 0) return;
      const lp = q * (it.cost||0) * (1 + (it.markup||0)/100);
      s += round ? roundPrice(lp) : lp;
    }));
    return s;
  }
  function moneyFromEl(id){ const el = document.getElementById(id); return el ? parseFloat((el.textContent||'').replace(/[$,]/g,''))||0 : NaN; }

  // ===== Round OFF: exact, nothing rounded =====
  window._roundToHundred = false; window._roundAmount = 100;
  T('RND1 Round OFF -> estDispGrand equals exact estTotals (no rounding applied)', () => {
    close(estDispGrand(estLines), estTotals(estLines).totalPrice, 'exact when off', 0.01);
  });

  // ===== Round ON @ $100 =====
  window._roundToHundred = true; window._roundAmount = 100;
  window._collapsedParents = new Set(); window._collapsedGroups = new Set();
  renderEst(); updateTotals();
  const rawTotal = estTotals(estLines).totalPrice;     // exact cost x markup (honest, flag-independent)

  T('RND2 grand total = sum of rounded leaves (the canonical rule)', () => {
    close(estDispGrand(estLines), leafSum(true), 'estDispGrand == Sigma roundPrice(line)', 0.01);
  });
  T('RND3 grand total is a clean multiple of the $100 increment', () => {
    const g = estDispGrand(estLines); close(g % 100, 0, 'multiple of 100 (got remainder)', 0.001);
  });
  T('RND4 every section subtotal = sum of its rounded lines, and is itself a multiple of $100', () => {
    (estLines||[]).forEach((g,i) => {
      let secLeaf = 0;
      (g.items||[]).forEach(it => { const q=it.qty||0; if(q===0) return; secLeaf += roundPrice(q*(it.cost||0)*(1+(it.markup||0)/100)); });
      close(_groupDispPrice(g), secLeaf, 'section '+i+' = sum of rounded lines', 0.01);
      close(_groupDispPrice(g) % 100, 0, 'section '+i+' multiple of 100', 0.001);
    });
  });
  T('RND5 PROPOSAL formula == SHEET formula (section-rounded sum == leaf-rounded sum)', () => {
    // Sheet/budget: estDispGrand = sum of _groupDispPrice. Proposal: sum of roundPrice(sectionPrice)
    // (idempotent guard on an already-leaf-rounded section). Both must equal the pure leaf sum.
    const sheet = estDispGrand(estLines);
    const proposalStyle = (estLines||[]).reduce((s,g)=>s + roundPrice(_groupDispPrice(g)), 0);
    close(sheet, proposalStyle, 'proposal-style == sheet', 0.01);
    close(sheet, leafSum(true), 'both == pure leaf sum', 0.01);
  });
  T('RND6 BUDGET value path (Math.round(estDispGrand)) matches the sheet', () => {
    close(Math.round(estDispGrand(estLines)), Math.round(leafSum(true)), 'budget == sheet', 0.5);
  });
  T('RND7 live totals bar (#tot-price / #sticky-price DOM) == estDispGrand', () => {
    const dom = moneyFromEl('tot-price'); const sticky = moneyFromEl('sticky-price');
    close(dom, estDispGrand(estLines), 'tot-price DOM == estDispGrand', 0.5);
    close(sticky, estDispGrand(estLines), 'sticky-price DOM == estDispGrand', 0.5);
  });
  T('RND8 rounding stays within tolerance of the exact price (<= half-increment per line)', () => {
    const lines = (estLines||[]).reduce((n,g)=>n+(g.items||[]).filter(it=>(it.qty||0)!==0).length,0);
    ok(Math.abs(estDispGrand(estLines) - rawTotal) <= lines * 50 + 1, 'within +/- $50 per line of exact');
  });
  T('RND9 GP honesty: toggling Round never mutates cost or markup (raw total unchanged)', () => {
    const before = estTotals(estLines).totalPrice;
    window._roundToHundred = false; const off = estTotals(estLines).totalPrice;
    window._roundToHundred = true;  const on  = estTotals(estLines).totalPrice;
    close(off, before, 'raw total flag-independent (off)', 0.001);
    close(on, before, 'raw total flag-independent (on)', 0.001);
  });

  // ===== Increment change to $500 =====
  T('RND10 increment $500 -> grand is a multiple of 500 and equals sum of @500 rounded leaves', () => {
    window._roundAmount = 500;
    const g = estDispGrand(estLines);
    close(g % 500, 0, 'multiple of 500', 0.001);
    close(g, leafSum(true), 'equals Sigma roundPrice@500(line)', 0.01);
    window._roundAmount = 100; // restore
  });

  // ===== The Round toggle BUTTON (the field control) =====
  T('RND11 Round button exists in the estimate toolbar', () => {
    ok(document.getElementById('btn-round-mode'), '#btn-round-mode present');
  });
  T('RND12 clicking Round flips the mode, snaps the total, and updates the button label', () => {
    window._roundToHundred = false; window._roundAmount = 100; syncRoundButtons();
    const btn = document.getElementById('btn-round-mode');
    btn.click();                                  // -> toggleRoundMode()
    ok(window._roundToHundred === true, 'mode ON after click');
    ok(/Round: ON/.test(btn.innerHTML), 'label shows ON: ' + btn.innerHTML);
    close(estDispGrand(estLines) % 100, 0, 'total snapped to a multiple of 100', 0.001);
    btn.click();
    ok(window._roundToHundred === false, 'mode OFF after second click');
    close(estDispGrand(estLines), estTotals(estLines).totalPrice, 'exact again when off', 0.01);
  });

  // ===== Auto-Round when Field Mode turns on =====
  T('RND13 entering Field Mode auto-enables Round; exiting restores prior (off)', () => {
    window._roundToHundred = false; window._clientMode = false; delete window._roundBeforeField;
    toggleClientMode();                         // enter Field Mode
    ok(window._clientMode === true, 'Field Mode on');
    ok(window._roundToHundred === true, 'Round auto-enabled in Field Mode');
    close(estDispGrand(estLines) % 100, 0, 'client-facing total is clean', 0.001);
    toggleClientMode();                         // exit Field Mode
    ok(window._clientMode === false, 'Field Mode off');
    ok(window._roundToHundred === false, 'Round restored to prior off-state');
  });
  T('RND14 Field Mode preserves a manually-ON Round when you exit', () => {
    window._roundToHundred = true; window._clientMode = false; delete window._roundBeforeField;
    toggleClientMode();                         // enter (Round already on)
    ok(window._roundToHundred === true, 'still on inside Field Mode');
    toggleClientMode();                         // exit -> restore to ON
    ok(window._roundToHundred === true, 'manual ON preserved after exit');
    window._roundToHundred = false;             // cleanup
  });
`;

if (require.main === module) runSuite('ROUNDING — CROSS-SURFACE CONSISTENCY (real estimate)', BODY).then(code => process.exit(code));
module.exports = { BODY };
