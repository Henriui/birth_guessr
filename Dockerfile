# Stage 1: Build Frontend
FROM docker.io/library/node:25-slim AS frontend_builder
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm config set strict-ssl false
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build Backend
FROM docker.io/library/rust:bookworm AS backend_builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY diesel.toml ./
COPY migrations ./migrations
# Build release binary
RUN cargo build --release

# Stage 3: Runtime
FROM docker.io/library/debian:bookworm-slim
WORKDIR /app

# Install runtime dependencies for Postgres (libpq)
RUN apt-get update && apt-get install -y \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy backend binary
COPY --from=backend_builder /app/target/release/baby_birth_guessr .

# Copy frontend assets
COPY --from=frontend_builder /app/frontend/dist ./public

# Expose port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV RUST_LOG=info

# Run the application
CMD ["./baby_birth_guessr"]
