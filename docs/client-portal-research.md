# Client Portal Research — competitive scan & redesign brief

*Prepared June 26, 2026 · informs the "Portal redesign" roadmap item*

This is the **NOW** roadmap item: study the best competitor portals, take the best of
each, and turn it into a concrete plan for the CTP client portal. Below is what 17
competitor portals do, what homeowners actually complain about during pool builds, an
honest gap analysis against what CTP ships today, and a prioritized redesign.

---

## 1. The one finding that matters most

Across pool-builder forums (Trouble Free Pool, Houzz, builder subreddits), the #1
homeowner complaint about a pool build **is not price and not timeline — it's
communication and visibility.** The recurring story:

- Silence after the contract is signed; the builder only re-engages to request a draw
  or push a change order.
- "Where are we?" — no idea what phase the job is in or what's next.
- Crews show up unannounced, or don't show on a promised day; no advance notice.
- Draws requested with an unclear tie to completed work (money out ahead of work done).
- No visual proof of progress for owners who can't be on site.

**Disputes trace back to communication gaps, not the work itself.** A portal that nails
*phase tracker + photo proof per phase + "crew on site / on the way" alerts +
transparent draw schedule tied to completed phases + responsive messaging* answers
every top complaint — and it's a gap the pool design tools (Structure Studios) don't
touch and most service tools only solve for recurring maintenance, not construction.

The closest existing templates for what CTP is building are **ProDBX** and
**PoolBuilderHQ** (both pool-construction-specific), plus **Buildertrend** and
**JobTread** on the general-construction side.

---

## 2. What CTP's portal does today

The portal (`CP` module, `index.html:28458–28835`) already renders **eight** sections —
this is further along than most competitors' first versions:

| Section | Status today |
|---|---|
| **Hero / progress %** | ✅ job name, type, address, current phase label + progress bar |
| **"Your build" timeline** | ✅ 7-phase tracker (Design → Excavation → Plumbing/Steel → Gunite → Tile/Coping → Plaster/Decking → Complete), "you are here" highlight, target dates |
| **Progress updates** | ✅ contractor posts with optional photo, newest-first |
| **Selections & deadlines** | ✅ 7 default items, toggle pending↔selected, deadlines — *auto-built from the estimate* |
| **"Your investment"** | ✅ contract / paid / balance tiles + 5-line draw schedule tagged Paid/Due/Upcoming |
| **Inspections** | ✅ 4 default inspections with status cycling |
| **Documents** | ⚠️ read-only **lists** only — no view / download / e-sign / upload |
| **Messages** | ✅ two-way via `send-message` edge function, last 3 + compose |
| **Warranty** | ✅ conditional, phase-gated |

Plus a polished **"Client view" preview toggle** (the shared teal pill) so the team can
see exactly what the client sees.

**Architecture worth noting:** client data is primed from Supabase edge functions
(`get-my-*`) into localStorage on login; messages sync bidirectionally; other data is
contractor→client read-only. Edge functions for documents (`get-my-documents`) and
payment plan (`get-my-payment-plan`) are **already primed but not surfaced** — front-end
is the missing piece, not the backend.

### What's genuinely missing vs. best-in-class

1. **Documents are inert.** No view/download, no e-signature, **no client upload**
   (the upload edge function is live — this is the next roadmap item).
2. **No "approve & sign" on anything** — selections, change orders, or the contract.
3. **No online payment / deposit** in-context (stubbed "activates with the backend").
4. **No financing presentation** (monthly-payment framing).
5. **No "crew on site today / on the way" alert** — the single highest-leverage fix for
   the #1 complaint.
6. **No passwordless magic-link entry** — the most-loved access pattern in the market.
7. **Change orders** are listed but have no client review/approve flow.

---

## 3. The landscape — best ideas by category

### General construction (JobTread, Buildertrend, CoConstruct, Houzz Pro, Contractor Foreman)
The most directly comparable category — these run weeks-long projects, like a pool build.

- **JobTread** — magic email-link entry (no password until they pay); live-updating
  totals as the client picks options; **External Budget Views** (builder picks exactly
  which budget columns the client sees — open-book *or* fixed-price per job).
- **Buildertrend** — **AI weekly progress digest** auto-assembled from photos + activity
  (the single most-praised progress feature in the market); allowance-bounded selections
  showing **overage instantly**; action-item home ("what needs YOUR attention").
- **CoConstruct** — **deadline-driven selections**: "Requested By" dates with
  color-coding, reminder emails, and upcoming/overdue/undecided filters. Simplified
  **milestone checkmarks** (names, no dates) read better to homeowners than a dense Gantt.
- **Houzz Pro** — **per-item Approve/Decline + comments** on selections (credited with
  reducing mid-project changes); **"Hide From Client"** staging; branded portal with
  cover image / intro video.
- **Contractor Foreman** — **Action-Items-first dashboard**; native e-sign capturing
  **signature + IP + timestamp**; per-contact, per-project full-vs-read-only access.

> Recurring complaint across all five: **clunky, click-heavy, sluggish UX (especially
> mobile).** That's the clearest opening — ship this feature set with a genuinely fast,
> clean, mobile-first experience.

### Pool-industry-specific (ProDBX, PoolBuilderHQ, Structure Studios, Skimmer, Pool Brain, ProValet, Pooltrackr)

- **ProDBX** (closest build-focused template) — per-job login to follow construction
  progress; builder chooses what to expose **per item** (photos, drawings, invoices,
  **progress/draw payments and due dates per phase**); SMS/email notifications as work
  orders progress.
- **PoolBuilderHQ** — purpose-built to solve the build-communication gap: current build
  phase, phase-completion photos, two-way messaging, **milestone approvals**. Explicitly
  markets against "the #1 complaint isn't price or timeline — it's communication."
- **Structure Studios (Pool Studio / Vip3D)** — no client portal, but best-in-class **3D
  render + VR/360 walkthrough**. Hosting the *approved* design/walkthrough in the portal
  is a differentiator they don't offer.
- **Skimmer / ProValet / Pool Brain** (service-side) — **"on the way" alerts**,
  **service-photo galleries**, one-click pay-all-outstanding, autopay, point-of-repair
  **financing (Sunbit)**, water-chemistry/equipment records carried from build into
  service.

### Home-services / field-service (Jobber, Housecall Pro, ServiceTitan, Hearth, Joist, Service Fusion)

- **Jobber "Client Hub"** (the gold standard for access) — **passwordless magic link**;
  one-tap **"Approve & Pay Deposit"**; **team-member photos** on appointments;
  **Wisetack financing** auto-included on residential quotes $500–$25k (soft pull, no
  credit impact, builder paid in full on completion, ~3.9%).
- **Housecall Pro** — **live Uber-style GPS "on my way" map** with tech photo/bio/ETA
  (cuts no-shows ~15–20%); **Good/Better/Best** multi-option estimates with auto-decline;
  **nav badges** pulling the customer to the next action.
- **ServiceTitan** — real-time **"Track Now"** tech-route link; business-controlled
  **toggle-what-the-customer-sees**; financing baked into estimates.
- **Hearth** — **monthly-payment-first financing**: lead with "$X/month," instant
  soft-pull pre-qual, "won't affect your credit score," requested + max borrowing power
  side by side.
- **Joist** — frictionless e-sign: type your name → signature renders live on the
  document; open/view/sign tracking so the builder knows when to follow up.

---

## 4. Recommended redesign — prioritized for CTP

Mapped to CTP's actual architecture (single-file app, Supabase edge functions, the `CP`
module). Ordered by impact ÷ effort.

### Tier 1 — Quick wins (small front-end, backend mostly already there)

1. **Make Documents real (client uploads + view).** Wire the live upload edge function
   and `get-my-documents` priming into the Documents section: list with view/download,
   plus a client upload control (signed contracts done in person, site photos). *This is
   already the next roadmap item — start here.*
2. **Action-items home strip.** A "Needs your attention" band at the top of the portal
   (approve a selection, sign a doc, a draw is due) — the universal winning pattern from
   Buildertrend / Contractor Foreman / Housecall badges. Pure front-end over data the
   portal already has.
3. **"Crew on site / on the way" banner.** A simple contractor-set "Crew scheduled
   [date]" / "On site today" status on the hero card. Directly answers the #1 complaint;
   no GPS needed for v1 — just a field the team sets, surfaced to the client.
4. **Selection deadlines that nudge (CoConstruct pattern).** Color-code the existing
   selections by Requested-By date (upcoming / overdue / undecided). The selections
   engine already exists — this is presentation + a date field.

### Tier 2 — Approve & sign (the trust layer)

5. **Per-item Approve/Decline on selections** with a comment, writing status back
   (Houzz Pro pattern). Turns the existing toggle into a real client decision.
6. **E-sign on documents** — type-name-renders-live signature (Joist), captured to a
   signed PDF with **name + IP + timestamp** (Housecall Pro / Contractor Foreman). Start
   with change orders and the contract.
7. **Change-order review flow** — surface COs the client can read, approve, and e-sign,
   with the cost delta shown (today they're just listed).

### Tier 3 — Money (close the loop)

**Decided approach: third-party-hosted, rail-matched to draw size.** The client never
links a bank account to CTP — they enter details on the processor's own hosted page
(Stripe or similar), and the portal just gets a "paid" webhook. No PCI burden, no stored
cards. Standard Stripe has **no monthly fee** — pay-as-you-go per transaction only.

8. **Small payments** (deposit, few-$k draws): card with a **+3% surcharge passed to the
   client** (legal in CA, disclosed) or **ACH (0.8%, capped at $5)** — convenience wins,
   cost to CTP ≈ $0–5.
9. **Large draws ($50–100k):** card is off the table (fees + chargeback risk); the portal
   shows the draw with **wire instructions** and a "mark as paid" status (flat ~$15–30,
   irreversible, fast) — or hosted ACH with raised limits. Big money stays on **wire/check
   tracked in the portal**, not run through a card processor.
10. **Financing, monthly-payment-first** (Hearth framing, Wisetack/Sunbit-style
    mechanics) presented on the proposal/draw — "$X/month," soft-pull pre-qual, "won't
    affect your credit score." A *sales* lever (lender pays CTP in full), separate from
    payment acceptance. Confirm a partner before building the UI.

### Tier 4 — Polish & differentiate

11. **Phase-completion photo galleries** auto-pushed when a crew marks a stage done
    (Skimmer / PoolBuilderHQ) — makes invisible work visible; builds on the existing
    updates feed.
12. **Passwordless magic-link entry** ✅ *(owner: yes)* (Jobber / Housecall Pro) — the
    most-loved access pattern; emailed/SMS link, no password to forget. Bigger auth
    change; worth it but not first.
13. **Builder-controlled per-section visibility** ✅ *(owner: yes)* — the team toggles
    which sections each client sees per job (JobTread External Budget Views / ServiceTitan
    toggle). CTP already has the "Client view" preview; extend it to per-section flags.

*Dropped: hosting the 3D render / 360 walkthrough — depends on Structure Studios
export/hosting CTP doesn't control. Parked.*

### Scope boundary — CTP vs. QuickBooks (decided)
CTP is the **job / project-accounting** layer — estimates → jobs → invoices → job costing
(budget-vs-actual P&L, coded vendor bills, AP aging, 1099 totals), and it already exports
to QuickBooks. It is **not** a general ledger: no double-entry, no whole-business income
statement (overhead/operating expenses), no balance sheet (assets/liabilities/equity), no
bank reconciliation. QuickBooks (or Wave/Xero) stays the system of record for GL,
financial statements, and tax. The portal/payment work feeds that boundary, it doesn't
try to replace it.

### The overarching principle — win on polish
Every competitor's #1 complaint is **clunky, click-heavy, sluggish UX, especially on
mobile.** CTP's single-file, no-framework app can be genuinely fast. The differentiator
isn't a feature none of them have — it's **this feature set delivered clean, fast, and
mobile-first**, purpose-built for a pool build (phases, draws, crew alerts) rather than
retrofitted from an HVAC ticket.

---

## 5. Anti-patterns to avoid (straight from competitor complaints)

- **Don't ship a portal that can't take payment in context** (Service Fusion's gap —
  payment not enabled by default reads as broken).
- **Don't bury financing** or hide the monthly-payment framing.
- **Don't lock the builder out** of editing client details once the client activates
  (top Buildertrend complaint); don't force **one login per household** — let co-owners
  both have access.
- **Don't rely on a dense Gantt** for homeowners — milestone checkmarks + photo
  narrative read better than a raw % bar or critical-path chart.
- **Don't make it click-heavy.** The universal complaint. Every action the client needs
  should be one or two taps from the home strip.
- **No homeowner-side search** was a real CoConstruct gap — keep the portal scannable.

---

## 6. Open questions / confirm before building

- **Financing partner** — Wisetack and Sunbit are the names that recur for trades;
  confirm which (if any) CTP wants to integrate before building the financing UI.
- **"RhinoLINX"** could not be verified as real pool software — likely a name mix-up
  (possibly RB Retail & Service Solutions). Not a live competitor; flagging in case it
  was a specific reference.
- **Payment rails** — online draw payment needs a processor decision (Stripe is what
  CoConstruct/most use); the edge-function side isn't built yet.

---

*Sources: vendor help docs + marketing for feature claims; G2 / Capterra / Trustpilot /
BBB / Reddit / Trouble Free Pool for real-user complaints. Marketing claims are
best-case and often builder-gated; complaint sections are from real reviews.*
