// CTP Security Agent — adversarial test of the Phase 4 Edge Functions.
//
// Verifies the invariant: a caller can only ever read or act on their OWN records —
// never another client's, never another company's, only with the right role, and
// never by passing someone else's ids in the request.
//
// Run:  node ctp_security_agent.mjs
// Needs: Node 18+ (built-in fetch). Set the public anon key first:
//        export SUPABASE_ANON_KEY="paste_public_anon_key"   (or edit ANON_KEY below)

const SUPABASE_URL = 'https://nfsnbkouvgxpzcmfnyzt.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'PASTE_PUBLIC_ANON_KEY_HERE';
const FN = `${SUPABASE_URL}/functions/v1`;

// Test accounts seeded via the real invite-user path.
const CLIENTS = {
  X1: { email: 'clientx1@ctptest.dev', password: 'CtpTest!234', company: 'X', pid: '9000000000001' },
  X2: { email: 'clientx2@ctptest.dev', password: 'CtpTest!234', company: 'X', pid: '9000000000002' },
  Y1: { email: 'clienty1@ctptest.dev', password: 'CtpTest!234', company: 'Y', pid: '9000000000003' },
};

const READS   = ['get-my-project','get-my-proposals','get-my-invoices','get-my-documents','get-my-payment-plan','get-my-messages'];
const ACTIONS = ['sign-proposal','pay-invoice','upload-document','send-message'];

let pass = 0, fail = 0; const fails = [];
function check(name, ok, detail = '') {
  if (ok) pass++; else { fail++; fails.push(name + (detail ? '  — ' + detail : '')); }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  — ' + detail : ''}`);
}

async function login(c) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: c.email, password: c.password }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`login ${c.email}: ${r.status} ${JSON.stringify(j).slice(0,200)}`);
  return j.access_token;
}

async function callFn(name, jwt, body) {
  const headers = { apikey: ANON_KEY, 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  const r = await fetch(`${FN}/${name}`, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  return { status: r.status, text: await r.text() };
}

const firstHit = (text, needles) => needles.find(n => text.includes(n)) || null;

function report() {
  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  if (fail) { console.log('\nFAILURES (each is a potential leak or missing guard):'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
  else console.log('All isolation checks passed.');
}

const main = async () => {
  console.log('=== CTP Security Agent ===\n');

  const jwt = {};
  for (const k of Object.keys(CLIENTS)) {
    try { jwt[k] = await login(CLIENTS[k]); check(`auth ${k}`, true); }
    catch (e) { check(`auth ${k}`, false, e.message); }
  }
  if (Object.keys(jwt).length < 3) { console.log('\nCannot continue without all three logins.'); return report(); }

  // 1) Each read returns ONLY the caller's own data (no other client's pid appears).
  for (const caller of ['X1','X2','Y1']) {
    const foreign = Object.keys(CLIENTS).filter(k => k !== caller).map(k => CLIENTS[k].pid);
    for (const fn of READS) {
      const { status, text } = await callFn(fn, jwt[caller], {});
      check(`${caller} ${fn} succeeds`, status >= 200 && status < 300, `status ${status}`);
      const leak = firstHit(text, foreign);
      check(`${caller} ${fn} no foreign data`, !leak, leak && `leaked id ${leak}`);
    }
  }

  // 2) Spoofing: supplying another client's ids in the body must change nothing.
  for (const [caller, victim] of [['X1','X2'], ['X1','Y1'], ['Y1','X1']]) {
    const v = CLIENTS[victim];
    for (const fn of READS) {
      const { text } = await callFn(fn, jwt[caller], { project_id: v.pid, pid: v.pid, client_ref: v.pid });
      check(`${caller} ${fn} ignores spoofed ${victim} id`, !text.includes(v.pid), `accepted ${v.pid}`);
    }
  }

  // 3) Discover X2's record ids via X2's own reads, then confirm X1 cannot act on them.
  const x2 = await callFn('get-my-proposals', jwt['X2'], {});
  const ids = [...x2.text.matchAll(/"(?:id|proposalId|estNum|num)"\s*:\s*"?([\w-]+)"?/g)].map(m => m[1]);
  if (ids.length) {
    for (const fn of ACTIONS) {
      const { status, text } = await callFn(fn, jwt['X1'], { id: ids[0], proposalId: ids[0], invoiceId: ids[0], num: ids[0] });
      const denied = status >= 400 || /denied|forbidden|not your|unauthor/i.test(text);
      check(`X1 ${fn} on X2 record is denied`, denied, `status ${status}`);
    }
  } else {
    check('discover X2 record ids', false, 'no ids found — check fixtures / response shape, then re-run actions');
  }

  // 4) Role guards: a client cannot reach employee/admin functions.
  {
    const c = await callFn('clock-punch', jwt['X1'], { emp_id: 'anything' });
    check('client blocked from clock-punch', c.status >= 400 || /denied|forbidden|employee|unauthor/i.test(c.text), `status ${c.status}`);
    const i = await callFn('invite-user', jwt['X1'], { email: 'evil@x.dev', role: 'admin' });
    check('client blocked from invite-user', i.status >= 400 || /denied|forbidden|admin|unauthor/i.test(i.text), `status ${i.status}`);
  }

  // 5) Unauthenticated calls are rejected outright.
  for (const fn of READS) {
    const { status } = await callFn(fn, null, {});
    check(`${fn} rejects no-auth`, status === 401 || status === 403, `status ${status}`);
  }

  report();
};

main().catch(e => { console.error('agent error:', e); process.exitCode = 1; });
