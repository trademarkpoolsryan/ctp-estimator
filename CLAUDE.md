# CTP Estimator — working notes

Single-file app: `index.html` (~6.8MB, all HTML/CSS/JS inline). No build step, no
framework. `api/` holds one tiny serverless function. That's the whole app.

Data is **baked into the page**: `TEMPLATES_SEED` (the full pool-template catalog)
and the entire estimator engine run **fully client-side**. Supabase + the CDN
scripts (jspdf, html2canvas, supabase-js) only provide auth, cloud sync, and PDF
export — they are NOT needed to exercise the estimator or its pricing.

## Testing changes — browser-test for real, don't stop at logic

When asked to test/verify a change, the bar is a **real browser run** that builds a
real estimate and drives the real UI — not just unit-style logic checks on
extracted functions. The reusable suite is in `tests/` (see `tests/README.md`):

    cd tests && node run-all.js

It uses `playwright-core` + the bundled Chromium (auto-detected under
`/opt/pw-browsers`). Each script loads `file://../index.html` and then:

1. Builds a REAL estimate from `TEMPLATES_SEED` via `addTmplToEst(...)` +
   `applySmartQuantities(...)`, operating on the global `estLines`.
2. Calls `renderEst()` and exercises the actual DOM — dispatches real `change`
   events on the price inputs (`.tprice-in`, `data-lprice`, `data-gprice`, and the
   parent-header cell), not just direct function calls.
3. Asserts downstream via `estTotals(estLines)` (every total = cost × markup).

### Do NOT claim "blocked by login/network" without checking first
Auth is only a UI gate. The data is client-side, so full end-to-end needs **no
credentials**. Bypass the gate IN THE HARNESS:
- operate on the engine functions / global `estLines` directly, and
- `window._collapsedParents = new Set(); window._collapsedGroups = new Set();`
  before `renderEst()` to expand the parent→section→item tree so every row renders.

Only three things genuinely need network and may be skipped offline — and when you
skip them, say so **specifically**, never as a blanket excuse to skip E2E:
real Supabase **auth/multi-device sync**, **cloud persistence across reload**, and
**PDF export** (`genProposal`, which needs the jspdf/html2canvas CDNs).

## Pricing model (top-down target pricing)
Targets rewrite line **markup only** — real cost is never touched, so GP% stays
honest. A node you set is PINNED (`_priceLocked` / `_targetPrice`); a group target
flows into UNPINNED descendants, proportional to current price. Everything
downstream recomputes price from cost×markup. Key fns: `markupForPrice`,
`distributeProportional`, `setLineTarget` / `setSectionTarget` / `setParentTarget`,
`resolveAncestors`, `reapplyPriceLocks`. Finalize/rounding was removed —
`roundPrice` is now identity.
