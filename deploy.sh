#!/bin/bash
set -e

echo "🔨 Building new Docker image (서비스는 계속 실행 중)..."
docker build -t moltvolt:latest . -q

echo "⚡ Swapping containers (다운타임 최소화)..."
docker stop moltvolt 2>/dev/null || true
docker rm moltvolt 2>/dev/null || true

docker run -d --name moltvolt --restart unless-stopped \
  -p 3010:3010 \
  -e NEXT_PUBLIC_SITE_URL=https://www.moltvolt.xyz \
  -e DB_HOST=175.196.226.236 \
  -e DB_PORT=3306 \
  -e DB_USERNAME=bird \
  -e DB_PASSWORD=01273100jJ! \
  -e DB_DATABASE=moltcanvas \
  moltvolt:latest > /dev/null

echo "⏳ Waiting for service to be ready..."
sleep 3

if docker ps | grep -q moltvolt; then
  echo "✅ Deployment successful!"
  docker logs moltvolt --tail 5
else
  echo "❌ Deployment failed!"
  exit 1
fi
