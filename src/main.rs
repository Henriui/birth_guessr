// Avoid musl's default allocator due to lackluster performance
// https://nickb.dev/blog/default-musl-allocator-considered-harmful-to-performance
#[cfg(target_env = "musl")]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;
use axum::{
    Router,
    routing::{get, post},
    serve,
};
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use std::env;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tower_http::services::{ServeDir, ServeFile};
use tracing_subscriber::EnvFilter;

use tracing;

mod handlers;
mod models;
mod schema;
mod types;
mod utils;

use handlers::{
    create_event, get_event_by_key, get_event_guesses, health, sse_subscribe, submit_guess,
};
use types::AppState;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

#[tokio::main]
async fn main() {
    // load env variables from .env file
    dotenvy::dotenv().ok();

    // init logging
    tracing_subscriber::fmt()
    .with_env_filter(EnvFilter::from_default_env())
    .init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool = r2d2::Pool::builder()
    .build(manager)
    .expect("Failed to create pool.");

    {
        let mut conn = pool.get().expect("Failed to get connection for migrations");
        conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
    }

    let (tx, _rx) = broadcast::channel(100);

    let state = AppState { pool, tx };

    // define routes
    let app = Router::new()
    .route("/api/health", get(health))
    .route("/api/events", post(create_event))
    .route("/api/events/by-key/{key}", get(get_event_by_key))
    .route(
        "/api/events/{id}/guesses",
        post(submit_guess).get(get_event_guesses),
    )
    .route("/api/events/{id}/live", get(sse_subscribe))
    .fallback_service(
        ServeDir::new("public")
        .not_found_service(ServeFile::new("public/index.html")),
    )
    .with_state(state);

    // run server
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("{}:{}", host, port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Listening on http://{}", addr);
    serve(listener, app).await.unwrap();
}
