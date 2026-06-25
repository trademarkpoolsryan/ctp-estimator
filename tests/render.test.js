// Render / DOM — drives the real renderEst() and the editable price-cell wiring on synthetic data.
const { runSuite } = require('./harness');

const BODY = `
  __out.push({name:'R0 #est-body container exists', pass: !!document.getElementById('est-body'), err:'missing'});
  estLines = [{ group:'Test Section', _tmplId:'TST', _tmplKey:'TST', items:[
    {desc:'L0', detail:'Line 0', qty:1, unit:'ea', cost:100, markup:0},
    {desc:'L1', detail:'Line 1', qty:1, unit:'ea', cost:300, markup:0},
    {desc:'L2', detail:'Line 2 (no cost)', qty:1, unit:'ea', cost:0, markup:0},
  ]}];
  window._manualOrderLocked = true;

  T('R1 renderEst() runs without throwing on synthetic data', () => { renderEst(); });
  T('R2 editable price inputs (.tprice-in) rendered for each visible line', () => {
    ok(document.querySelectorAll('#est-body .tprice-in').length >= 3, 'price inputs');
  });
  T('R3 a pinned line renders the blue .pinned class and shows the target', () => {
    setLineTarget(0,1,'$500');
    const cell = document.querySelector('#est-body .tprice-in[data-lprice="0-1"]');
    ok(cell && cell.className.indexOf('pinned') >= 0, 'pinned class: ' + (cell&&cell.className));
    ok(/500/.test(cell.value), 'shows 500, got ' + cell.value);
  });
  T('R4 zero-cost pinned line renders the red .conflict class', () => {
    setLineTarget(0,2,'$400');
    const cell = document.querySelector('#est-body .tprice-in[data-lprice="0-2"]');
    ok(cell && cell.className.indexOf('conflict') >= 0, 'conflict class: ' + (cell&&cell.className));
  });
  T('R5 typing into a line price input + change event re-prices via setLineTarget', () => {
    setLineTarget(0,1,''); setLineTarget(0,2,'');
    const cell = document.querySelector('#est-body .tprice-in[data-lprice="0-0"]');
    cell.value = '$250'; fire(cell, 'change');
    ok(estLines[0].items[0]._priceLocked === true, 'pinned via DOM event');
    close(_tpLinePrice(estLines[0].items[0]), 250, 'priced to 250');
  });
  T('R6 section price computed after re-render', () => {
    ok(_tpSectionPrice(estLines[0]) > 0, 'section price computed');
  });
`;

if (require.main === module) runSuite('RENDER / DOM', BODY).then(code => process.exit(code));
module.exports = { BODY };
