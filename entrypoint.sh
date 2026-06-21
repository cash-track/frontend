#!/bin/sh
set -e

# Inject runtime configuration into the built SPA.
#
# The new Vite app reads config from `window.__APP_CONFIG__` (declared in index.html
# with `__VITE_*__` placeholders). Here we replace those placeholders with the
# container's env vars so a single built image serves every environment without a
# rebuild. Fail fast if a required var is missing — otherwise the SPA would resolve
# config to `undefined` and redirect-loop to /undefined.

: "${VITE_WEBSITE_URL:?VITE_WEBSITE_URL must be set}"
: "${VITE_GATEWAY_URL:?VITE_GATEWAY_URL must be set}"

INDEX_HTML=/usr/share/nginx/html/index.html

sed -i \
    -e "s|__VITE_WEBSITE_URL__|${VITE_WEBSITE_URL}|g" \
    -e "s|__VITE_GATEWAY_URL__|${VITE_GATEWAY_URL}|g" \
    "$INDEX_HTML"

exec "$@"
