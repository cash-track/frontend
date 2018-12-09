#!/bin/bash

docker-compose -f ../cash-track/local.yml run --rm -e APP_ENV=local frontend "$@"