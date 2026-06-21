const fs = require('fs');
const src = fs.readFileSync('/home/user/ctp-estimator/index.html', 'utf8');

// ── pull a real function body out of index.html by brace-matching ──
function grab(name){
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{');
  const m = src.match(re);
  if(!m) throw new Error('not found: '+name);
  let depth=0, j=src.indexOf('{', m.index);
  for(; j<src.length; j++){ if(src[j]==='{')depth++; else if(src[j]==='}'){depth--; if(depth===0){j++;break;}} }
  return src.slice(m.index, j);
}

let pass=0, fail=0;
function ok(label, cond){ (cond?pass++:fail++); console.log((cond?'PASS ':'FAIL ')+label); }

// ── environment stubs (no DOM needed for these fns) ──
let store = {};
global.window = { _safeSetItem:(k,v)=>{ store[k]=v; } };
global.confirm = ()=>true;
global.renderSavedEstimates = ()=>{};
let savedEstimates;

// ── inject REAL functions ──
eval(grab('_ctpGenEstId'));
eval(grab('_ctpIdLiteral'));
eval(grab('_ctpRepairEstimateIds'));
eval(grab('deleteSavedEstimate'));

// =====================================================================
// 1. REPAIR: ghosts get unique non-empty numeric ids; good ids preserved
// =====================================================================
savedEstimates = [
  { label:'Good One',         customer:'Real',  id:1000 },
  { label:'Lance Los',        customer:'Lance' },                // missing id
  { label:'Test McTesterson', customer:'Test',  id:'' },         // blank id
  { label:'Dup A',            customer:'DupA',  id:2000 },
  { label:'Dup B (twin)',     customer:'DupB',  id:2000 },       // duplicate id
];
const changed = _ctpRepairEstimateIds();
ok('repair reports a change on first run', changed === true);
const ids = savedEstimates.map(s=>s.id);
ok('good id 1000 preserved', ids[0] === 1000);
ok('first 2000 preserved',   ids[3] === 2000);
ok('no blank/empty ids',     !ids.some(x=> x==null || String(x).trim()===''));
ok('all ids unique',         new Set(ids.map(String)).size === ids.length);
ok('all ids numeric',        ids.every(x=> typeof x === 'number'));
ok('repair persisted to ctp_saved_ests', !!store['ctp_saved_ests']);

// =====================================================================
// 2. REPAIR IDEMPOTENT: second run must NOT churn ids
// =====================================================================
const snapshot = ids.map(String);
store = {};
const changed2 = _ctpRepairEstimateIds();
ok('repair reports NO change on second run', changed2 === false);
ok('repair did NOT churn ids (idempotent)', savedEstimates.map(s=>String(s.id)).join(',') === snapshot.join(','));
ok('idempotent run did NOT re-persist', !store['ctp_saved_ests']);

// =====================================================================
// 3. ONCLICK HTML-ATTRIBUTE SAFETY  (the actual regression)
//    Reconstruct the exact attribute the renderer emits, parse it like a
//    browser (value ends at the next unescaped double-quote), and run it.
// =====================================================================
function browserParseOnclick(elHtml){
  // find onclick=" ... "  -> attribute value is up to the NEXT double quote
  const at = elHtml.indexOf('onclick="') + 'onclick="'.length;
  const end = elHtml.indexOf('"', at);          // browser closes attr at first "
  let val = elHtml.slice(at, end);
  // HTML entity-decode what the browser would (we only emit &quot; / &amp;)
  val = val.replace(/&quot;/g,'"').replace(/&amp;/g,'&');
  return val;
}
// Build the delete button HTML exactly as renderSavedEstimates does, for each row
let allRunOk = true, allRemovedRight = true;
savedEstimates.slice().forEach((s)=>{
  const _i = savedEstimates.indexOf(s);
  const btn = `<button class="btn-icon" onclick="deleteSavedEstimate(${_ctpIdLiteral(s.id)}, ${_i})" title="Delete">x</button>`;
  // no RAW double quote inside the handler (would truncate the attribute)
  const handler = browserParseOnclick(btn);
  const fullCall = `deleteSavedEstimate(${_ctpIdLiteral(s.id)}, ${_i})`.replace(/&quot;/g,'"');
  if (handler !== fullCall) allRunOk = false;
});
ok('every Delete onclick parses to the FULL call (not truncated)', allRunOk);

// Now actually EXECUTE a parsed handler against the real deleteSavedEstimate
(function(){
  const work = savedEstimates.slice();
  savedEstimates = work;                       // delete operates on this
  const target = work.find(s=>s.label==='Dup B (twin)');
  const targetId = target.id;
  const idx = work.indexOf(target);
  const btn = `<button onclick="deleteSavedEstimate(${_ctpIdLiteral(target.id)}, ${idx})">x</button>`;
  const handler = browserParseOnclick(btn);
  const before = savedEstimates.length;
  eval(handler);                               // <-- simulate the click
  const removed = savedEstimates.find(s=>String(s.id)===String(targetId)) == null;
  ok('clicking parsed Delete handler removes exactly that record', removed && savedEstimates.length===before-1);
})();

// =====================================================================
// 4. DELETE BY ID removes the RIGHT record + persists
// =====================================================================
savedEstimates = [
  {label:'A', id:11}, {label:'B', id:22}, {label:'C', id:33},
];
store={};
deleteSavedEstimate('22', 1);                  // id passed as string (like the onclick)
ok('delete-by-id removed the right record (B)', !savedEstimates.some(s=>s.id===22));
ok('delete-by-id kept the others (A,C)', savedEstimates.map(s=>s.label).join('')==='AC');
ok('delete persisted', JSON.parse(store['ctp_saved_ests']).length===2);

// =====================================================================
// 5. INDEX FALLBACK when the id lookup fails
// =====================================================================
savedEstimates = [{label:'A', id:11},{label:'B', id:22},{label:'C', id:33}];
deleteSavedEstimate('does-not-exist', 2);      // bad id -> must fall back to idx 2 (C)
ok('index-fallback delete removes row at idx when id missing', savedEstimates.map(s=>s.label).join('')==='AB');

// =====================================================================
// 6. GHOSTS open + delete after repair
// =====================================================================
savedEstimates = [
  {label:'Lance Los', customer:'Lance'},               // missing id
  {label:'Test McTesterson', customer:'Test', id:''},  // blank id
];
_ctpRepairEstimateIds();
// open resolver (mirrors loadSavedEstimate's first lines — asserted against prod below)
function resolve(id, idx){
  let snap = (id!=null && id!=='') ? savedEstimates.find(s=>s && String(s.id)===String(id)) : null;
  if(!snap && idx!=null && idx>=0 && idx<savedEstimates.length) snap = savedEstimates[idx];
  return snap;
}
const lance = savedEstimates.find(s=>s.label==='Lance Los');
const test  = savedEstimates.find(s=>s.label==='Test McTesterson');
ok('Lance Los OPENS by id',       resolve(String(lance.id), 0) === lance);
ok('Test McTesterson OPENS by id', resolve(String(test.id), 1) === test);
deleteSavedEstimate(String(lance.id), 0);
deleteSavedEstimate(String(test.id), savedEstimates.indexOf(test));
ok('both ghosts DELETED', savedEstimates.length===0);

// =====================================================================
// 7. PROD SOURCE matches the resolver we tested (load + delete share it)
// =====================================================================
const loadSrc = grab('loadSavedEstimate');
ok('loadSavedEstimate resolves by String(id) with index fallback',
   /String\(s\.id\)\s*===\s*String\(id\)/.test(loadSrc) && /idx\s*<\s*savedEstimates\.length/.test(loadSrc));
ok('render uses _ctpIdLiteral (not JSON.stringify) for onclick ids',
   !/loadSavedEstimate\(\$\{JSON\.stringify/.test(src) && /loadSavedEstimate\(\$\{_ctpIdLiteral/.test(src));

// =====================================================================
// 8. SAVE UPSERT: saving the same job twice = ONE record (logic unchanged
//    by this fix; mirrors confirmSaveEstimate upsert at ~13107-13128)
// =====================================================================
ok('confirmSaveEstimate upserts by current id (no twin)',
   /existingIdx\s*=\s*savedEstimates\.findIndex\(s\s*=>\s*String\(s\.id\)\s*===\s*String\(_curId\)\)/.test(src)
   && /splice\(existingIdx,\s*1,\s*snap\)/.test(src));
(function(){
  // simulate the documented upsert rule
  let list=[]; let curId=null;
  function save(label, id){
    let i=-1;
    if(curId!=null) i=list.findIndex(s=>String(s.id)===String(curId));
    if(i===-1) i=list.findIndex(s=>s.label===label);
    const snap={label, id: i!==-1?list[i].id:(id||Date.now())};
    if(i!==-1) list.splice(i,1,snap); else list.unshift(snap);
    curId=snap.id; return list.length;
  }
  save('Job 7 — Smith', 5000);          // first save
  const n=save('Job 7 — Smith', 9999);  // edit + save again
  ok('same job saved twice -> ONE record', list.length===1 && n===1);
})();

// =====================================================================
// 9. ROOT-CAUSE PROOF: the OLD onclick (JSON.stringify -> double quotes)
//    truncated at the attribute's closing quote; the NEW one does not.
// =====================================================================
(function(){
  const id = 1718900000000, i = 0;
  const oldBtn = `<button onclick="deleteSavedEstimate(${JSON.stringify(String(id))}, ${i})">x</button>`;
  const newBtn = `<button onclick="deleteSavedEstimate(${_ctpIdLiteral(id)}, ${i})">x</button>`;
  ok('OLD code truncated the handler (the bug)',
     browserParseOnclick(oldBtn) === 'deleteSavedEstimate(');
  ok('NEW code yields a complete, valid call',
     browserParseOnclick(newBtn) === `deleteSavedEstimate('${id}', ${i})`);
})();

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
