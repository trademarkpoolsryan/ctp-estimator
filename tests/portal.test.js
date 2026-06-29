// Client-portal overhaul: tabbed no-scroll layout + curated finishes model. Replaces the old
// auto-from-estimate selections list (which ballooned to dozens of duplicate rows) with three base
// finishes (Tile, Concrete Finish, Plaster Finish) plus team-added optional/custom finishes. Drives
// the REAL portal DOM: tab switching, the curated list, add/remove finish, and the migration that
// collapses a legacy 91-row list down to the 3 base finishes.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};

  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 781, name: 'Redesign Client', address: '5 Pool Ln', num: 'EST-781',
    value: 90000, collected: 0, stage: 'Plumbing & Steel', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();
  function pane(){ return document.getElementById('cp-pane'); }
  function open(){ nav('clientportal'); CP.open('781'); }
  function selLabels(){ return Array.prototype.map.call(pane().querySelectorAll('#cp-sec-selections .cp-row > div > div:first-child'), e => e.textContent.replace(/added$/,'').trim()); }

  T('PRT0 a tab bar renders with the 6 sections, Build active, one panel shown', () => {
    open();
    const tabs = pane().querySelectorAll('.cp-tab');
    ok(tabs.length === 6, 'six tabs');
    const labels = Array.prototype.map.call(tabs, t => t.textContent.replace(/[0-9]+$/,'').trim());
    ['Build','Schedule','Selections','Payments','Docs','Messages'].forEach(l => ok(labels.indexOf(l) >= 0, 'tab '+l));
    const on = pane().querySelectorAll('.cp-panel.on');
    ok(on.length === 1, 'exactly one panel visible');
    ok(on[0].getAttribute('data-panel') === 'build', 'Build is the default panel');
    ok(pane().querySelector('.cp-tab.on').getAttribute('data-tab') === 'build', 'Build tab marked active');
  });

  T('PRT1 the build panel shows "Where we are" (current stage + up next), no Design&Permits stepper', () => {
    open();
    const build = pane().querySelector('.cp-panel[data-panel=build]');
    ok(!build.querySelector('.cp-stepper'), 'old phase stepper removed');
    const now = build.querySelector('.cp-now');
    ok(now && /Where we are/i.test(now.innerHTML), '"Where we are" card present');
    ok(now.querySelector('.ph'), 'shows the current stage');
    ok(/Up next/i.test(now.innerHTML), 'shows what is next');
    ok(!/Design &amp; Permits/.test(build.innerHTML), 'no Design & Permits bubble');
  });

  T('PRT2 CP.tab switches the visible panel without re-rendering away the others', () => {
    open();
    CP.tab('payments');
    const on = pane().querySelectorAll('.cp-panel.on');
    ok(on.length === 1 && on[0].getAttribute('data-panel') === 'payments', 'payments panel now visible');
    ok(pane().querySelector('.cp-tab.on').getAttribute('data-tab') === 'payments', 'payments tab active');
    ok(document.getElementById('cp-sec-invest'), 'investment card still in the DOM');
  });

  T('PRT3 Selections shows exactly the 3 base finishes — no 91-row blowup', () => {
    open();
    const labels = selLabels();
    ok(labels.length === 3, 'three rows, got ' + labels.length);
    ['Tile','Concrete Finish','Plaster Finish'].forEach(l => ok(labels.indexOf(l) >= 0, 'has ' + l));
  });

  T('PRT4 admin can add an optional finish; it shows an "added" badge and leaves the dropdown', () => {
    open();
    CP.tab('selections');
    ok(document.getElementById('cp-fin-sel'), 'admin add control present');
    CP.addFinish('Spa', false);
    const labels = selLabels();
    ok(labels.indexOf('Spa') >= 0, 'Spa added');
    ok(/added/.test(pane().querySelector('#cp-sec-selections').innerHTML), 'shows the added badge');
    // re-render keeps us on the selections tab and Spa drops out of the dropdown options
    const opts = Array.prototype.map.call(document.querySelectorAll('#cp-fin-sel option'), o => o.value);
    ok(opts.indexOf('Spa') < 0, 'Spa no longer offered in the dropdown');
  });

  T('PRT5 a custom finish can be added by name', () => {
    open();
    CP.addFinish('Sun Shelf Tile', true);
    ok(selLabels().indexOf('Sun Shelf Tile') >= 0, 'custom finish present');
  });

  T('PRT6 base finishes have no remove button; added finishes do, and removeFinish drops them', () => {
    open();
    CP.addFinish('Raised Bond Beam', false);
    let rows = pane().querySelectorAll('#cp-sec-selections .cp-row');
    // base rows (first 3) have no remove control
    ok(!rows[0].querySelector('.cp-fin-rm'), 'base finish not removable');
    const added = Array.prototype.slice.call(rows).filter(r => r.querySelector('.cp-fin-rm'));
    ok(added.length >= 1, 'added finish is removable');
    const before = selLabels().length;
    // remove the Raised Bond Beam we just added (find its index in d.selections via its onclick)
    const rm = added[added.length-1].querySelector('.cp-fin-rm');
    const i = Number(rm.getAttribute('onclick').match(/removeFinish\\((\\d+)\\)/)[1]);
    CP.removeFinish(i);
    ok(selLabels().length === before - 1, 'one finish removed');
  });

  T('PRT7 the add control is hidden in client preview (team-only)', () => {
    open();
    document.body.classList.add('ctp-client-preview');
    CP.open('781'); // re-render in "preview" state
    ok(!document.getElementById('cp-fin-sel'), 'no add control for the client');
    ok(pane().querySelector('#cp-sec-selections'), 'but the selections list still renders');
    document.body.classList.remove('ctp-client-preview');
  });

  T('PRT8 a legacy 91-row selections blob is migrated down to the 3 base finishes', () => {
    // Seed a pre-existing portal record with the old auto-generated mess (no selVer).
    const big = [];
    for (let i = 0; i < 91; i++) big.push({ item: 'Interior finish', status: 'pending' });
    const store = { '782': { updates: [], selections: big, inspections: [] } };
    if (window.Backend.setLocalRaw) window.Backend.setLocalRaw('ctp_portal_v1', JSON.stringify(store));
    else localStorage.setItem('ctp_portal_v1', JSON.stringify(store));
    window.Backend.setLocalRaw('ctp_projects', JSON.stringify([
      { id: 781, name: 'Redesign Client', address: '5 Pool Ln', num: 'EST-781', value: 90000, collected: 0, stage: 'Plumbing & Steel', type: 'New Pool', date: '6/26/2026' },
      { id: 782, name: 'Legacy Client', num: 'EST-782', value: 80000, collected: 0, stage: 'Excavation', type: 'New Pool' }
    ]));
    window.jpReloadFromLocal();
    nav('clientportal'); CP.open('782');
    ok(selLabels().length === 3, 'collapsed from 91 to 3, got ' + selLabels().length);
  });

  T('PRT9 Build has no Inspections/Warranty; it carries a Site photos gallery', () => {
    open();
    const build = pane().querySelector('.cp-panel[data-panel=build]').innerHTML;
    ok(!/<h3>Inspections<\\/h3>/.test(build), 'no Inspections card on Build');
    ok(!/<h3>Warranty<\\/h3>/.test(build), 'no Warranty card on Build');
    ok(/<h3>Site photos<\\/h3>/.test(build), 'Site photos card present on Build');
  });

  T('PRT10 Schedule tab embeds the real Job-Portal calendar, read-only', () => {
    open();
    ok(typeof window.jpScheduleClientHTML === 'function', 'jpScheduleClientHTML exposed');
    const sched = pane().querySelector('.cp-panel[data-panel=schedule]');
    ok(sched, 'schedule panel present');
    const embed = sched.querySelector('#jp-schedule.cp-sched-embed');
    ok(embed, 'embeds the #jp-schedule calendar');
    ok(embed.classList.contains('cli'), 'rendered in the built-in read-only client mode');
    ok(embed.querySelector('.week'), 'has the month-grid calendar weeks');
    ok(embed.querySelectorAll('.prow').length >= 5, 'lists the build phases');
    ok(/Inspection/.test(embed.innerHTML), 'inspections appear in the schedule');
    ok(!/onclick=/.test(embed.innerHTML), 'inline handlers stripped (static / read-only)');
  });

  T('PRT11 the Money tab is now Payments with a "Payment schedule" card', () => {
    open();
    const lbls = Array.prototype.map.call(pane().querySelectorAll('.cp-tab'), t => t.textContent.replace(/[0-9]+$/,'').trim());
    ok(lbls.indexOf('Payments') >= 0 && lbls.indexOf('Money') < 0, 'tab renamed Money -> Payments');
    ok(/Payment schedule/.test(pane().querySelector('.cp-panel[data-panel=payments]').innerHTML), 'card titled Payment schedule');
  });

  T('PRT12 a saved proposal for this job shows in Docs with a View action -> the proposal viewer', () => {
    window.Backend.setLocalRaw('ctp_proposals', JSON.stringify([
      { id: 5551, estimateNum: 'EST-781', proposalNum: 2, baseTotal: 90000, optionalTotal: 12000, date: '2026-06-20T10:00:00.000Z' }
    ]));
    open();
    const docs = pane().querySelector('.cp-panel[data-panel=docs]');
    ok(/Proposal/.test(docs.innerHTML), 'proposal row present');
    ok(/full contract/.test(docs.innerHTML), 'labeled as the full contract');
    ok(/102,000/.test(docs.innerHTML), 'shows the combined contract total');
    const link = Array.prototype.slice.call(docs.querySelectorAll('.cp-chip')).filter(a => /viewProposal/.test(a.getAttribute('onclick')||''))[0];
    ok(link, 'View action wired to CP.viewProposal');
    let opened = null; window.viewSavedProposal = function(rec){ opened = rec; };
    CP.viewProposal(5551);
    ok(opened && String(opened.id) === '5551', 'viewProposal hands the record to the offline viewer');
  });

  T('PRT13 the Payment schedule mirrors CTP\\'s contract draw schedule (no deposit, 15/25/20/25/15)', () => {
    ok(typeof window.ctpDrawSchedule === 'function', 'contract drawSchedule exposed for reuse');
    const sc = window.ctpDrawSchedule(90000);   // 15/25/20/25/15 on $90k
    ok(sc.length === 5, 'five draws');
    ok(sc[0][1] === 13500 && sc[1][1] === 22500 && sc[2][1] === 18000 && sc[3][1] === 22500 && sc[4][1] === 13500, 'amounts match 15/25/20/25/15');
    ok(!/deposit/i.test(sc.map(r => r[0]).join(' ')), 'no deposit draw');
    open();
    const h = pane().querySelector('.cp-panel[data-panel=payments]').innerHTML;
    ['Excavation','Rough plumbing','Gunite','Tile, concrete','Equipment set'].forEach(l => ok(h.indexOf(l) >= 0, 'draw "' + l + '" present'));
    ['13,500','22,500','18,000'].forEach(a => ok(h.indexOf(a) >= 0, 'amount ' + a + ' shown'));
  });

  T('PRT14 Site photos are hard-wired to the job-portal site-photo docs (tagId t-photos)', () => {
    localStorage.setItem('ctp_docs_781', JSON.stringify([
      { id:'d1', name:'dig.jpg', type:'image/jpeg', dataUrl:'data:image/jpeg;base64,AAAA', tagId:'t-photos', uploadedAt:'Jun 20, 2026' },
      { id:'d2', name:'permit.pdf', type:'application/pdf', dataUrl:'data:application/pdf;base64,JVBE', tagId:'t-permits', uploadedAt:'Jun 19, 2026' }
    ]));
    open();
    const build = pane().querySelector('.cp-panel[data-panel=build]');
    const imgs = build.querySelectorAll('.cp-gallery .cp-ph img');
    ok(imgs.length === 1, 'only the site photo shows in the gallery, got ' + imgs.length);
    ok(imgs[0].getAttribute('src').indexOf('data:image/jpeg') === 0, 'renders the photo data URL');
    ok(!/permit\\.pdf/.test(build.innerHTML), 'non-photo docs are not in the site-photo gallery');
    localStorage.removeItem('ctp_docs_781');
  });

  T('PRT15 "Where we are" names the current stage and what is next', () => {
    open();
    const now = pane().querySelector('.cp-panel[data-panel=build] .cp-now').innerHTML;
    // project 781 is at "Plumbing & Steel"; with no scheduled dates it falls back to the phase plan
    ok(/Plumbing/.test(now), 'shows the current stage');
    ok(/Up next/.test(now) && /Gunite/.test(now), 'shows what is next');
  });

  T('PRT16 jobProposals resolves via linkedSavedEstimateId when present (robust budget proposal join)', () => {
    // a project whose num differs from the estimate num, linked by id (admin path with savedEstimates)
    try { if (typeof savedEstimates !== 'undefined' && Array.isArray(savedEstimates)) savedEstimates.push({ id: 99001, num: 'EST-ORIG', customer: 'X', lines: [] }); } catch(e){}
    window.Backend.setLocalRaw('ctp_projects', JSON.stringify([
      { id: 783, name: 'Linked Client', num: 'JOB-RENAMED', value: 50000, linkedSavedEstimateId: 99001, stage: 'Gunite', type: 'New Pool' }
    ]));
    window.jpReloadFromLocal();
    window.Backend.setLocalRaw('ctp_proposals', JSON.stringify([
      { id: 6001, estimateNum: 'EST-ORIG', proposalNum: 1, baseTotal: 50000, optionalTotal: 0, date: '2026-06-10T10:00:00.000Z' }
    ]));
    nav('clientportal'); CP.open('783');
    const docs = pane().querySelector('.cp-panel[data-panel=docs]').innerHTML;
    ok(/Proposal/.test(docs) && /full contract/.test(docs), 'finds the proposal via the linked estimate even though the job # was renamed');
  });

  T('PRT17 client Site photos group under stage headers in build order', () => {
    window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{ id: 781, name: 'Redesign Client', address: '5 Pool Ln', num: 'EST-781', value: 90000, collected: 0, stage: 'Plumbing & Steel', type: 'New Pool', date: '6/26/2026' }]));
    window.jpReloadFromLocal();
    localStorage.setItem('ctp_docs_781', JSON.stringify([
      { id:'x', name:'a.jpg', type:'image/jpeg', dataUrl:'data:image/jpeg;base64,AAAA', tagId:'t-photos', stage:'Excavation', uploadedAt:'Jun 1' },
      { id:'y', name:'b.jpg', type:'image/jpeg', dataUrl:'data:image/jpeg;base64,BBBB', tagId:'t-photos', stage:'Gunite / Shell', uploadedAt:'Jun 5' }
    ]));
    nav('clientportal'); CP.open('781');
    const build = pane().querySelector('.cp-panel[data-panel=build]');
    const heads = Array.prototype.map.call(build.querySelectorAll('.cp-ph-stage'), e => e.textContent);
    ok(heads.indexOf('Excavation') >= 0 && heads.indexOf('Gunite / Shell') >= 0, 'stage headers present');
    ok(heads.indexOf('Excavation') < heads.indexOf('Gunite / Shell'), 'grouped in build order');
    localStorage.removeItem('ctp_docs_781');
  });
`;

if (require.main === module) runSuite('CLIENT PORTAL OVERHAUL (tabs + curated finishes)', BODY).then(code => process.exit(code));
module.exports = { BODY };
