# Browser tests — top-down target pricing

[![Browser tests](https://github.com/trademarkpoolsryan/ctp-estimator/actions/workflows/tests.yml/badge.svg)](https://github.com/trademarkpoolsryan/ctp-estimator/actions/workflows/tests.yml)

> CI runs this suite on every PR into `main` and on pushes to `main` (see `.github/workflows/tests.yml`).

Real-browser tests for the estimator's target-pricing feature. They load the actual
`index.html` in headless Chromium (Playwright) and drive the **real shipped code** —
no reimplementation, no mocks of the pricing engine.

Because the template catalog (`TEMPLATES_SEED`) and the estimator are baked into the
page and run fully client-side, these tests build a real estimate and exercise the
real UI **without any login, credentials, or network**. (Supabase/CDN failures in the
console are expected offline and are filtered out of the report.)

## Run

```bash
cd tests
npm install            # installs playwright-core (uses the pre-bundled Chromium)
node run-all.js        # all five suites
node solver.test.js    # or any single suite
```

The bundled Chromium under `$PLAYWRIGHT_BROWSERS_PATH` (default `/opt/pw-browsers`)
is auto-detected; no `playwright install` needed.

## Suites

| File | Covers |
|------|--------|
| `solver.test.js`      | Price→markup inversion, proportional spread, pin/unpin, conflicts, sticky re-solve, cost-drift, GP-honesty |
| `render.test.js`      | `renderEst()` draws editable `.tprice-in` cells; pinned/conflict CSS; `change`-event wiring |
| `adversarial.test.js` | Parent pins, parent re-flex, multi-free shape, re-entrancy guard, `roundPrice` identity, deep credits |
| `e2e-build.test.js`   | Builds a real Pool Base + Spa from seed templates; targets flow to `estTotals` exactly |
| `e2e-ui.test.js`      | Full UI: header/section/line targets driven through real DOM `change` events; pin & unpin |
| `rounding.test.js`    | Round mode: sheet = proposal = budget = sum-of-rounded-leaves; multiple-of-increment; DOM totals bar; GP honesty; the Round toggle button |
| `activate.test.js`    | Estimate → Active Project: contract value uses the estimate's rounded displayed grand (`estSnapDisp`), not a raw cost×markup sum |
| `budget.test.js`      | Job Portal budget (`budgetSheet`) shows the estimate's signed rounded pricing (apportioned per its stored Round state), not the raw total |
| `editmeta.test.js`    | Edit Job # / name from the estimate sheet (`editSavedEstimate`/`confirmEditEstimate`): canonical relabel, blank/duplicate Job # rejected |
| `history.test.js`     | Version history scoped to the open estimate (`_estSnapBelongsToCurrent`), not the global snapshot ring |
| `clientportal.test.js`| Client portal data-priming + send-message: `Backend.setLocalRaw`, `jpReloadFromLocal`, compose UI render, offline-error + success append |
| `safety.test.js`      | Pool Safety Act §115922: checklist → generated proposal section + live preview, conditional notes (fence/gate/alarm once/pool-alarm), min-2 warning, persistence |
| `navhistory.test.js`  | Browser Back/Forward stays in-app: each `nav()` records a history entry; `back()`/`forward()` step through in-app pages; null-state popstate is a no-op |

## Not covered offline (need real network)
Supabase auth & multi-device sync, cloud persistence across reload, and PDF export
(`genProposal`). Verify those manually on a deployed preview.
