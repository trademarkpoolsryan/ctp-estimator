# CTP Estimator — Roadmap

_Refreshed June 26, 2026 · Now → Next → Later, easiest-&-safest first_

California Trademark Pools · ctp-estimator.vercel.app · single-file build, deploys on merge to `main`.

---

## ✅ Shipped — recent (since the June 23 roadmap)

- **Top-down target pricing** — type a total at the line, section, or header level; markup flexes to hit it, cost untouched (GP stays honest).
- **Round mode** — field-friendly clean numbers, auto-on in Field Mode; top-down apportionment so subtotals/grand are clean, line prices stay real, and everything adds up.
- **Money-math reconciled & locked** — grand is the closest clean number to true, discounts/credits preserved, guarded by a 100+ check browser suite + CI.
- **Contract value fixes** — activating a job and the Project Budget both use the signed *rounded* total (not the raw cost×markup).
- **Per-estimate version history** — the History modal shows only the open estimate's versions.
- **In-app Back button** — Back steps through the app's pages; the last Back lands on the Home screen before the app ever exits.
- **Client portal** — clients land straight on their job (data-priming on login) and can message the team (send-message).
- **Pool Safety Act §115922** — drowning-prevention checklist on the estimate; prints on the proposal with the right conditional notes.
- **Home screen** — Settings + Support tiles added to the launcher.
- **CI** — the full browser test suite runs on every PR into `main`.

## ✅ Shipped — earlier

Money math reconciled · Permit-selection fix · Proposal content & saved edits · Saved-estimate view parity · Sign-in speed + Remember Me · New-estimate intake gate · Proposals auto-saved to Master Docs · New look (login, splash, logo) · PDF phantom line fixed · Drag-drop fix.

---

## NOW — on the bench

- **View as client** — see the portal exactly how the client sees it.
- **Client-portal research** — study the best competitor portals; take the best of each (informs the portal redesign).

## NEXT — queued

- **Client document uploads** — upload signed contracts (done in person) + photos. The `upload-document` Edge Function is live; this is the front-end.
- **Inspections → client schedule** — let clients view their job's calendar instead of a separate tab.
- **Material Selections** — pick options per job: tile, bond beam, spa, concrete, plaster, patio cover.
- **Employee document library** — handbook, CA workers' rights, master checklists in one place.
- **Crew Command checklists** — send the right checklist with each assignment (a dig gets the excavation list).

## LATER

- **Pool Studio import** — auto-fill measurements from a Smart Data screenshot _(briefed; parked)_.
- **Lead auto-responder** — Webflow lead → instant reply + 24-hour follow-up _(briefed)_.
- **Payment schedule** — $0 down, then 15% / 25% / 20%… by phase.
- **Invoicing → active jobs** — link invoices to the live jobs.
- **Contracts → one PDF** — merge every doc into a single DocuSign-ready file.
- **Combine My Jobs + Snapshot** — one Employee Hub view instead of two.
- **Merge Progress + Messages** — one update feed in the client portal.
- **"Your Build" → Progress** — track real build phases, excavation to final inspection.
- **Portal redesign** — the full one-stop, no-endless-scroll look.
- **Bulk select everywhere** — Phase 2 (estimate sheet) + Phase 3 (Master Documents). _(Phase 1, Saved Jobs, shipped.)_
- **Meeting notes** — paste a transcript → summary (CA consent).
