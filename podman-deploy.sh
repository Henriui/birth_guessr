#!/bin/bash
set -e

# Check if pod exists and remove it if it does (cleanup)
if podman pod exists birth_guessr_pod; then
    echo "Cleaning up existing pod..."
    podman pod rm -f birth_guessr_pod
fi

# Create a pod with port mapping
# This exposes port 3000 from the pod to the host
echo "Creating Pod..."
podman pod create --name birth_guessr_pod -p 3000:3000

# Run Database in the pod
# Note: We use a named volume for persistence
echo "Starting Database..."
podman run -d --name birth_guessr_db --pod birth_guessr_pod \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=birth_guessr \
    -v birth_guessr_data:/var/lib/postgresql/data \
    --tls-verify=false \
    docker.io/library/postgres:15-alpine

# Wait for DB to likely be up (basic check)
echo "Waiting for DB to initialize..."
sleep 5

# Build the app
echo "Building Application..."
podman build --tls-verify=false -t birth_guessr_app .

# Run App in the pod
# IMPORTANT: DATABASE_URL uses 'localhost' because containers in a pod share the network namespace
echo "Starting Application..."
podman run -d --name birth_guessr_app --pod birth_guessr_pod \
    -e DATABASE_URL=postgres://postgres:postgres@localhost:5432/birth_guessr \
    -e RUST_LOG=info \
    birth_guessr_app

echo "Deployment complete!"
echo "App is available at http://localhost:3000"
