# Site docs v2 — the Modules experience (Phil's spec, 2026-07-16)

The old docs pages are DELETED (this commit). Rebuild from scratch. Phil's words, structured:

## Page 1 — the Modules overview (the only docs landing page)
ONE clear visual view of ALL modules/features:
- card/grid per module: name + BRIEF explanation (1-2 lines, from `description`)
- state at a glance, effortless to read: which channel it ships in (main app vs alpha/beta),
  which platforms (macOS / iOS), and Indoor (App Store) vs Outdoor (direct download)
- status badges incl. locked / purgatory (these ARE shown — Phil explicitly wants the honest status)
- every card CLICKS THROUGH to a dedicated per-module page

## Page 2 — per-module page (/docs/modules/<id> or similar)
Sections, in order:
1. **Status** — lane/status (live/beta/wip/locked/purgatory), channels, platforms, Indoor/Outdoor, Pro tier if any
2. **Description** — what it is and how it works
3. **Media** — video/gif slot (like the macOS trackpad-settings GIFs). v1: graceful placeholder wired to
   `/public/feature-media/<id>.(mp4|gif)` with poster fallback; FUTURE: these videos are produced by our
   automated UI tests on both platforms, reused in marketing AND potentially in-app on the features page.
4. **Backlog / improvements** — planned work for this module (curated data file per module for v1)
5. **History** — traced changes: when we changed this module and why. This feeds the STABILITY-LOCK idea:
   modules that reach stability get declared frozen ("this module should not change") and can be
   code-locked to prevent regressions. History is the evidence trail. v1: curated entries in a data file;
   future: generated from git/release notes.

## Data
- Source: `data/public-features.json` (generated + REDACTED from the app repo's docs/features.json by
  scripts/generate-public-features.mjs — never hand-edit).
- Generator changes needed: STOP filtering out locked/purgatory (keep filtering `internal`), and project
  `lane` + `status` into the public output. Keep everything else redaction-safe (no new keys projected
  beyond what the page needs).
- Site-side curated overlay: `data/module-pages/<id>.json` (optional per module) for backlog[] and
  history[] entries + media caption, merged at render.

## Design
- Match the EXISTING site's look (globals.css conventions, app/_components patterns) — this is the public
  localaicat site, not an internal dashboard. Clean, glanceable, no dashboard-chrome noise.
- The overview must read at a glance: think a well-set grid with small consistent badge chips, not a table.

## Non-goals for v1
- No videos yet (placeholder slots only). No auto-history from git. No auth/edit UI.
