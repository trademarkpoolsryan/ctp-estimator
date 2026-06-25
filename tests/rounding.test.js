// Rounding mode — cross-surface consistency on a REAL seed-template estimate. With Round ON the model
// is TOP-DOWN: the grand and section subtotals are clean multiples of the increment, the grand is the
// CLOSEST clean number to the true total, line prices stay real (never $0), and everything still adds
// up (lines → subtotal → grand). Proven against the real shipped _computeRoundedDisp / _dispLeaf /
// _groupDispPrice / estDispGrand / estTotals and the live totals bar.
const { runSuite } = require('./harness');

const BODY = `
  // ---- build a real estimate (no login / network) ----
  estLines = []; window._manualOrderLocked = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft',450); setF('pb-perim',90); setF('pb-deck',600); setF('pb-markup',17);
  addTmplToEst('Pool 1 Base Estimate Tempate'); addTmplToEst('Spa');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');

  function trueOf(g){ return (g.items||[]).reduce((s,it)=>{ const q=it.qty||0; return q===0?s:s+q*(it.cost||0)*(1+(it.markup||0)/100); }, 0); }
  function poolTrue(opt){ return (estLines||[]).filter(g=>!!g._isOptional===opt).reduce((s,g)=>s+trueOf(g),0); }
  function roundInc(v,inc){ return Math.round(v/inc)*inc; }
  function expectedGrand(inc){ return roundInc(poolTrue(false),inc)+roundInc(poolTrue(true),inc); }
  function dispLeaf(it){ return _dispLeaf(it, estLines); }
  function nPools(){ return [false,true].filter(o=>poolTrue(o)>0).length; }
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

  T('RND2 grand = the CLOSEST clean number to the true total (per base/optional pool)', () => {
    close(estDispGrand(estLines), expectedGrand(100), 'grand == round(true) to $100', 0.01);
  });
  T('RND3 grand is a clean multiple of the $100 increment', () => {
    close(estDispGrand(estLines) % 100, 0, 'multiple of 100', 0.001);
  });
  T('RND4 every section subtotal is a multiple of $100 AND they sum to the grand', () => {
    let sum = 0;
    (estLines||[]).forEach((g,i) => { const sub = _groupDispPrice(g); close(sub % 100, 0, 'section '+i+' multiple of 100', 0.001); sum += sub; });
    close(sum, estDispGrand(estLines), 'section subtotals sum to grand', 0.01);
  });
  T('RND5 within each section the LINE prices sum exactly to the clean subtotal', () => {
    (estLines||[]).forEach((g,i) => {
      let ls = 0; (g.items||[]).forEach(it => { ls += dispLeaf(it); });
      close(ls, _groupDispPrice(g), 'section '+i+' lines add up to subtotal', 0.02);
    });
  });
  T('RND6 no real (nonzero) line ever displays as $0', () => {
    (estLines||[]).forEach(g => (g.items||[]).forEach(it => {
      const t = (it.qty||0)*(it.cost||0)*(1+(it.markup||0)/100);
      if (t > 0.005) ok(dispLeaf(it) > 0.005, 'a $'+t.toFixed(2)+' line stayed nonzero');
    }));
  });
  T('RND7 grand is within half an increment per pool of the exact total (closest possible)', () => {
    ok(Math.abs(estDispGrand(estLines) - (poolTrue(false)+poolTrue(true))) <= 50*nPools() + 1, 'within $50/pool of exact');
  });
  T('RND8 PROPOSAL leaf-sum (sum of apportioned line prices) == the grand', () => {
    let p = 0; (estLines||[]).forEach(g => (g.items||[]).forEach(it => { p += dispLeaf(it); }));
    close(p, estDispGrand(estLines), 'proposal sum == sheet grand', 0.05);
  });
  T('RND9 live totals bar (#tot-price / #sticky-price DOM) == estDispGrand', () => {
    close(moneyFromEl('tot-price'), estDispGrand(estLines), 'tot-price DOM == grand', 0.5);
    close(moneyFromEl('sticky-price'), estDispGrand(estLines), 'sticky-price DOM == grand', 0.5);
  });
  T('RND10 GP honesty: toggling Round never mutates cost or markup (raw total unchanged)', () => {
    const before = estTotals(estLines).totalPrice;
    window._roundToHundred = false; const off = estTotals(estLines).totalPrice;
    window._roundToHundred = true;  const on  = estTotals(estLines).totalPrice;
    close(off, before, 'raw total flag-independent (off)', 0.001);
    close(on, before, 'raw total flag-independent (on)', 0.001);
  });

  // ===== Increment change to $500 =====
  T('RND11 increment $500 -> grand & sections are multiples of 500, grand closest-clean to true', () => {
    window._roundAmount = 500;
    close(estDispGrand(estLines), expectedGrand(500), '@500 closest clean', 0.01);
    close(estDispGrand(estLines) % 500, 0, 'grand multiple of 500', 0.001);
    (estLines||[]).forEach((g,i) => close(_groupDispPrice(g) % 500, 0, 'section '+i+' multiple of 500', 0.001));
    ok(Math.abs(estDispGrand(estLines) - (poolTrue(false)+poolTrue(true))) <= 250*nPools() + 1, 'within $250/pool of exact');
    window._roundAmount = 100; // restore
  });

  // ===== The Round toggle BUTTON (the field control) =====
  T('RND12 Round button exists in the estimate toolbar', () => {
    ok(document.getElementById('btn-round-mode'), '#btn-round-mode present');
  });
  T('RND13 clicking Round flips the mode, snaps the total clean, restores exact when off', () => {
    window._roundToHundred = false; window._roundAmount = 100; syncRoundButtons();
    const btn = document.getElementById('btn-round-mode');
    btn.click();
    ok(window._roundToHundred === true, 'mode ON after click');
    ok(/Round: ON/.test(btn.innerHTML), 'label shows ON: ' + btn.innerHTML);
    close(estDispGrand(estLines) % 100, 0, 'total snapped to a multiple of 100', 0.001);
    btn.click();
    ok(window._roundToHundred === false, 'mode OFF after second click');
    close(estDispGrand(estLines), estTotals(estLines).totalPrice, 'exact again when off', 0.01);
  });

  // ===== Auto-Round when Field Mode turns on =====
  T('RND14 entering Field Mode auto-enables Round; exiting restores prior (off)', () => {
    window._roundToHundred = false; window._clientMode = false; delete window._roundBeforeField;
    toggleClientMode();
    ok(window._clientMode === true, 'Field Mode on');
    ok(window._roundToHundred === true, 'Round auto-enabled in Field Mode');
    close(estDispGrand(estLines) % 100, 0, 'client-facing total is clean', 0.001);
    toggleClientMode();
    ok(window._clientMode === false, 'Field Mode off');
    ok(window._roundToHundred === false, 'Round restored to prior off-state');
  });
  T('RND15 Field Mode preserves a manually-ON Round when you exit', () => {
    window._roundToHundred = true; window._clientMode = false; delete window._roundBeforeField;
    toggleClientMode();
    ok(window._roundToHundred === true, 'still on inside Field Mode');
    toggleClientMode();
    ok(window._roundToHundred === true, 'manual ON preserved after exit');
    window._roundToHundred = false;
  });
`;

if (require.main === module) runSuite('ROUNDING — TOP-DOWN APPORTIONMENT (real estimate)', BODY).then(code => process.exit(code));
module.exports = { BODY };
