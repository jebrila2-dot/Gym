# Gym — Lift & Run

A personal gym tracker, workout organiser and **marathon trainer** in a single,
fast, offline-capable web app. No accounts, no servers, no build step — your
data lives in your browser and can be exported as a JSON backup any time.

Built around two goals: getting stronger in the gym, and getting to the start
line of the **London Marathon** ready to run it well.

## What's inside

| Tab | What it does |
|---|---|
| **Today** | Race-day countdown, today's scheduled lift, today's planned run, week-at-a-glance, body-weight quick add, marathon-phase lifting advice |
| **Lift** | Workout logging: previous performance pre-filled, adaptive ± steppers (big lifts jump 5 kg, isolation 1 kg — tap ⇄ to change), double-progression "ready to progress" chips, auto warm-up ramps, exercise swapping by movement pattern, warm-up-set flagging, per-exercise rest timers, plate calculator, PR detection, finish summary sheet, full editable history |
| **Run** | Marathon HQ: a generated week-by-week training plan (base → build → peak → taper), run logging with pace, weekly distance vs plan, pace trend, Riegel race predictor (prefers real races), training-pace zones, behind-schedule rebuild nudges |
| **Plan** | The organiser: weekly schedule with a **muscle-balance panel** (weekly sets per muscle vs the 10–20 band), a recommended full-body week (every muscle 2–3×/week, hard days paired with quality runs), 10 starter routines with evidence-based rest times, a 125+ exercise library with **How-to / Avoid guides and swap suggestions** for every exercise, and a **training guide** (progressive overload, effort/RIR, rep ranges, rest, warm-ups, volume & frequency, lifting through a marathon block, recovery) |
| **Progress** | Estimated-1RM trends per exercise, weekly tonnage, a tappable training-calendar heatmap, PR board, body-weight tracking |

Charts are hand-rolled SVG with hover tooltips and a "Data" table view on
every chart. Light and dark themes (auto-follows your device). Metric or
imperial units. Installable as a phone app (PWA) and fully offline once loaded.

Quality-of-life details worth knowing:

- Sets you typed but forgot to tick are never dropped silently — finishing asks
  whether to count them. Warm-up sets (tap the set number) are excluded from
  PRs, tonnage and pre-fills.
- Plan days match runs **within the week**, so a long run moved from Sunday to
  Saturday still ticks off.
- Runs and past workouts are editable; deletes offer an Undo.
- Goal times are read sensibly — "4:00" means 4 hours, not 4 minutes, and the
  Settings field shows how it was understood.
- Restoring a backup shows what's inside and asks before replacing anything.
- When a new version is deployed, the app shows an "App updated — Refresh" toast.

## Using it

**Easiest: GitHub Pages.**
1. In this repository: *Settings → Pages → Deploy from a branch*, pick your
   branch and `/ (root)`, save.
2. Open the published URL on your phone.
3. iPhone: Share → *Add to Home Screen*. Android: the browser offers *Install app*.

**Or locally:** just open `index.html` in a browser, or run any static server
(e.g. `npx http-server`).

## First-run checklist (2 minutes)

1. ⚙️ **Settings** → confirm units, race date and your **goal time** (drives
   your training paces).
2. **Run tab** → *Build my plan* → enter how many days a week you can run,
   your current weekly distance and longest recent run.
3. **Plan tab** → the recommended week is pre-set (Full Body A Mon ·
   Full Body B Wed beside your quality run · Full Body C Fri, leg-free before
   the long run). Check the muscle-balance panel as you customise.
4. Start logging. The app pre-fills last time's numbers, tells you when
   you're ready to add weight, and builds your warm-up ramps.

## How the marathon plan works

The generator follows mainstream marathon-training structure:

- **Base** → **Build** (tempo + interval quality sessions) → **Peak** (30–32 km
  long runs, marathon-pace segments) → **3-week taper** → race week.
- Weekly volume grows ≈10 % at a time with a cutback every 4th week.
- Long runs progress ~1.5–2.5 km per week from your current longest.
- Training paces (easy / long / marathon / threshold / interval) are derived
  from your goal time; the race predictor uses the Riegel formula on your best
  recent effort of 8 km or more.
- Estimated 1RM uses the Epley formula, capped at 12 reps to stay honest.

The default race date is **Sunday 25 April 2027** (the expected next London
Marathon — organisers confirm dates each year, so double-check in Settings
once announced, then *Rebuild plan*).

> **Note:** the plan is a well-structured template, not a coach. Ease off when
> your body asks, and see a professional about pain or health concerns.

## Your data

- Stored in `localStorage` in your browser — private to your device.
- ⚙️ **Settings → Export backup** downloads everything as JSON;
  **Import backup** restores it (e.g. moving to a new phone).
- Clearing the browser's site data deletes it, so export occasionally.

## Tech notes

- Plain HTML/CSS/JS — no frameworks, no dependencies, no build step.
- `sw.js` caches the app shell for offline use (bump `CACHE` when releasing
  changes so clients update).
- Charts, palette and interaction patterns follow a validated
  colourblind-safe palette in light and dark modes.
