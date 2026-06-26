// Pool Safety Act §115922 — the checklist drives a generated proposal section + live card preview,
// persists via specInputs, and emits the right conditional notes. Drives the real shipped DOM + fns.
const { runSuite } = require('./harness');

const BODY = `
  function setSafe(id, on){ const el = document.getElementById('ctp-safe-'+id); el.checked = !!on; }
  function clearAll(){ ['fence','gate','cover','door','dooralarm','poolalarm'].forEach(id => setSafe(id,false)); }

  T('SAF0 the card + 6 checkboxes + functions are present', () => {
    ok(document.getElementById('spec-card-safety'), 'safety card rendered');
    ['fence','gate','cover','door','dooralarm','poolalarm'].forEach(id => ok(document.getElementById('ctp-safe-'+id), id+' checkbox'));
    ['ctpSafetySelected','ctpSafetyContentHTML','ctpSafetyProposalSection','ctpSafetyUpdate','_ctpCaptureSafety'].forEach(f => ok(typeof window[f]==='function' || typeof eval(f)==='function', f));
  });

  T('SAF1 selected features print their line + the always-on §115922 disclosure', () => {
    clearAll(); setSafe('fence',true); setSafe('cover',true);
    const html = ctpSafetyContentHTML();
    ok(/perimeter fence/i.test(html), 'fence line present');
    ok(/ASTM F1346-23/.test(html), 'cover line present');
    ok(/§115922/.test(html) && /informed you of the Swimming Pool Safety Act/.test(html), 'disclosure present');
    ok(/no greater than 4/.test(html), 'fence note present');
    ok(!/rebuilt to meet the requirement/.test(html), 'no gate note (gate not selected)');
    ok(!/ctp-safe-warn/.test(html), 'no min-2 warning element at 2 features');
  });

  T('SAF2 a single feature triggers the minimum-two warning', () => {
    clearAll(); setSafe('fence',true);
    const html = ctpSafetyContentHTML();
    ok(/ctp-safe-warn/.test(html) && /minimum of two independent/.test(html), 'min-two warning element shown for a single selection');
  });

  T('SAF3 the shared alarm note appears once; pool-alarm adds its 18-inch note', () => {
    clearAll(); setSafe('dooralarm',true); setSafe('poolalarm',true);
    const html = ctpSafetyContentHTML();
    const alarmNoteCount = (html.match(/installation is the homeowner/g) || []).length;
    ok(alarmNoteCount === 1, 'shared alarm note appears exactly once, got ' + alarmNoteCount);
    ok(/CTP supplies the safety alarms/.test(html), 'alarm note: CTP supplies the alarms');
    ok(/does not install them/.test(html), 'alarm note: CTP does not install them');
    ok(/over 18 inches deep/.test(html), 'pool-alarm 18-inch note present');
    ok(/ASTM F2208/.test(html), 'pool alarm line present');
  });

  T('SAF4 nothing selected -> no content, no proposal section, muted preview', () => {
    clearAll();
    ok(ctpSafetyContentHTML() === '', 'content empty');
    ok(ctpSafetyProposalSection() === '', 'proposal section empty (sheet unchanged)');
    ctpSafetyUpdate();
    ok(/No features selected/.test(document.getElementById('ctp-safety-preview').innerHTML), 'muted placeholder shown');
  });

  T('SAF5 _ctpCaptureSafety records the 6 checkbox states for persistence', () => {
    clearAll(); setSafe('gate',true); setSafe('door',true);
    const cap = {};
    _ctpCaptureSafety(cap);
    ok(cap['ctp-safe-gate'] && cap['ctp-safe-gate'].checked === true, 'gate captured checked');
    ok(cap['ctp-safe-door'] && cap['ctp-safe-door'].checked === true, 'door captured checked');
    ok(cap['ctp-safe-fence'] && cap['ctp-safe-fence'].checked === false, 'fence captured unchecked');
    // simulate restore (global by-id, like loadSavedEstimate) onto cleared boxes
    clearAll();
    Object.entries(cap).forEach(([id,v]) => { const el = document.getElementById(id); if (el) el.checked = !!v.checked; });
    ok(document.getElementById('ctp-safe-gate').checked && document.getElementById('ctp-safe-door').checked, 'restored from capture');
  });

  T('SAF6 the proposal section wraps the selected features for the sheet', () => {
    clearAll(); setSafe('door',true); setSafe('gate',true);
    const sec = ctpSafetyProposalSection();
    ok(/safety-section/.test(sec) && /SWIMMING POOL SAFETY ACT/.test(sec), 'section header present');
    ok(/release at least 60/.test(sec), 'device line (60" release) in section');
    ok(/Reversal of the gate/i.test(sec), 'gate line in section');
    ok(/\\$300/.test(sec) && /\\$500/.test(sec), 'gate rebuild fee ($300–$500) note in section');
  });

  T('SAF7 live preview updates as boxes toggle; reset clears them', () => {
    clearAll(); setSafe('cover',true); ctpSafetyUpdate();
    ok(/Pool Covers, Inc\\./.test(document.getElementById('ctp-safety-preview').innerHTML), 'preview reflects selection');
    ctpSafetyReset();
    ok(ctpSafetySelected().length === 0, 'reset unchecked all');
    ok(/No features selected/.test(document.getElementById('ctp-safety-preview').innerHTML), 'preview muted after reset');
  });
`;

if (require.main === module) runSuite('POOL SAFETY ACT §115922 (checklist → proposal)', BODY).then(code => process.exit(code));
module.exports = { BODY };
