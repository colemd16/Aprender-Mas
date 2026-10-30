#!/usr/bin/env bash
# Runs ON YOUR MAC: deploys the current commit to the Google Cloud VM.
#   npm run deploy                         deploy what's committed and pushed
#   npm run deploy -- --simulate-failure   test the automatic rollback
# The server fetches that exact commit from GitHub (over its own SSH key) and runs
# scripts/server-deploy.sh from it.
set -euo pipefail

VM=serversam@client-sites-vm
GCLOUD=(--project softwarebydan --zone us-central1-a)
REPO=git@github.com:colemd16/Aprender-Mas.git

# gcloud isn't on the default PATH (and ~/.zshrc can't be sourced from bash).
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
command -v gcloud >/dev/null || { echo "gcloud not found at ~/google-cloud-sdk/bin"; exit 1; }

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes — commit them first, so what's deployed matches git."
  exit 1
fi
COMMIT=$(git rev-parse --short HEAD)
FULL=$(git rev-parse HEAD)
git fetch -q origin
if ! git merge-base --is-ancestor "$FULL" '@{u}' 2>/dev/null; then
  echo "$COMMIT isn't on GitHub yet — the server deploys from GitHub, so push first."
  exit 1
fi

# Fetch just that commit into a fresh folder, then run its own deploy script from a
# copy (the script swaps that folder into place as it goes).
echo "Deploying ${COMMIT}…"
gcloud compute ssh "$VM" "${GCLOUD[@]}" --command "
  set -e
  INCOMING=\$HOME/aprender-mas-incoming
  rm -rf \$INCOMING && git init -q \$INCOMING
  GIT_TERMINAL_PROMPT=0 git -C \$INCOMING fetch -q --depth 1 $REPO $FULL
  git -C \$INCOMING -c advice.detachedHead=false checkout -q FETCH_HEAD
  STAGE=\$(mktemp -d)
  cp \$INCOMING/scripts/server-deploy.sh \$STAGE/
  set +e
  bash \$STAGE/server-deploy.sh $COMMIT ${1:-}
  status=\$?
  rm -rf \$STAGE
  exit \$status
"
