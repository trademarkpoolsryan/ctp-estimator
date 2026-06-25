// Full UI end-to-end — real estimate, expanded tree, all three target levels driven through
// real DOM `change` events (header / section / line), plus pin & unpin visual state.
const { runSuite } = require('./harness');

const BODY = `
  const SP = window._tpSectionPrice;
  estLines = []; window._manualOrderLocked = false; window._roundToHundred = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft',450); setF('pb-perim',90); setF('pb-deck',600); setF('pb-markup',17);
  addTmplToEst('Pool 1 Base Estimate Tempate');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');
  const expand = () => { window._collapsedParents = new Set(); window._collapsedGroups = new Set(); renderEst(); };
  expand();

  T('UI1 expanded tree renders parent, section and line price inputs', () => {
    ok(document.querySelectorAll('#est-body tr.parent-row').length >= 1, 'parent rows');
    ok(document.querySelectorAll('#est-body tr.li-row').length > 10, 'line rows');
    ok(document.querySelectorAll('#est-body .tprice-in[data-lprice]').length > 10, 'line inputs');
    ok(document.querySelectorAll('#est-body .tprice-in[data-gprice]').length >= 1, 'section inputs');
  });
  T('UI2 HEADER target via real DOM change event sets the template total', () => {
    const cell = document.querySelector('#est-body tr.parent-row .tprice-in'); ok(cell, 'header input');
    cell.value = '$55000'; fire(cell, 'change');
    const sum = estLines.filter(g => g._tmplId === 'Pool 1 Base Estimate Tempate' && !g._isOptional && SP(g) > 0)
      .reduce((s,g)=>s+SP(g),0);
    close(sum, 55000, 'header target applied', 0.05);
  });
  T('UI3 SECTION target via real DOM change event sets the subtotal', () => {
    expand(); const cell = document.querySelector('#est-body .tprice-in[data-gprice]'); ok(cell, 'section input');
    const gi = parseInt(cell.getAttribute('data-gprice'),10);
    cell.value = '$12000'; fire(cell, 'change');
    close(SP(estLines[gi]), 12000, 'subtotal', 0.02); ok(estLines[gi]._priceLocked, 'pinned');
  });
  T('UI4 LINE target via real DOM change event sets price + pinned class', () => {
    expand();
    const cells = Array.from(document.querySelectorAll('#est-body .tprice-in[data-lprice]'));
    let target=null, gi, ii;
    for (const c of cells){ const p=c.getAttribute('data-lprice').split('-'); const G=+p[0], I=+p[1];
      const it = estLines[G] && estLines[G].items[I];
      if (it && (it.qty||0)>0 && (it.cost||0)>0){ target=c; gi=G; ii=I; break; } }
    ok(target, 'priced line input');
    target.value = '$3333.33'; fire(target, 'change');
    close(_tpLinePrice(estLines[gi].items[ii]), 3333.33, 'line on target', 0.02);
    expand();
    const again = document.querySelector('#est-body .tprice-in[data-lprice="'+gi+'-'+ii+'"]');
    ok(again && again.className.indexOf('pinned') >= 0, 'pinned class rendered');
  });
  T('UI5 clearing the line input via DOM event unpins', () => {
    const c = document.querySelector('#est-body .tprice-in.pinned[data-lprice]'); ok(c, 'a pinned line exists');
    const p = c.getAttribute('data-lprice').split('-'); const gi=+p[0], ii=+p[1];
    c.value = ''; fire(c, 'change'); ok(!estLines[gi].items[ii]._priceLocked, 'unpinned');
  });
`;

if (require.main === module) runSuite('FULL UI END-TO-END (real estimate, real DOM events)', BODY).then(code => process.exit(code));
module.exports = { BODY };
