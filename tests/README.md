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
| `navhistory.test.js`  | Browser Back/Forward stays in-app and the last Back lands on Home: each `nav()` records a history entry atop a seeded Home entry; `back()`→pages→Home, Forward re-enters, logo `showWelcome()` records Home, null-state popstate is a no-op |
| `homescreen.test.js`  | Home launcher includes Settings + Support tiles (`buildWelcomeTiles`), with descriptions, and they navigate |
| `viewasclient.test.js`| "Client view" preview: one shared `.set-switch` pill toggle (Job Portal + Client Portal); ON hides the admin chrome and lands on the job, OFF restores admin |
| `clientdocs.test.js`  | Client document uploads: portal Documents card renders the upload control + lists seeded docs with a View link; `CP.uploadDoc` posts `{name,dataUrl}` to the live `upload-document` function (project derived from auth), mirrors locally, renders the new row; oversized-file guard |
| `attention.test.js`   | "Needs your attention" action strip: renders first; pending selections + due draws surface as actionable rows that jump (`CP.focusSec`) to the selections/investment cards; calm all-caught-up state when nothing is pending |
| `addrfill.test.js`    | Address autofill on the customer job-info form: `#e-addr` typing → suggestion dropdown → fills street/city/zip (`ctpAddrApply`); free Photon default with a Google Places key upgrade path (Settings `biz-placesKey` → localStorage); short-query guard |
| `jobphotos.test.js`   | Job Portal "Site Photos" tab: upload writes `t-photos` docs to `ctp_docs_<pid>`, each tagged with a build stage; gallery grouped by stage, non-photo docs excluded; re-tag (`jpPhotoSetStage`) and delete (`jpPhotoDelete`) persist |
| `portal.test.js`      | Portal overhaul + wiring: tabbed no-scroll layout (Build/Schedule/Selections/Payments/Docs/Messages, one panel visible, `CP.tab`), horizontal phase stepper, curated finishes (3 base + team-added optional/custom, add/remove, admin-only) with legacy-91-row migration, Build trimmed of Inspections/Warranty (now in Schedule), Schedule wired from the job-portal build schedule (`jpScheduleFor`), Money→Payments ("Payment schedule"), the saved proposal (full contract price) showing in Docs with a View action into `viewSavedProposal`, and **editable selections** — both team and client can type the chosen material (`CP.setChosen`) and advance a shared yellow→green state ramp with audience-specific labels (team Choose→Chosen→Selected, client Select→Selected→Confirmed via `CP.toggleSel`) |
| `lockest.test.js`     | Saved estimate ↔ active job lock: once linked to an active job a saved estimate is read-only (`_estLockedById`, `_setEstViewOnly`) — list row shows View + lock instead of Load + pencil, the Projects editor hides rename/Make-Active and turns Save into "Save as new Job #", and Job#/name edits are blocked (`editSavedEstimate`). "Save as new Job #" (`saveAsNewEstimateFrom`) clones to a new unique Job # leaving the original untouched, and rejects a duplicate # |

## Not covered offline (need real network)
Supabase auth & multi-device sync, cloud persistence across reload, and PDF export
(`genProposal`). Verify those manually on a deployed preview.
