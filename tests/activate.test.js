// Estimate → Active Project: the job's contract value must be the estimate's DISPLAYED grand
// (honoring its stored Round state), not a raw cost×markup sum. Drives the real shipped
// convertEstimateToProject() and sendToProject value path on a real seed-template estimate.
const { runSuite } = require('./harness');

const BODY = `
  // ---- build a real estimate (no login / network) ----
  estLines = []; window._manualOrderLocked = false;
  const setF = (id,v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setF('pb-sqft',450); setF('pb-perim',90); setF('pb-deck',600); setF('pb-markup',17);
  addTmplToEst('Pool 1 Base Estimate Tempate'); addTmplToEst('Spa');
  applySmartQuantities(450, 90, 'Pool 1 Base Estimate Tempate');
  window._roundToHundred = true; window._roundAmount = 100;

  function rawGrand(lines){ return Math.round((lines||[]).reduce((s,g)=>s+(g.items||[]).reduce((t,it)=>t+(it.qty||0)*(it.cost||0)*(1+(it.markup||0)/100),0),0)); }

  // stub side-effects (nav / persistence / confirm). The active-job conversion now PROMPTS for the new
  // job number, so feed a unique one each call (a clash would abort the conversion).
  let _jobn = 0; window.prompt = () => 'JOB-' + (++_jobn);
  window.confirm = () => true; window.nav = () => {}; window.pmShow = () => {}; window.renderProjects = () => {};
  window.saveState = () => {}; window._safeSetItem = () => {};

  // a saved estimate snapshot finalized with Round ON (the client signed the rounded contract)
  const SID = 990011;
  const snap = { id: SID, label: 'TEST — Client', customer: 'Client', num: '9001', address: '1 Pool Ln',
    sqft: '450', phone: '', email: '', notes: '', roundToHundred: true,
    lines: JSON.parse(JSON.stringify(estLines)) };
  savedEstimates = (savedEstimates || []).filter(s => s.id !== SID); savedEstimates.push(snap);
  projects = (projects || []).filter(p => p.linkedSavedEstimateId !== SID);

  const roundedContract = Math.round(estSnapDisp(snap).grand);
  const raw = rawGrand(snap.lines);

  T('ACT0 sanity: rounded contract value differs from the raw total and is clean', () => {
    ok(roundedContract % 100 === 0, 'rounded value is a clean multiple of 100: ' + roundedContract);
    ok(roundedContract !== raw, 'rounding actually changed the number (raw ' + raw + ' vs ' + roundedContract + ')');
    ok(Math.abs(roundedContract - raw) <= 60, 'still within ~half an increment of raw');
  });

  T('ACT1 convertEstimateToProject uses the rounded contract value, not the raw total', () => {
    convertEstimateToProject(SID);
    const proj = projects.find(p => p.linkedSavedEstimateId === SID);
    ok(proj, 'project was created');
    close(proj.value, roundedContract, 'project.value == rounded contract', 0.5);
    ok(proj.value !== raw, 'project.value is NOT the raw unrounded total');
    ok(proj.value % 100 === 0, 'project.value is a clean multiple of 100');
  });

  T('ACT2 a Round-OFF estimate converts at its exact (unrounded) total', () => {
    const SID2 = 990022;
    const snap2 = { id: SID2, label: 'TEST2 — Exact', customer: 'Exact', num: '9002', address: '2 Pool Ln',
      sqft: '450', phone:'', email:'', notes:'', roundToHundred: false, lines: JSON.parse(JSON.stringify(estLines)) };
    savedEstimates = savedEstimates.filter(s => s.id !== SID2); savedEstimates.push(snap2);
    projects = projects.filter(p => p.linkedSavedEstimateId !== SID2);
    convertEstimateToProject(SID2);
    const proj = projects.find(p => p.linkedSavedEstimateId === SID2);
    ok(proj, 'project created');
    close(proj.value, rawGrand(snap2.lines), 'Round-off estimate -> exact total', 0.5);
  });
`;

if (require.main === module) runSuite('ESTIMATE → ACTIVE PROJECT (contract value)', BODY).then(code => process.exit(code));
module.exports = { BODY };
