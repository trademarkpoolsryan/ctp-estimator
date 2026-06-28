// Client document uploads in the portal Documents card. The upload-document Edge Function is live
// (takes {name, dataUrl}, derives the client's project from auth, appends to the ctp_docs_<pid> blob);
// get-my-documents primes that blob into localStorage. These tests drive the REAL portal DOM:
// render the Documents card, list a seeded document with a View link, and exercise CP.uploadDoc end to
// end with a stubbed Supabase function (no network) — asserting the request shape, the local mirror,
// and that the new row renders.
const { runSuite } = require('./harness');

const BODY = `
  window.saveState = function(){}; window.scheduleAutoSave = function(){};

  window.Backend.setLocalRaw('ctp_projects', JSON.stringify([{
    id: 778, name: 'Doc Client', address: '2 Pool Ln', phone: '', email: '', num: 'EST-778',
    value: 60000, sqft: '500', stage: 'Gunite / Shell', type: 'New Pool', date: '6/26/2026'
  }]));
  window.jpReloadFromLocal();

  function pane(){ return document.getElementById('cp-pane'); }
  function openPortal(){ nav('clientportal'); CP.open('778'); }

  T('DOC0 the Documents card renders an upload control', () => {
    localStorage.removeItem('ctp_docs_778');
    openPortal();
    ok(/<h3>Documents<\\/h3>/.test(pane().innerHTML), 'Documents card present');
    ok(document.getElementById('cp-doc-file'), 'file input #cp-doc-file present');
    const btn = document.getElementById('cp-doc-btn');
    ok(btn && /Upload document/.test(btn.textContent), 'Upload document button present');
    ok(typeof CP.uploadDoc === 'function', 'CP.uploadDoc exposed');
  });

  T('DOC1 a seeded document lists with a View link (data URL)', () => {
    localStorage.setItem('ctp_docs_778', JSON.stringify([
      { id: 1, name: 'Signed Contract.pdf', dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK', uploadedAt: '2026-06-20T10:00:00.000Z', by: 'u1', source: 'client' }
    ]));
    openPortal();
    const h = pane().innerHTML;
    ok(/Signed Contract\\.pdf/.test(h), 'document name shown');
    ok(/uploaded by client/.test(h), 'source label shown');
    const link = pane().querySelector('a.cp-chip[href^="data:application/pdf"]');
    ok(link, 'View link points at the data URL');
    ok(link.getAttribute('download') === 'Signed Contract.pdf', 'download uses the file name');
  });

  T('DOC2 uploadDoc with no file selected is a no-op (no throw, button stays)', () => {
    localStorage.removeItem('ctp_docs_778');
    openPortal();
    CP.uploadDoc();
    ok(document.getElementById('cp-doc-btn').textContent === 'Upload document', 'button unchanged');
  });

  await TA('DOC3 uploadDoc posts {name,dataUrl} to upload-document and mirrors + renders the new doc', async () => {
    localStorage.removeItem('ctp_docs_778');
    openPortal();

    // Stub the Edge Function transport — capture the call, resolve success (no network).
    window.__lastInvoke = null;
    window.supa = { functions: { invoke: function(name, opts){ window.__lastInvoke = { name: name, opts: opts }; return Promise.resolve({ data: { ok: true } }); } } };
    window.CTP_SESSION = { id: 'client-user-1', role: 'client' };

    const fi = document.getElementById('cp-doc-file');
    const file = new File(['%PDF-1.4 hello'], 'My Contract.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer(); dt.items.add(file); fi.files = dt.files;

    CP.uploadDoc();
    // FileReader (prepDoc) + the resolved invoke promise both settle async.
    await new Promise(r => setTimeout(r, 120));

    ok(window.__lastInvoke, 'upload-document was invoked');
    ok(window.__lastInvoke.name === 'upload-document', 'correct function name');
    const body = window.__lastInvoke.opts && window.__lastInvoke.opts.body || {};
    ok(body.name === 'My Contract.pdf', 'name passed through');
    ok(typeof body.dataUrl === 'string' && body.dataUrl.indexOf('data:') === 0, 'dataUrl is a data URL');
    ok(!('project_id' in body), 'no project_id sent — server derives it from auth');

    const stored = JSON.parse(localStorage.getItem('ctp_docs_778') || '[]');
    ok(stored.length === 1, 'one record mirrored locally');
    ok(stored[0].name === 'My Contract.pdf' && stored[0].source === 'client', 'record shape matches the Edge Function');
    ok(stored[0].by === 'client-user-1', 'records the uploading user');

    ok(/My Contract\\.pdf/.test(pane().innerHTML), 'the new document renders in the card');
  });

  T('DOC4 uploadDoc rejects an oversized file before any network call', () => {
    localStorage.removeItem('ctp_docs_778');
    openPortal();
    window.__lastInvoke = null;
    window.supa = { functions: { invoke: function(){ window.__lastInvoke = true; return Promise.resolve({ data: {} }); } } };
    const fi = document.getElementById('cp-doc-file');
    // 9MB > 8MB cap. Use a sparse-ish blob via repeat to exceed the limit cheaply.
    const big = new File([new Uint8Array(9 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer(); dt.items.add(big); fi.files = dt.files;
    CP.uploadDoc();
    const err = document.getElementById('cp-doc-err');
    ok(err && /too large/.test(err.textContent), 'shows a too-large error');
    ok(!window.__lastInvoke, 'no upload attempted for an oversized file');
  });
`;

if (require.main === module) runSuite('CLIENT DOCUMENT UPLOADS (portal Documents card)', BODY).then(code => process.exit(code));
module.exports = { BODY };
