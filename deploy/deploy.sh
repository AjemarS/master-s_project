#!/bin/sh
# Usage: sh deploy/deploy.sh <staging|prod> <git sha>
# Runs on the host from /opt/techhub-<env>, a checkout of this repo whose .env holds that environment's settings.
set -eu

env=$1
export TAG="$2" DEPLOY_ENV="$1" REGISTRY=ghcr.io/ajemars/master-s_project

compose="docker compose -p techhub-$env -f docker-compose.yaml -f docker-compose.prod.yaml"
$compose pull --quiet
$compose up -d --no-build --remove-orphans --wait --wait-timeout 300
docker image prune -f >/dev/null
