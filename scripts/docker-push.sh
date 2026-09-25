#!/usr/bin/env bash
# Build the web client image and push it to the private registry.
#
# Config via env (override any):
#   REGISTRY   registry host/namespace            (default: registry.noddeboe.dk)
#   IMAGE      image name                         (default: stoat-web)
#   TAG        image tag                          (required, e.g. 0.14.1-forums.1)
#   PLATFORMS  buildx target platforms            (default: linux/amd64)
#   PUSH       "1" push, "0" build only           (default: 1)
#
# Usage:
#   TAG=0.14.1-forums.1 ./scripts/docker-push.sh
#   TAG=dev PUSH=0 ./scripts/docker-push.sh
set -euo pipefail

cd "$(dirname "$0")/.."

REGISTRY="${REGISTRY:-registry.noddeboe.dk}"
IMAGE="${IMAGE:-stoat-web}"
TAG="${TAG:?set TAG, e.g. TAG=0.14.1-forums.1}"
PLATFORMS="${PLATFORMS:-linux/amd64}"
PUSH="${PUSH:-1}"

REF="${REGISTRY%/}/${IMAGE}:${TAG}"

out=(--load)
[ "$PUSH" = "1" ] && out=(--push)

echo ">> building ${REF} (${PLATFORMS})"
docker buildx build \
  --platform "$PLATFORMS" \
  --tag "$REF" \
  "${out[@]}" \
  .

echo ">> done: ${REF}"
