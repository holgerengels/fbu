#!/bin/bash
set -e

IMAGE_NAME="ghcr.io/holgerengels/fbu"
TAG="latest"

cd "$(dirname "$0")/.."

echo "Building docker image..."
docker build -f deploy/Dockerfile -t "$IMAGE_NAME:$TAG" .

echo "Pushing to registry..."
docker push "$IMAGE_NAME:$TAG"

echo "Done."
