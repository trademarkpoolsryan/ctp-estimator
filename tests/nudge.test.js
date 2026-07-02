// Proposal staleness nudge — the "⟳ Estimate changed — regenerate" pill.
// Locks down: pill exists in BOTH toolbars (New Estimate + Projects editor); fires on
// qty/line/target/name drift; CLEARS when the estimate returns to the generated state;
// survives the EST-2654 vs EST-2654-2 job-number suffix mismatch; legacy (signature-less)
// records fall back to grand-total comparison; regenerating replaces the one-per-sheet
// record and clears the pill.
const { runSuite } = require('./harness');

const BODY = `
  window.confirm = function(){ return true; };
  var _alerts = []; window.alert = function(m){ _alerts.push(String(m||'')); };
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function disp(id){ var e = document.getElementById(id); return e ? (e.style.display || '') : 'MISSING'; }
  function gen(){ try { genProposal(); } catch(e){} return wait(700).then(function(){
    var o = document.getElementById('ctp-proposal-overlay'); if (o) o.remove(); }); }

  // Build a real estimate from the seed catalog; stub the CDN libs so genProposal's
  // save path runs offline (real canvas so the slicing pipeline works).
  estLines = []; window._manualOrderLocked = false; window._roundToHundred = false;
  var setF = function(id, v){ var el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft', 450); setF('pb-perim', 90); setF('pb-markup', 17);
  setF('e-num', 'EST-2654'); setF('e-name', 'Mark Guasch');
  addTmplToEst('Pool 1 Base Estimate Tempate');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');
  window._collapsedParents = new Set(); window._collapsedGroups = new Set();
  window.html2canvas = function(){ var c = document.createElement('canvas'); c.width = 820; c.height = 1000; c.getContext('2d').fillRect(0, 0, 1, 1); return Promise.resolve(c); };
  window.jspdf = { jsPDF: function(){ return { addPage:function(){}, addImage:function(){}, line:function(){}, setDrawColor:function(){}, setLineWidth:function(){}, setFont:function(){}, setFontSize:function(){}, setTextColor:function(){}, text:function(){}, output:function(){ return 'data:'; } }; } };
  localStorage.removeItem('ctp_proposals');

  // A priced line to edit throughout.
  var GI = -1, II = -1;
  (function(){ for (var a = 0; a < estLines.length && GI < 0; a++){ var its = estLines[a].items || [];
    for (var b = 0; b < its.length; b++){ if ((its[b].qty || 0) > 0 && (its[b].cost || 0) > 0){ GI = a; II = b; return; } } } })();

  T('N0 nudge helpers + pill are present', () => {
    ok(typeof _refreshProposalStaleNote === 'function', '_refreshProposalStaleNote exposed');
    ok(typeof _propJobBase === 'function', '_propJobBase exposed');
    ok(typeof _proposalSig === 'function', '_proposalSig exposed');
    ok(document.getElementById('prop-stale-note'), 'New Estimate pill in DOM');
    ok(GI >= 0, 'found a priced line to edit');
  });

  T('N1 _propJobBase normalizes the pool suffix but preserves the EST- dash', () => {
    ok(_propJobBase('EST-2654-2') === 'EST-2654', 'strips the pool suffix');
    ok(_propJobBase('EST-2654') === 'EST-2654', 'base form untouched');
    ok(_propJobBase(' EST-2654-10 ') === 'EST-2654', 'trims + strips');
    ok(_propJobBase('CUSTOM-77') === 'CUSTOM-77', 'non-EST numbers pass through');
  });

  await TA('N2 pill hidden after generate; shows on qty edit; CLEARS on revert to original', async () => {
    await gen();
    ok(disp('prop-stale-note') === 'none', 'in sync after generate');
    var orig = estLines[GI].items[II].qty;
    upd(GI, II, 'qty', String(orig + 2));
    ok(disp('prop-stale-note') === 'inline-flex', 'shows after qty change');
    upd(GI, II, 'qty', String(orig));
    ok(disp('prop-stale-note') === 'none', 'clears when reverted to the generated state');
  });

  T('N3 shows when a template group is added; clears when it is removed', () => {
    var before = estLines.length;
    addTmplToEst('Additional Pump'); renderEst();
    ok(disp('prop-stale-note') === 'inline-flex', 'shows after adding a group');
    while (estLines.length > before) estLines.splice(estLines.length - 1, 1);
    renderEst();
    ok(disp('prop-stale-note') === 'none', 'clears after removing it');
  });

  T('N3b USER FLOW: pump added via the specs Add-Ons then deleted on the sheet clears the pill', () => {
    // toggleTmpl is the real Add-Ons checkbox path; removeGroup is the real sheet ✕. Auto-notes
    // are live here (refreshNotesLive runs in updateTotals), so this also proves the notes
    // bullet the pump adds is removed again when the pump rows are deleted.
    var before = estLines.length;
    toggleTmpl('Additional Pump'); renderEst(); updateTotals();
    ok(disp('prop-stale-note') === 'inline-flex', 'shows after adding via specs');
    for (var i = estLines.length - 1; i >= before; i--) removeGroup(i);
    updateTotals();
    ok(disp('prop-stale-note') === 'none', 'clears after deleting the pump rows on the sheet');
  });

  T('N4 price target shows; clearing the target clears the pill', () => {
    setLineTarget(GI, II, '$99999'); renderEst();
    ok(disp('prop-stale-note') === 'inline-flex', 'shows after a target');
    setLineTarget(GI, II, ''); renderEst();
    ok(disp('prop-stale-note') === 'none', 'clears after unsetting the target');
  });

  T('N5 suffix mismatch: generated under EST-2654, edited under EST-2654-2 still nudges', () => {
    setF('e-num', 'EST-2654-2');
    var orig = estLines[GI].items[II].qty;
    upd(GI, II, 'qty', String(orig + 1));
    ok(disp('prop-stale-note') === 'inline-flex', 'nudges across number forms');
    upd(GI, II, 'qty', String(orig));
    ok(disp('prop-stale-note') === 'none', 'and still clears on revert');
    setF('e-num', 'EST-2654');
  });

  T('N6a a sig from an OLDER formula version falls back to totals (never pinned stale)', () => {
    var grand = Math.round(estDispGrand(estLines));
    localStorage.setItem('ctp_proposals', JSON.stringify([{ id: 8, seriesKey: 'Pool 1__EST-2654',
      poolSheet: _activeSheetName(), estimateNum: 'EST-2654', label: 'old-formula', date: new Date().toISOString(),
      sig: 'zzz111.4242',            // pre-versioning format — can never match the current formula
      baseTotal: grand, optionalTotal: 0 }]));
    renderEst();
    ok(disp('prop-stale-note') === 'none', 'old-version sig + matching grand → NOT stale');
    var orig = estLines[GI].items[II].qty;
    upd(GI, II, 'qty', String(orig + 3));
    ok(disp('prop-stale-note') === 'inline-flex', 'old-version sig + grand drift → nudges');
    upd(GI, II, 'qty', String(orig));
    ok(disp('prop-stale-note') === 'none', 'and clears again on revert');
  });

  T('N6 legacy record without a signature falls back to grand-total drift', () => {
    var grand = Math.round(estDispGrand(estLines));
    localStorage.setItem('ctp_proposals', JSON.stringify([{ id: 9, seriesKey: 'Pool 1__EST-2654-2',
      poolSheet: _activeSheetName(), estimateNum: 'EST-2654-2', label: 'legacy', date: new Date().toISOString(),
      baseTotal: grand, optionalTotal: 0 }]));
    renderEst();
    ok(disp('prop-stale-note') === 'none', 'matching grand → no nudge');
    var orig = estLines[GI].items[II].qty;
    upd(GI, II, 'qty', String(orig + 3));
    ok(disp('prop-stale-note') === 'inline-flex', 'grand drift → nudges');
    upd(GI, II, 'qty', String(orig));
  });

  await TA('N7 regenerating replaces the one-per-sheet record (normalized key) and clears the pill', async () => {
    setF('e-num', 'EST-2654-2');            // suffixed form at generation time
    await gen();
    var list = safeParseLS('ctp_proposals', []);
    ok(list.length === 1, 'one record per sheet+job, got ' + list.length);
    ok(list[0].seriesKey === 'Pool 1__EST-2654', 'seriesKey stores the normalized base, got ' + list[0].seriesKey);
    ok(!!list[0].sig, 'record carries a signature');
    ok(disp('prop-stale-note') === 'none', 'pill cleared right after regenerating');
    setF('e-num', 'EST-2654');
  });

  await TA('N8 the Projects saved-estimate editor has its own pill and it fires there', async () => {
    savedEstimates.length = 0;
    savedEstimates.push({ id: 7001, num: 'EST-2654', customer: 'Mark Guasch',
      label: 'EST-2654 — Mark Guasch', date: '7/1/2026', lines: JSON.parse(JSON.stringify(estLines)) });
    nav('projects');
    loadSavedEstimate(7001);
    await wait(300);
    ok(document.getElementById('se-prop-stale-note'), 'editor pill in DOM');
    localStorage.removeItem('ctp_proposals');
    await gen();
    ok(disp('se-prop-stale-note') === 'none', 'editor pill in sync after generate');
    var orig = estLines[GI].items[II].qty;
    upd(GI, II, 'qty', String(orig + 2));
    ok(disp('se-prop-stale-note') === 'inline-flex', 'editor pill fires on edit');
    upd(GI, II, 'qty', String(orig));
    ok(disp('se-prop-stale-note') === 'none', 'editor pill clears on revert');
  });
`;

if (require.main === module) runSuite('PROPOSAL NUDGE (stale pill, both toolbars)', BODY).then(code => process.exit(code));
module.exports = { BODY };
