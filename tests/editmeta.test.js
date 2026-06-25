// Editing Job # / name from the estimate sheet: the editor's pencil reuses editSavedEstimate /
// confirmEditEstimate, which must rewrite the record's num + canonical label and signal the editor
// (window._seRefreshTitle) to refresh. Drives the real shipped functions + the real #modal-editest DOM.
const { runSuite } = require('./harness');

const BODY = `
  window._safeSetItem = () => {}; window.renderSavedEstimates = () => {};

  T('EM0 the Saved-Estimate editor module loaded (window._seRefreshTitle present)', () => {
    ok(typeof window._seRefreshTitle === 'function', '_seRefreshTitle exposed');
  });

  T('EM1 editSavedEstimate populates the edit dialog from the record', () => {
    savedEstimates = (savedEstimates || []).filter(s => s.id !== 7710);
    savedEstimates.push({ id: 7710, num: 'EST-100', customer: 'Old Name', label: 'EST-100 — Old Name', lines: [] });
    editSavedEstimate(7710);
    close(parseFloat(1), 1); // no-op anchor
    ok(document.getElementById('ee-num').value === 'EST-100', 'job # prefilled: ' + document.getElementById('ee-num').value);
    ok(document.getElementById('ee-name').value === 'Old Name', 'name prefilled');
  });

  T('EM2 confirmEditEstimate rewrites num + name + canonical label on the record', () => {
    document.getElementById('ee-num').value = 'EST-200';
    document.getElementById('ee-name').value = 'New Name';
    confirmEditEstimate();
    const rec = savedEstimates.find(s => s.id === 7710);
    ok(rec.num === 'EST-200', 'num updated: ' + rec.num);
    ok(rec.customer === 'New Name', 'customer updated: ' + rec.customer);
    ok(/EST-200/.test(rec.label) && /New Name/.test(rec.label), 'canonical label restitched: ' + rec.label);
  });

  T('EM3 a blank Job # is rejected (identity is required)', () => {
    savedEstimates = savedEstimates.filter(s => s.id !== 7711);
    savedEstimates.push({ id: 7711, num: 'EST-300', customer: 'X', label: 'EST-300 — X', lines: [] });
    editSavedEstimate(7711);
    document.getElementById('ee-num').value = '   ';
    confirmEditEstimate();
    const rec = savedEstimates.find(s => s.id === 7711);
    ok(rec.num === 'EST-300', 'blank job # rejected, record unchanged: ' + rec.num);
  });

  T('EM4 a duplicate Job # is rejected', () => {
    savedEstimates = savedEstimates.filter(s => s.id !== 7712 && s.id !== 7713);
    savedEstimates.push({ id: 7712, num: 'EST-AAA', customer: 'A', label: 'EST-AAA — A', lines: [] });
    savedEstimates.push({ id: 7713, num: 'EST-BBB', customer: 'B', label: 'EST-BBB — B', lines: [] });
    editSavedEstimate(7713);
    document.getElementById('ee-num').value = 'EST-AAA';   // clashes with 7712
    confirmEditEstimate();
    const rec = savedEstimates.find(s => s.id === 7713);
    ok(rec.num === 'EST-BBB', 'duplicate rejected, record unchanged: ' + rec.num);
  });
`;

if (require.main === module) runSuite('EDIT JOB # / NAME (from the estimate sheet)', BODY).then(code => process.exit(code));
module.exports = { BODY };
