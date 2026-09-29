# CLAUDE.md

Read README.md first.

## Cloud sessions

For Claude Code on the web (claude.ai/code). `scripts/cloud-setup.sh` runs automatically at session start (`pnpm install --frozen-lockfile`).

- Check: `pnpm check` (`tsc --noEmit && next build`), plus `pnpm test` for the node:test suites. Afterwards `git checkout tsconfig.tsbuildinfo`; it is tracked and tsc rewrites it.
- Work on the session's branch and open a PR. Merging to `main` deploys production on Vercel, and pushing `staging` deploys staging, so never push either branch.
- Never run `pnpm deploy:staging`, `pnpm deploy:prod`, `pnpm deploy`, `scripts/deploy.sh`, or the `vercel` CLI.
- No secrets are available or needed: the build works without `.env` values. Keep changes small and site copy in the site's voice.
