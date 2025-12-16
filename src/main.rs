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
use chrono::{Duration, Utc};
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
    claim_event, create_event, delete_event, get_event_by_key, get_event_guesses, health,
    delete_guess, set_event_answer, sse_subscribe, submit_guess, update_event_settings,
    update_guess,
};
use types::AppState;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

async fn run_cleanup_task(pool: r2d2::Pool<ConnectionManager<PgConnection>>) {
    // Run once on startup
    cleanup_job(&pool).await;

    // Then run every 24 hours
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(24 * 60 * 60));
    loop {
        interval.tick().await;
        cleanup_job(&pool).await;
    }
}

async fn cleanup_job(pool: &r2d2::Pool<ConnectionManager<PgConnection>>) {
    let pool = pool.clone();
    let result = tokio::task::spawn_blocking(move || {
        use crate::schema::events::dsl::*;
        let mut conn = match pool.get() {
            Ok(c) => c,
            Err(e) => return Err(format!("Failed to get connection: {}", e)),
        };

        let limit = Utc::now().naive_utc() - Duration::days(365);

        diesel::delete(events.filter(created_at.lt(limit)))
            .execute(&mut conn)
            .map_err(|e| format!("Diesel error: {}", e))
    })
    .await;

    match result {
        Ok(Ok(count)) => {
            if count > 0 {
                tracing::info!("Cleaned up {} old events", count);
            }
        }
        Ok(Err(e)) => tracing::error!("Error cleaning up events: {}", e),
        Err(e) => tracing::error!("Cleanup task panicked: {}", e),
    }
}

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

    // Start cleanup task
    let cleanup_pool = pool.clone();
    tokio::spawn(async move {
        run_cleanup_task(cleanup_pool).await;
    });

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
        .route("/api/events/{id}", axum::routing::delete(delete_event))
        .route("/api/events/{id}/claim", post(claim_event))
        .route("/api/events/by-key/{key}", get(get_event_by_key))
        .route(
            "/api/events/{id}/guesses",
            post(submit_guess).get(get_event_guesses),
        )
        .route(
            "/api/events/{id}/guesses/{invitee_id}",
            axum::routing::put(update_guess).delete(delete_guess),
        )
        .route(
            "/api/events/{id}/settings",
            axum::routing::put(update_event_settings),
        )
        .route("/api/events/{id}/answer", post(set_event_answer))
        .route("/api/events/{id}/live", get(sse_subscribe))
        .fallback_service(
            ServeDir::new("public").not_found_service(ServeFile::new("public/index.html")),
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
