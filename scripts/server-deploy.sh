#!/usr/bin/env bash
# Runs ON THE SERVER (client-sites-vm). Deploys the commit scripts/deploy.sh fetched from
# GitHub into ~/aprender-mas-incoming:
#   bash server-deploy.sh <commit> [--simulate-failure]
#
# Steps: check memory → stop the app → swap in the new code (keeping the old code and
# build for rollback) → npm ci if dependencies changed → migrations if they changed →
# build under a memory watchdog → start → health check. If the build or the health check
# fails, the previous code and build are put back and the app is started again.
# Database migrations are forward-only and are not rolled back.
set -euo pipefail

NEW_COMMIT="${1:?usage: server-deploy.sh <commit> [--simulate-failure]}"
SIMULATE_FAILURE="${2:-}"
APP=/home/serversam/aprender-mas
INCOMING=/home/serversam/aprender-mas-incoming
ROLLBACK=/home/serversam/aprender-mas-rollback
SERVICE=aprender-mas.service
PORT=3040
NEED_MB=1200   # don't start a build with less memory available than this
FLOOR_MB=400   # stop the build if available memory falls below this

log() { echo "[deploy] $*"; }
avail_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo; }
source ~/.nvm/nvm.sh >/dev/null

# Keep everything out of the code sync that isn't code.
SYNC_EXCLUDES=(--exclude .git --exclude node_modules --exclude .next --exclude .next-prev --exclude .env.local --exclude .deployed-commit)

if [ "$(avail_mb)" -lt "$NEED_MB" ]; then
  log "Only $(avail_mb) MB of memory available (need $NEED_MB). The other sites come first — try again when it's quieter."
  rm -rf "$INCOMING"
  exit 1
fi

[[ "$(git -C "$INCOMING" rev-parse HEAD 2>/dev/null)" == "$NEW_COMMIT"* ]] || { log "$INCOMING doesn't hold $NEW_COMMIT"; exit 1; }
OLD_COMMIT=$(cat "$APP/.deployed-commit" 2>/dev/null || echo unknown)
log "Deploying $NEW_COMMIT (live: $OLD_COMMIT)"

changed() { ! diff -rq "$APP/$1" "$INCOMING/$1" >/dev/null 2>&1; }
DEPS_CHANGED=false; changed package-lock.json && DEPS_CHANGED=true
MIGRATIONS_CHANGED=false; changed drizzle && MIGRATIONS_CHANGED=true

# Keep the current code and build so a failed deploy can be undone in seconds.
rm -rf "$ROLLBACK" && mkdir -p "$ROLLBACK"
rsync -a "${SYNC_EXCLUDES[@]}" "$APP/" "$ROLLBACK/"

rollback() {
  log "Rolling back to $OLD_COMMIT"
  sudo systemctl stop "$SERVICE" || true
  rsync -a --delete "${SYNC_EXCLUDES[@]}" "$ROLLBACK/" "$APP/"
  cd "$APP"
  if $DEPS_CHANGED; then nice -n 10 npm ci --no-audit --no-fund >/dev/null; fi
  rm -rf .next && mv .next-prev .next
  sudo systemctl start "$SERVICE"
  rm -rf "$INCOMING" "$ROLLBACK"
  log "Rolled back; $OLD_COMMIT is live again."
  exit 1
}

log "Stopping the app (about a minute of downtime while it builds)"
sudo systemctl stop "$SERVICE"
rsync -a --delete "${SYNC_EXCLUDES[@]}" "$INCOMING/" "$APP/"
cd "$APP"
rm -rf .next-prev && mv .next .next-prev

if $DEPS_CHANGED; then log "Dependencies changed: npm ci"; nice -n 10 npm ci --no-audit --no-fund >/dev/null || rollback; fi
if $MIGRATIONS_CHANGED; then log "Migrations changed: applying"; npm run --silent db:migrate >/dev/null || rollback; fi

log "Building (available memory: $(avail_mb) MB)"
BUILD_LOG=$(mktemp)
if [ "$SIMULATE_FAILURE" = "--simulate-failure" ]; then
  ( false ) &
else
  ( NODE_OPTIONS=--max-old-space-size=1280 NEXT_TELEMETRY_DISABLED=1 nice -n 10 ./node_modules/.bin/next build >"$BUILD_LOG" 2>&1 ) &
fi
BUILD_PID=$!
LOWEST=$(avail_mb)
while kill -0 "$BUILD_PID" 2>/dev/null; do
  NOW=$(avail_mb); [ "$NOW" -lt "$LOWEST" ] && LOWEST=$NOW
  if [ "$NOW" -lt "$FLOOR_MB" ]; then
    log "Available memory fell to $NOW MB — stopping the build to protect the other sites"
    pkill -TERM -f "$APP/node_modules" || true
    break
  fi
  sleep 1
done
if ! wait "$BUILD_PID"; then
  log "Build failed (lowest available memory: $LOWEST MB). Last lines:"
  tail -15 "$BUILD_LOG" || true
  rm -f "$BUILD_LOG"
  rollback
fi
rm -f "$BUILD_LOG"
log "Built (lowest available memory: $LOWEST MB)"

sudo systemctl start "$SERVICE"
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/login")" = "200" ]; then
    echo "$NEW_COMMIT" > .deployed-commit
    rm -rf .next-prev "$INCOMING" "$ROLLBACK"
    log "Live: $NEW_COMMIT"
    exit 0
  fi
  sleep 1
done
log "Health check failed: /login didn't answer 200 within 30s"
rollback
