#!/bin/sh
set -e

# Inject runtime configuration into the built SPA.
#
# The new Vite app reads config from `window.__APP_CONFIG__` (declared in index.html
# with `__VITE_*__` placeholders). Here we replace those placeholders with the
# container's env vars so a single built image serves every environment without a
# rebuild. VITE_WEBSITE_URL and VITE_GATEWAY_URL fail fast if missing — otherwise the
# SPA would resolve config to `undefined` and redirect-loop to /undefined. The release
# metadata vars (VITE_APP_VERSION, VITE_APP_COMMIT) are display-only, so they default
# to an empty string instead — local/ad-hoc containers won't have them set, and the
# footer degrades gracefully when they're absent.

: "${VITE_WEBSITE_URL:?VITE_WEBSITE_URL must be set}"
: "${VITE_GATEWAY_URL:?VITE_GATEWAY_URL must be set}"
: "${VITE_APP_VERSION:=}"
: "${VITE_APP_COMMIT:=}"

# VITE_APP_VERSION/VITE_APP_COMMIT come from a git tag or branch name (a snapshot build
# passes the branch name as the tag, e.g. via workflow_dispatch), unlike the operator-set
# static URLs above — a branch name may legally contain sed metacharacters (`&`, `|`, `\`).
# Escape them before they reach the replacement text below, otherwise `&` re-inserts the
# unreplaced placeholder, `|` collides with the `s|...|...|` delimiter (sed exits non-zero,
# which aborts this script under `set -e` before nginx starts), and `\` can be read as an
# escape sequence.
ESCAPED_VITE_APP_VERSION=$(printf '%s' "$VITE_APP_VERSION" | sed -e 's/[&|\\]/\\&/g')
ESCAPED_VITE_APP_COMMIT=$(printf '%s' "$VITE_APP_COMMIT" | sed -e 's/[&|\\]/\\&/g')

INDEX_HTML=/usr/share/nginx/html/index.html

sed -i \
    -e "s|__VITE_WEBSITE_URL__|${VITE_WEBSITE_URL}|g" \
    -e "s|__VITE_GATEWAY_URL__|${VITE_GATEWAY_URL}|g" \
    -e "s|__VITE_APP_VERSION__|${ESCAPED_VITE_APP_VERSION}|g" \
    -e "s|__VITE_APP_COMMIT__|${ESCAPED_VITE_APP_COMMIT}|g" \
    "$INDEX_HTML"

exec "$@"
