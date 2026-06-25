// Adversarial — parent-level pins, sticky parent re-flex, multi-free shape, re-entrancy,
// the Finalize-removed (roundPrice identity) regression, and deep-credit targets.
const { runSuite } = require('./harness');

const BODY = `
  window.renderEst = function(){}; window.updateTotals = function(){};
  const P = window._tpLinePrice, SP = window._tpSectionPrice;
  function item(q,c,m,x){ return Object.assign({qty:q,cost:c,markup:m}, x||{}); }
  function setEst(a){ estLines = a; }

  T('ADV1 parent target with a pinned inner section', () => {
    const g1={_tmplId:'T',items:[item(1,100,0),item(1,100,0)]};
    const g2={_tmplId:'T',items:[item(1,300,0)]};
    const g3={_tmplId:'T',items:[item(1,500,0)]};
    setEst([g1,g2,g3]); setSectionTarget(1,'$300'); setParentTarget('T','$2000');
    close(SP(g2),300); close(SP(g1)+SP(g2)+SP(g3),2000); close(SP(g3)/SP(g1), 500/200, 'free ratio');
  });
  T('ADV2 pinned parent re-flexes after an inner free-line edit', () => {
    const g1={_tmplId:'T',items:[item(1,100,0)]}; const g2={_tmplId:'T',items:[item(1,300,0)]};
    setEst([g1,g2]); setParentTarget('T','$1000'); g1.items[0].cost = 999; resolveAncestors(0);
    close(SP(g1)+SP(g2),1000, 'parent re-flexed');
  });
  T('ADV3 section remainder split keeps ratio among multiple free lines', () => {
    const a=item(1,100,0), b=item(1,200,0), c=item(1,400,0); setEst([{items:[a,b,c]}]);
    setLineTarget(0,0,'$1000'); setSectionTarget(0,'$3000');
    close(P(a),1000); close(SP(estLines[0]),3000); close(P(c)/P(b), 2, 'free ratio');
  });
  T('ADV4 unpinning clears lock state and line rejoins free spread', () => {
    const a=item(1,100,0), b=item(1,300,0); setEst([{items:[a,b]}]);
    setLineTarget(0,0,'$999'); setLineTarget(0,0,'');
    ok(!a._priceLocked && a._targetPrice===undefined && !a._priceConflict, 'lock cleared');
    const pa=P(a), pb=P(b); setSectionTarget(0,'$800');
    close(SP(estLines[0]),800); close(P(a)/P(b), pa/pb, 'proportional to current prices');
  });
  T('ADV5 roundPrice snaps to the nearest increment (default $100)', () => {
    ok(typeof roundPrice === 'function');
    window._roundAmount = 100;
    [[1234.56,1200],[1250,1300],[7500.07,7500],[49,0],[51,100],[99,100],[0,0]]
      .forEach(([v,exp]) => close(roundPrice(v), exp, 'roundPrice('+v+')'));
    window._roundAmount = 500;
    [[1234.56,1000],[1250,1500],[7600,7500]].forEach(([v,exp]) => close(roundPrice(v), exp, '@500 roundPrice('+v+')'));
    window._roundAmount = 100; // restore
  });
  T('ADV6 no double-application under nested solve (re-entrancy guard)', () => {
    const a=item(1,100,0), b=item(1,300,0); const g={items:[a,b], _tmplId:'T'}; setEst([g]);
    setSectionTarget(0,'$1000'); setParentTarget('T','$1000');
    const before = SP(g); resolveAncestors(0); resolveAncestors(0);
    close(SP(g), before, 'stable'); close(SP(g), 1000, 'on target');
  });
  T('ADV7 deep-credit target (price below 0 base) computes without crash', () => {
    const it=item(1,100,0); setEst([{items:[it]}]); const r = markupForPrice(it, -50);
    ok(r.ok); close(r.markup, -150); it.markup=r.markup; close(P(it), -50);
  });
`;

if (require.main === module) runSuite('ADVERSARIAL', BODY).then(code => process.exit(code));
module.exports = { BODY };
