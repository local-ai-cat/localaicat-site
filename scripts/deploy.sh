#!/usr/bin/env bash
set -euo pipefail

# Deploy localaicat-site to Vercel
# Usage:
#   ./scripts/deploy.sh staging   — deploy to meow.localaicat.com
#   ./scripts/deploy.sh prod      — deploy to localaicat.com
#   ./scripts/deploy.sh           — deploy staging → confirm → prod

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_JSON="$PROJECT_DIR/.vercel/project.json"

SCOPE="atlascodes"
ORG_ID="team_7uzsygdbkRuhjIqBIAhNH3nl"
PROD_ID="prj_MLzBd1dmIJdwfyf1dfGmY1v4hIi9"
STAGING_ID="prj_kFvVJKcYuy33sFNDr2NTZs00nlyO"

C='\033[0;36m' G='\033[0;32m' Y='\033[1;33m' R='\033[0;31m' N='\033[0m'
info()  { echo -e "${C}▸${N} $1"; }
ok()    { echo -e "${G}✓${N} $1"; }
warn()  { echo -e "${Y}⚠${N} $1"; }
fail()  { echo -e "${R}✗${N} $1"; exit 1; }

deploy_to() {
  local label="$1" project_id="$2" project_name="$3" domain="$4"

  # Save current link
  local backup
  backup=$(cat "$PROJECT_JSON")

  # Swap to target
  printf '{"projectId":"%s","orgId":"%s","projectName":"%s"}' \
    "$project_id" "$ORG_ID" "$project_name" > "$PROJECT_JSON"

  info "Deploying to $label ($domain)..."
  local output
  if output=$(cd "$PROJECT_DIR" && npx vercel deploy --prod --scope "$SCOPE" --yes 2>&1); then
    ok "$label deployed: $(echo "$output" | tail -1)"
    info "Verify: https://$domain"
  else
    echo "$output"
    echo "$backup" > "$PROJECT_JSON"
    fail "$label deploy failed."
  fi

  # Restore prod as default link
  echo "$backup" > "$PROJECT_JSON"
}

deploy_staging() {
  deploy_to "staging" "$STAGING_ID" "localaicat-site-staging" "meow.localaicat.com"
}

deploy_prod() {
  deploy_to "production" "$PROD_ID" "localaicat-site" "localaicat.com"
}

case "${1:-pipeline}" in
  staging|stg|meow)
    deploy_staging
    ;;
  prod|production|live)
    deploy_prod
    ;;
  pipeline|"")
    echo -e "\n${C}━━━ Deploy Pipeline ━━━${N}\n"
    deploy_staging
    echo ""
    read -rp "$(echo -e "${Y}Push to production? [y/N]${N} ")" confirm
    [[ "$confirm" == [yY] ]] || { warn "Skipped production."; exit 0; }
    echo ""
    deploy_prod
    echo ""
    ok "Pipeline complete."
    ;;
  *)
    echo "Usage: $0 [staging|prod|pipeline]"
    exit 1
    ;;
esac
