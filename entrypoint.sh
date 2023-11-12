#!/bin/sh

JSON_STRING='window.configs = { \
  "VUE_APP_BASE_URL":"'"${VUE_APP_BASE_URL}"'", \
  "VUE_APP_API_URL":"'"${VUE_APP_API_URL}"'", \
  "VUE_APP_GATEWAY_URL":"'"${VUE_APP_GATEWAY_URL}"'", \
  "VUE_APP_WEBSITE_URL":"'"${VUE_APP_WEBSITE_URL}"'" \
}'

sed -i "s@// CONFIGURATIONS_PLACEHOLDER@${JSON_STRING}@" /usr/share/nginx/html/index.html

exec "$@"
