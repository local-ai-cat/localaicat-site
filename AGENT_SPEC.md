# AGENT_SPEC — birthday/docs-shell (localaicat-site repo)

Worktree: /Users/timapple/Documents/Github/localaicat-site-bday-docs
Repo: localaicat-site (SEPARATE from the app repo). Base: main @ f314e89.
You are a delegated worker under an automated orchestrator that will verify your work.
If blocked, emit `NEEDS_INPUT: <question>` and stop.

## Goal
Build the custom `/docs` section shell for the public site — replacing the retiring Nextra
site — using the EXISTING SiteShell/ContentPage visual system (find it under `app/` and
`app/_components/`; match its look, nav, and theme exactly; do not invent a new design
system).

## Deliverables
1. `/docs` route group: landing page (overview of Local AI Cat's architecture: local-first,
   modular features, headless Local API — keep copy short and factual) + navigation for
   future pages: Feature Coverage, API Reference, Testing Evidence (stub pages with "coming
   soon" acceptable for the last two).
2. **Feature Coverage page, data-driven**: a build-time ingestion script
   (`scripts/generate-public-features.mjs` or TS equivalent) that reads the app repo's
   generated manifest at `../Local-AI-Chat/docs/features.json` when present, applies the
   REDACTION rules below, and writes `data/public-features.json` (COMMIT tonight's snapshot
   so the site builds standalone). The page renders from that JSON — never hand-copy the 36
   feature rows into TSX.
3. Schema validation on ingest (fail the script loudly on unknown shape, don't render junk).

## Public projection — REDACTION RULES (orchestrator decision, binding)
INCLUDE per feature: `name`, a one-line user-facing description (derive from `notes` ONLY if
clearly user-safe, else omit), platform availability, channel availability presented as
user-facing tiers (Alpha/Beta/Stable — map from `builds`), user-facing permissions.
EXCLUDE: any feature with `internal: true`; the `goldStandard` object (gap text is internal);
`caveats` unless clearly user-facing; lane values `locked`/`purgatory` (omit those features
entirely); owner/package/source paths; anything mentioning internal tooling, workbench,
bigsecret, or agent automation.
When unsure whether a field is public-safe: EXCLUDE it.

## Gates
- `pnpm install` (or npm per lockfile — repo uses pnpm-lock.yaml) then `pnpm build` green.
- `pnpm test` if a test script exists.
- The committed `data/public-features.json` contains zero `internal: true` features and zero
  excluded-field leakage (grep it for: goldStandard, gap, purgatory, locked, bigsecret,
  workbench — all must be absent).
- Only files under this worktree changed. Do NOT touch the app repo or the dirty
  localaicat-site main checkout.

## Rails
No deployment, no publishing, no DNS/Vercel actions — build-only. Atomic commits, author
`76924051+atlascodesai@users.noreply.github.com`. No pushes.
