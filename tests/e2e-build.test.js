// End-to-end build — builds a REAL estimate from TEMPLATES_SEED (no login, no network) and
// confirms every target level flows to the canonical totals (estTotals, price = cost x markup).
const { runSuite } = require('./harness');

const BODY = `
  const SP = window._tpSectionPrice;
  ok(typeof TEMPLATES_SEED === 'object' && TEMPLATES_SEED['Pool 1 Base Estimate Tempate'], 'seed catalog present');
  ok(typeof addTmplToEst === 'function' && typeof applySmartQuantities === 'function', 'build fns present');

  estLines = []; window._manualOrderLocked = false; window._roundToHundred = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-length',30); setF('pb-width',15); setF('pb-sqft',450); setF('pb-perim',90);
  setF('pb-deck',600); setF('pb-suction',40); setF('pb-sweep',40); setF('pb-skimmer',40);
  setF('pb-autofill',25); setF('pb-markup',17);

  T('E2E1 build Pool Base + Spa from seed templates', () => {
    addTmplToEst('Pool 1 Base Estimate Tempate'); addTmplToEst('Spa');
    applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');
    ok(estLines.length >= 1, 'groups: ' + estLines.length);
    ok(estLines.reduce((s,g)=>s+(g.items?g.items.length:0),0) > 10, 'line items present');
  });
  T('E2E2 renderEst draws the (collapsed) parent tree without throwing', () => {
    renderEst(); ok(document.querySelectorAll('#est-body tr.parent-row').length >= 1, 'parent row rendered');
  });
  T('E2E3 baseline grand total derives from cost x markup (estTotals)', () => {
    ok(estTotals(estLines).totalPrice > 1000, 'sane total');
  });
  T('E2E4 LINE target on a real line flows to the grand total exactly', () => {
    const g = estLines[0]; const ii = g.items.findIndex(it => (it.qty||0)>0 && (it.cost||0)>0);
    ok(ii >= 0, 'priced line');
    const before = estTotals(estLines).totalPrice; const old = _tpLinePrice(g.items[ii]); const bump = 1234.56;
    setLineTarget(0, ii, '$' + (old + bump).toFixed(2));
    close(_tpLinePrice(g.items[ii]), old + bump, 'line on target', 0.02);
    close(estTotals(estLines).totalPrice - before, bump, 'grand total moved by line delta', 0.02);
    setLineTarget(0, ii, '');
  });
  T('E2E5 SECTION target sets a real section subtotal exactly', () => {
    const g = estLines.find(x => SP(x) > 0); const gi = estLines.indexOf(g);
    setSectionTarget(gi, '$25000'); close(SP(estLines[gi]), 25000, 'subtotal', 0.02);
    ok(!estLines[gi]._priceConflict);
    ok((estLines[gi].items||[]).reduce((s,it)=>s+(it.qty||0)*(it.cost||0),0) > 0, 'cost preserved');
    setSectionTarget(gi, '');
  });
  T('E2E6 HEADER (parent) target sets the whole template price exactly', () => {
    const groups = estLines.filter(g => g._tmplId === 'Pool 1 Base Estimate Tempate');
    ok(groups.length >= 1); const tmplId = groups[0]._tmplId; setParentTarget(tmplId, '$60000');
    const sum = estLines.filter(g => g._tmplId === tmplId && !g._isOptional && SP(g) > 0).reduce((s,g)=>s+SP(g),0);
    close(sum, 60000, 'header target', 0.05); setParentTarget(tmplId, '');
  });
  T('E2E7 a pinned target survives a full re-render (reapplyPriceLocks)', () => {
    const g = estLines.find(x => SP(x) > 0); const gi = estLines.indexOf(g);
    setSectionTarget(gi, '$18000'); renderEst(); close(SP(estLines[gi]), 18000, 'survives re-render', 0.02);
    setSectionTarget(gi, '');
  });
`;

if (require.main === module) runSuite('END-TO-END BUILD (real seed-template estimate)', BODY).then(code => process.exit(code));
module.exports = { BODY };
