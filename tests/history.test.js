// Version history is per-ESTIMATE: the modal must list only the open estimate's snapshots, not the
// global ring of every job's saves. Drives the real shipped _estSnapBelongsToCurrent + _estHistoryModal
// against a seeded history ring and the real #esthist-modal DOM.
const { runSuite } = require('./harness');

const BODY = `
  // seed a history ring spanning three different estimates (by id + Job #)
  const ring = [
    { ts: 1, id: 100, num: 'EST-2653', customer: 'Brian Mclean', label: 'EST-2653 — Brian Mclean', itemCount: 98, grand: 118432, sig: 'a', lines: [] },
    { ts: 2, id: 100, num: 'EST-2653', customer: 'Brian Mclean', label: 'EST-2653 — Brian Mclean', itemCount: 92, grand: 116256, sig: 'b', lines: [] },
    { ts: 3, id: 200, num: 'EST-2651', customer: 'Lance Los',    label: 'EST-2651 — Lance Los',    itemCount: 46, grand: 67062,  sig: 'c', lines: [] },
    { ts: 4, id: 300, num: 'EST-2654', customer: 'Test',         label: 'EST-2654 — Test',          itemCount: 35, grand: 38070,  sig: 'd', lines: [] },
    { ts: 5, id: 100, num: 'EST-2653', customer: 'Brian Mclean', label: 'EST-2653 — Brian Mclean', itemCount: 76, grand: 103689, sig: 'e', lines: [] },
  ];
  _estHistWrite(ring);

  function pred(curId, curNum){ return ring.filter(s => _estSnapBelongsToCurrent(s, curId, curNum)); }

  T('HST1 belongs-to-current matches by id (only that estimate)', () => {
    const got = pred(100, 'EST-2653');
    ok(got.length === 3, 'three EST-2653 snapshots, got ' + got.length);
    ok(got.every(s => s.id === 100), 'all share id 100');
  });
  T('HST2 a different open estimate sees only its own snapshots', () => {
    ok(pred(200, 'EST-2651').length === 1, 'one EST-2651 snapshot');
    ok(pred(300, 'EST-2654').length === 1, 'one EST-2654 snapshot');
  });
  T('HST3 Job # fallback when the open estimate has no id yet', () => {
    const got = pred(null, 'EST-2653');
    ok(got.length === 3 && got.every(s => s.num === 'EST-2653'), 'matched by Job #: ' + got.length);
  });

  // Drive the REAL modal with EST-2653 open and assert the DOM lists only its 3 versions.
  T('HST4 the rendered modal shows only the open estimate, not all 12 snapshots', () => {
    window._currentEstId = 100;
    let e = document.getElementById('e-num'); if (!e) { e = document.createElement('input'); e.id = 'e-num'; document.body.appendChild(e); }
    e.value = 'EST-2653';
    _estHistoryModal();
    const ov = document.getElementById('esthist-modal');
    ok(ov, 'modal element present');
    const rows = ov.querySelectorAll('.ehv-row').length;
    ok(rows === 3, 'modal shows 3 rows (this estimate only), got ' + rows);
    ok(/EST-2653/.test(ov.innerHTML), 'shows EST-2653');
    ok(!/EST-2651|EST-2654/.test(ov.innerHTML), 'does NOT show other estimates');
    ok(/3 snapshot/.test(ov.innerHTML), 'count reflects the filtered total');
  });
`;

if (require.main === module) runSuite('VERSION HISTORY (per-estimate scope)', BODY).then(code => process.exit(code));
module.exports = { BODY };
