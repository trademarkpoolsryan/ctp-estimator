// Solver math — drives the real shipped target-pricing functions against synthetic estLines.
const { runSuite } = require('./harness');

const BODY = `
  window.renderEst = function(){}; window.updateTotals = function(){}; // isolate math from render
  const P = window._tpLinePrice, SP = window._tpSectionPrice;
  function item(qty,cost,markup,extra){ return Object.assign({qty,cost,markup}, extra||{}); }
  function setEst(arr){ estLines = arr; }

  T('A1 markupForPrice round-trips to exact price', () => {
    const it = item(2,100,0); const r = markupForPrice(it, 300);
    ok(r.ok); close(r.markup, 50); it.markup = r.markup; close(P(it), 300, 'round-trip');
  });
  T('A2 markupForPrice zero-cost -> reason zero-cost', () => {
    const r = markupForPrice(item(1,0,0), 500); ok(!r.ok && r.reason === 'zero-cost', JSON.stringify(r));
  });
  T('A3 markupForPrice allows discount (negative markup)', () => {
    const it = item(2,100,0); const r = markupForPrice(it, 150); ok(r.ok); close(r.markup, -25);
  });
  T('B1 proportional spread preserves ratios', () => {
    const a=item(1,100,0), b=item(1,300,0); const r = distributeProportional([a,b], 800);
    ok(r.ok); close(P(a),200); close(P(b),600); close(P(b)/P(a), 3, 'ratio');
  });
  T('B2 even-split fallback when all free items currently $0', () => {
    const a=item(1,100,-100), b=item(1,100,-100); ok(P(a)===0 && P(b)===0);
    const r = distributeProportional([a,b], 500); ok(r.ok); close(P(a),250); close(P(b),250);
  });
  T('B3 overconstrained when remainder negative', () => {
    ok(distributeProportional([item(1,100,0)], -5).conflict === 'overconstrained');
  });
  T('B4 all-zero-cost free items -> conflict', () => {
    ok(distributeProportional([item(1,0,0), item(1,0,0)], 500).conflict === 'all-zero-cost');
  });
  T('C1 setLineTarget pins line to exact price', () => {
    const it = item(2,100,0); setEst([{items:[it, item(1,50,0)]}]); setLineTarget(0,0,'$500');
    close(P(it), 500); ok(it._priceLocked === true); close(it._targetPrice, 500);
  });
  T('C2 clearing a line target unpins it', () => {
    const it = item(2,100,0); setEst([{items:[it]}]); setLineTarget(0,0,'$500'); setLineTarget(0,0,'');
    ok(!it._priceLocked && it._targetPrice === undefined);
  });
  T('C3 zero-cost line target -> conflict, stays pinned', () => {
    const it = item(1,0,0); setEst([{items:[it]}]); setLineTarget(0,0,'$500');
    ok(it._priceConflict === 'zero-cost'); ok(it._priceLocked === true);
  });
  T('C4 currency parsing ($7,500)', () => {
    const it = item(1,1000,0); setEst([{items:[it]}]); setLineTarget(0,0,'$7,500'); close(P(it),7500);
  });
  T('D1 section target spreads proportionally across free lines', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]); setSectionTarget(0,'$800');
    close(SP(estLines[0]),800); close(P(a),200); close(P(b),600); close(P(b)/P(a),3);
    ok(estLines[0]._priceLocked && estLines[0]._targetPrice===800);
  });
  T('D2 pinned line holds; free lines absorb the section remainder', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]);
    setLineTarget(0,1,'$400'); setSectionTarget(0,'$1000');
    close(P(b),400); close(P(a),600); close(SP(estLines[0]),1000);
  });
  T('D3 over-constrained section -> conflict', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]);
    setLineTarget(0,1,'$400'); setSectionTarget(0,'$300');
    ok(estLines[0]._priceConflict === 'overconstrained');
  });
  T('D4 clearing section target unpins', () => {
    const a=item(1,100,0); setEst([{items:[a]}]); setSectionTarget(0,'$500'); setSectionTarget(0,'');
    ok(!estLines[0]._priceLocked);
  });
  T('D5 EPS boundary: all-pinned section equal to target is OK (not conflict)', () => {
    const a=item(1,100,0), b=item(1,100,0); setEst([{items:[a,b]}]);
    setLineTarget(0,0,'$200'); setLineTarget(0,1,'$200'); setSectionTarget(0,'$400');
    ok(!estLines[0]._priceConflict);
  });
  T('E1 parent target flexes base sections; optional excluded', () => {
    const g1={_tmplId:'T', items:[item(1,100,0), item(1,100,0)]};
    const g2={_tmplId:'T', items:[item(1,300,0), item(1,300,0)]};
    const opt={_tmplId:'T', _isOptional:true, items:[item(1,1000,0)]};
    setEst([g1,g2,opt]); setParentTarget('T','$1600');
    close(SP(g1)+SP(g2),1600); close(SP(g1),400); close(SP(g2),1200); close(SP(opt),1000);
    ok(g1._parentPriceLocked && g1._parentTargetPrice===1600);
  });
  T('E2 clearing parent target unpins', () => {
    const g1={_tmplId:'T', items:[item(1,100,0)]}; setEst([g1]);
    setParentTarget('T','$500'); setParentTarget('T',''); ok(!g1._parentPriceLocked);
  });
  T('F1 pinned section re-totals to target after a free line changes', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]); setSectionTarget(0,'$1000');
    a.cost = 250; resolveAncestors(0); close(SP(estLines[0]),1000);
  });
  T('G1 pinned line holds its price after its cost drifts', () => {
    const it = item(1,100,0); setEst([{items:[it]}]); setLineTarget(0,0,'$500');
    it.cost = 250; reapplyPriceLocks(); close(P(it),500); ok(!it._priceConflict);
  });
  T('G2 reapplyPriceLocks re-solves a pinned section', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b], _priceLocked:true, _targetPrice:1000}]);
    a.cost = 500; reapplyPriceLocks(); close(SP(estLines[0]),1000);
  });
  T('H1 setting targets never mutates cost (GP% stays honest)', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]); setSectionTarget(0,'$2000');
    close(a.cost,100); close(b.cost,300); close(P(a), a.qty*a.cost*(1+a.markup/100));
  });
  T('I1 section can be driven to a lower (discount) total', () => {
    const a=item(1,100,0), b=item(1,100,0); setEst([{items:[a,b]}]); setSectionTarget(0,'$100');
    close(SP(estLines[0]),100); ok(!estLines[0]._priceConflict);
  });
`;

if (require.main === module) runSuite('SOLVER MATH', BODY).then(code => process.exit(code));
module.exports = { BODY };
