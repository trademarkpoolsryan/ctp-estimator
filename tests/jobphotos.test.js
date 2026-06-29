// Job Portal "Site Photos" tab: upload site photos (stored as t-photos docs in ctp_docs_<pid> so they
// flow to the client portal), tag each with the build stage it belongs to, gallery grouped by stage,
// re-tag and delete. Drives the real Job Portal: open a job, switch to the Site Photos tab, exercise
// the real handlers.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};
  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 850, name: 'Photo Job', address: '7 Pool Ln', num: 'EST-850', value: 100000, stage: 'Gunite / Shell', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();
  localStorage.setItem('ctp_docs_850', JSON.stringify([
    { id:'a', name:'dig.jpg', type:'image/jpeg', dataUrl:'data:image/jpeg;base64,AAAA', tagId:'t-photos', stage:'Excavation', uploadedAt:'Jun 1, 2026' },
    { id:'b', name:'gun.jpg', type:'image/jpeg', dataUrl:'data:image/jpeg;base64,BBBB', tagId:'t-photos', stage:'Gunite', uploadedAt:'Jun 5, 2026' },
    { id:'c', name:'permit.pdf', type:'application/pdf', dataUrl:'data:application/pdf;base64,JVBE', tagId:'t-permits', uploadedAt:'Jun 2, 2026' }
  ]));

  ok(typeof window.jpPhotoUpload === 'function', 'jpPhotoUpload exposed');
  ok(typeof window.jpPhotoSetStage === 'function', 'jpPhotoSetStage exposed');
  ok(typeof window.jpPhotoDelete === 'function', 'jpPhotoDelete exposed');

  function ptab(){ return document.getElementById('jp-photos'); }
  var SP = (typeof JP_TABS !== 'undefined') ? JP_TABS.indexOf('Site Photos') : 4;

  T('JPH0 the Site Photos tab renders an upload control + stage selector', () => {
    window.openJobPortal(0);
    ok(SP >= 0, 'Site Photos is a real tab');
    jpSwitchTab(SP);
    const ph = ptab();
    ok(ph && !ph.hidden, 'jp-photos panel visible');
    ok(ph.querySelector('#jp-ph-file'), 'file input present');
    ok(ph.querySelector('#jp-ph-stage'), 'build-stage selector present');
    // the selector offers the GRANULAR schedule stages, not the coarse client phases
    const sel = ph.querySelector('#jp-ph-stage').innerHTML;
    ok(/Excavation/.test(sel) && /Rough Plumbing/.test(sel) && /Rebar/.test(sel) && /Gunite/.test(sel), 'offers the schedule build stages');
    ok(!/Plumbing &amp; Steel/.test(sel), 'NOT the coarse 7-phase list');
    ok(!/Inspection/.test(sel), 'inspection gates are excluded (no photos for those)');
  });

  T('JPH1 existing site photos render grouped by stage; non-photo docs are excluded', () => {
    const ph = ptab();
    ok(/Excavation/.test(ph.innerHTML) && /Gunite/.test(ph.innerHTML), 'stage group headers shown');
    ok(!/permit\\.pdf/.test(ph.innerHTML), 'non-photo docs excluded from the gallery');
    ok(ph.querySelectorAll('img').length === 2, 'two site photos shown, got ' + ph.querySelectorAll('img').length);
  });

  T('JPH2 re-tagging a photo moves it to the new stage and persists', () => {
    jpPhotoSetStage('a', 'Tile');
    const arr = JSON.parse(localStorage.getItem('ctp_docs_850'));
    const a = arr.filter(d => d.id === 'a')[0];
    ok(a && a.stage === 'Tile', 'stage updated + persisted to ctp_docs');
    ok(/Tile/.test(ptab().innerHTML), 're-rendered under the new stage');
  });

  T('JPH3 deleting a photo removes it from the store and the gallery', () => {
    jpPhotoDelete('b');
    const arr = JSON.parse(localStorage.getItem('ctp_docs_850'));
    ok(!arr.some(d => d.id === 'b'), 'photo removed from ctp_docs');
    ok(ptab().querySelectorAll('img').length === 1, 'one photo left in the gallery');
  });
`;

if (require.main === module) runSuite('JOB PORTAL — SITE PHOTOS (stage-tagged)', BODY).then(code => process.exit(code));
module.exports = { BODY };
