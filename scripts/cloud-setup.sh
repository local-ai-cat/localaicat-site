#!/usr/bin/env bash
# Claude Code cloud session setup (run by the SessionStart hook in .claude/settings.json).
# Installs the locked dependencies with pnpm (via corepack when pnpm is missing).
set -euo pipefail

cd "$(dirname "$0")/.."
command -v pnpm >/dev/null || corepack enable
pnpm install --frozen-lockfile --reporter=silent
