#!/usr/bin/env bash
# Runs ON YOUR MAC: deploys the current commit to the Google Cloud VM.
#   npm run deploy                         deploy what's committed (and pushed)
#   npm run deploy -- --simulate-failure   test the automatic rollback
# Uploads a snapshot of the commit (git archive) and runs scripts/server-deploy.sh there.
set -euo pipefail

VM=serversam@client-sites-vm
GCLOUD=(--project softwarebydan --zone us-central1-a)

# gcloud isn't on the default PATH (and ~/.zshrc can't be sourced from bash).
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
command -v gcloud >/dev/null || { echo "gcloud not found at ~/google-cloud-sdk/bin"; exit 1; }

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes — commit them first, so what's deployed matches git."
  exit 1
fi
COMMIT=$(git rev-parse --short HEAD)
if [ "$(git rev-parse HEAD)" != "$(git rev-parse '@{u}' 2>/dev/null || echo none)" ]; then
  echo "Note: $COMMIT isn't pushed to GitHub yet. Deploying it anyway; push when you can."
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
ARCHIVE=$WORK/aprender-mas.tar.gz
# Stamp the archive with its commit so the server knows what's live.
echo "$COMMIT" > "$WORK/.archive-commit"
git archive --format=tar HEAD > "${ARCHIVE%.gz}"
tar -rf "${ARCHIVE%.gz}" -C "$WORK" .archive-commit
gzip -f "${ARCHIVE%.gz}"

REMOTE=/tmp/aprender-mas-$COMMIT.tar.gz
echo "Uploading $COMMIT…"
gcloud compute scp "$ARCHIVE" "$VM:$REMOTE" "${GCLOUD[@]}" >/dev/null
gcloud compute ssh "$VM" "${GCLOUD[@]}" --command "
  STAGE=\$(mktemp -d)
  tar -xzf $REMOTE -C \$STAGE scripts/server-deploy.sh && bash \$STAGE/scripts/server-deploy.sh $REMOTE ${1:-}
  status=\$?
  rm -rf \$STAGE $REMOTE
  exit \$status
"
