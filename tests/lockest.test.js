// Saved estimate ↔ active job lock: once a saved estimate is linked to an active job it becomes
// READ-ONLY (view, don't edit) so the quoted record is preserved — and you can branch it into a NEW
// Job # without disrupting the original. Drives the real app globals (savedEstimates / projects) and
// the real functions (_estLockedById, _setEstViewOnly, editSavedEstimate, saveAsNewEstimateFrom,
// renderSavedEstimates, loadSavedEstimate).
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){}; window.showSavedToast = function(){};
  var _alerts = []; window.alert = function(m){ _alerts.push(String(m||'')); };
  window.confirm = function(){ return true; };

  function seed(){
    savedEstimates.length = 0;
    savedEstimates.push({ id:5001, num:'EST-5001', customer:'Locked Client', label:'EST-5001 — Locked Client', date:'6/29/2026', lines:[] });
    savedEstimates.push({ id:5002, num:'EST-5002', customer:'Open Client',   label:'EST-5002 — Open Client',   date:'6/29/2026', lines:[] });
    projects.length = 0;
    projects.push({ id:9001, name:'Locked Client', num:'EST-5001', stage:'Excavation', linkedSavedEstimateId:5001 });
  }
  seed();

  ok(typeof _estLockedById === 'function', '_estLockedById exposed');
  ok(typeof _setEstViewOnly === 'function', '_setEstViewOnly exposed');
  ok(typeof saveAsNewEstimateFrom === 'function', 'saveAsNewEstimateFrom exposed');

  T('LCK0 a linked estimate reads as locked; an unlinked one does not', () => {
    ok(_estLockedById(5001) === true, 'linked estimate is locked');
    ok(_estLockedById(5002) === false, 'unlinked estimate is editable');
  });

  T('LCK1 _setEstViewOnly toggles the read-only body class + global', () => {
    _setEstViewOnly(5001);
    ok(document.body.classList.contains('ctp-est-viewonly'), 'view-only class on');
    ok(String(window._estViewOnly) === '5001', '_estViewOnly tracks the record');
    _setEstViewOnly(null);
    ok(!document.body.classList.contains('ctp-est-viewonly'), 'view-only class cleared');
    ok(window._estViewOnly == null, '_estViewOnly cleared');
  });

  T('LCK2 editing Job#/name is blocked for a locked estimate, allowed otherwise', () => {
    window._editEstId = null; _alerts.length = 0;
    editSavedEstimate(5001);
    ok(window._editEstId == null, 'locked estimate never enters the edit modal');
    ok(_alerts.some(a => /locked/i.test(a)), 'explains it is locked, got: ' + _alerts.join(' | '));
    editSavedEstimate(5002);
    ok(String(window._editEstId) === '5002', 'an unlinked estimate still opens the edit dialog');
    try { closeModal('modal-editest'); } catch(e){}
    window._editEstId = null;
  });

  T('LCK3 opening a locked estimate enters read-only mode + locks the editor bar', () => {
    nav('projects');
    loadSavedEstimate(5001);   // routes to the Projects editor (openInProjects)
    ok(document.body.classList.contains('ctp-est-viewonly'), 'sheet is in read-only mode');
    ok(String(window._estViewOnly) === '5001', 'viewing the locked record');
    const save = document.getElementById('se-save-btn');
    ok(save && /new Job #/i.test(save.textContent), 'Save becomes "Save as new Job #", got: ' + (save && save.textContent));
    const meta = document.getElementById('se-editmeta-btn');
    ok(meta && meta.style.display === 'none', 'the rename pencil is hidden while locked');
    ok(document.getElementById('se-lock-chip'), 'a "Locked — active job" chip is shown');
  });

  T('LCK4 opening an unlinked estimate is editable (no lock)', () => {
    nav('projects');
    loadSavedEstimate(5002);
    ok(!document.body.classList.contains('ctp-est-viewonly'), 'not read-only');
    ok(window._estViewOnly == null, 'no view-only record');
    const save = document.getElementById('se-save-btn');
    ok(save && /Save Estimate/i.test(save.textContent), 'Save reads normally, got: ' + (save && save.textContent));
    const meta = document.getElementById('se-editmeta-btn');
    ok(meta && meta.style.display !== 'none', 'the rename pencil is available');
  });

  T('LCK5 saveAsNewEstimateFrom clones to a new Job # and leaves the original untouched', () => {
    seed();
    const before = savedEstimates.length;
    window.prompt = function(){ return 'EST-7777'; };
    saveAsNewEstimateFrom(5001);
    ok(savedEstimates.length === before + 1, 'a new estimate was created');
    const copy = savedEstimates.find(s => s.num === 'EST-7777');
    ok(copy, 'the copy carries the new Job #');
    ok(String(copy.id) !== '5001', 'the copy has its own id');
    ok(copy.customer === 'Locked Client', 'customer carried over');
    ok(/EST-7777/.test(copy.label) && !/EST-5001/.test(copy.label), 'copy relabeled to the new #, got: ' + copy.label);
    ok(_estLockedById(copy.id) === false, 'the copy is unlinked + editable');
    // original is completely intact
    const orig = savedEstimates.find(s => s.id === 5001);
    ok(orig && orig.num === 'EST-5001' && orig.label === 'EST-5001 — Locked Client', 'original Job#/name unchanged');
    ok(_estLockedById(5001) === true, 'original is still the locked active-job estimate');
  });

  T('LCK6 a duplicate new Job # is rejected (no clone created)', () => {
    seed();
    const before = savedEstimates.length;
    _alerts.length = 0;
    window.prompt = function(){ return 'EST-5002'; };   // already used
    saveAsNewEstimateFrom(5001);
    ok(savedEstimates.length === before, 'no estimate created for a clashing Job #');
    ok(_alerts.some(a => /already used/i.test(a)), 'warns about the clash, got: ' + _alerts.join(' | '));
  });

  var YY = String(new Date().getFullYear()).slice(-2);

  T('LCK8 _nextJobNumber follows year+sequence and restarts each year', () => {
    projects.length = 0;
    ok(_nextJobNumber() === YY + '01', 'first job of the year is ' + YY + '01, got ' + _nextJobNumber());
    projects.push({ id:1, num: YY + '05', name:'A' });
    projects.push({ id:2, num: YY + '02', name:'B' });
    ok(_nextJobNumber() === YY + '06', 'increments past the highest of the year, got ' + _nextJobNumber());
    projects.push({ id:3, num: 'EST-9', name:'C' });   // non-conforming numbers are ignored
    ok(_nextJobNumber() === YY + '06', 'ignores numbers that do not match the convention');
  });

  T('LCK9 _promptActiveJobNumber returns the entry and rejects a clash', () => {
    projects.length = 0; projects.push({ id:1, num: YY + '01', name:'X' });
    window.prompt = function(){ return YY + '02'; };
    ok(_promptActiveJobNumber() === YY + '02', 'returns the chosen number');
    _alerts.length = 0; window.prompt = function(){ return YY + '01'; };   // already taken
    ok(_promptActiveJobNumber() === null, 'rejects a number already in use by an active job');
    ok(_alerts.some(a => /already an active job/i.test(a)), 'warns about the clash');
    window.prompt = function(){ return null; };
    ok(_promptActiveJobNumber() === null, 'cancelling returns null');
  });

  T('LCK10 making a saved estimate active prompts for a NEW number; the estimate keeps its own', () => {
    seed();                                  // 5002 is unlinked; 5001 is the locked one
    window.confirm = function(){ return true; };
    window.prompt = function(){ return YY + '07'; };
    const before = projects.length;
    convertEstimateToProject(5002);
    ok(projects.length === before + 1, 'a new active job is created');
    const np = projects.find(p => String(p.linkedSavedEstimateId) === '5002');
    ok(np && np.num === YY + '07', 'the active job uses the prompted number, got ' + (np && np.num));
    const est = savedEstimates.find(s => s.id === 5002);
    ok(est && est.num === 'EST-5002' && est.label === 'EST-5002 — Open Client', 'the saved estimate keeps its own number/name');
  });

  T('LCK11 cancelling the Job # prompt creates no active job', () => {
    seed();
    window.prompt = function(){ return null; };
    const before = projects.length;
    convertEstimateToProject(5002);
    ok(projects.length === before, 'no active job created when the prompt is cancelled');
  });

  T('LCK12 the active job card shows the new Job # AND the original linked estimate', () => {
    savedEstimates.length = 0;
    savedEstimates.push({ id:6001, num:'EST-781', customer:'Brian', label:'EST-781 — Brian', lines:[] });
    projects.length = 0;
    const p = { id:7001, name:'Brian & Emily Mclean', num:'2601', phone:'916-276-0785', value:124500, sqft:'420', stage:'Estimate', linkedSavedEstimateId:6001 };
    projects.push(p);
    const html = _projCardHTML(p);
    ok(/Job #2601/.test(html), 'a line shows the new active job number "Job #2601" (no EST prefix)');
    ok(html.indexOf('Est 2601') < 0, 'the job number is never labeled as an estimate');
    ok(html.indexOf('From estimate: EST-781 — Brian') >= 0, 'a separate line shows the ORIGINAL linked saved estimate file name');
    // the two facts live on two distinct lines (separate divs), job # line before the estimate line
    ok(/Job #2601<\\/b><\\/div>[\\s\\S]*From estimate:/.test(html), 'job number and linked estimate are on separate lines');
    ok(/color:var\\(--green\\)">Job #2601/.test(html), 'the Job # is green (signifies active)');
    ok(html.indexOf('>Estimate<') < 0, 'the yellow "Estimate" stage badge is gone');
    ok(/fill:var\\(--green\\)[\\s\\S]*?916-276-0785/.test(html), 'the phone icon is a green SVG');
  });

  T('LCK13 a real construction stage still shows its badge', () => {
    const html = _projCardHTML({ id:7003, name:'Y', num:'2603', stage:'Excavation' });
    ok(/>Excavation<\\/span>/.test(html), 'non-Estimate stages keep the stage badge');
  });

  T('LCK7 the Saved Estimates list locks the linked row and offers View + New #', () => {
    seed();
    nav('projects');
    renderSavedEstimates();
    const locked = document.querySelector('[data-selid="5001"]');
    const open = document.querySelector('[data-selid="5002"]');
    ok(locked && open, 'both rows render');
    ok(/>\\s*View\\s*</.test(locked.innerHTML), 'linked row primary action is View');
    ok(/New #/.test(locked.innerHTML), 'linked row offers "New #"');
    ok(locked.innerHTML.indexOf('🔒') >= 0, 'linked row shows the lock instead of the rename pencil');
    ok(/i-pencil/.test(open.innerHTML) && /New #/.test(open.innerHTML) === false, 'unlinked row keeps the pencil, no New #');
    ok(/>\\s*Load\\s*</.test(open.innerHTML), 'unlinked row primary action is Load');
  });
`;

if (require.main === module) runSuite('SAVED ESTIMATE LOCK (active-job read-only + Save as new #)', BODY).then(code => process.exit(code));
module.exports = { BODY };
