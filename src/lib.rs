use axum::{
    Router,
    routing::{get, post},
};
use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};
use std::sync::Arc;
use tokio::sync::broadcast;

pub mod handlers;
pub mod models;
pub mod schema;
pub mod types;
pub mod utils;

use handlers::{
    claim_event, create_event, delete_event, delete_guess, get_event_by_key, get_event_guesses,
    health, set_event_answer, share_event_preview, sse_subscribe, submit_guess,
    update_event_description, update_event_settings, update_guess,
};
use types::{AppState, DbPool, RateLimiter};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub fn create_pool(database_url: &str) -> DbPool {
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool")
}

pub fn run_migrations(pool: &DbPool) {
    let mut conn = pool.get().expect("Failed to get connection for migrations");
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
}

pub fn build_state(pool: DbPool) -> AppState {
    let (tx, _rx) = broadcast::channel(100);
    AppState {
        pool,
        tx,
        rate_limiter: Arc::new(RateLimiter::new()),
    }
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/events", post(create_event))
        .route("/api/events/{id}", axum::routing::delete(delete_event))
        .route("/api/events/{id}/claim", post(claim_event))
        .route("/api/events/by-key/{key}", get(get_event_by_key))
        .route("/share/{key}", get(share_event_preview))
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
        .route(
            "/api/events/{id}/description",
            axum::routing::put(update_event_description),
        )
        .route("/api/events/{id}/answer", post(set_event_answer))
        .route("/api/events/live", get(sse_subscribe))
        .with_state(state)
}
