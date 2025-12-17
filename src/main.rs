// Avoid musl's default allocator due to lackluster performance
// https://nickb.dev/blog/default-musl-allocator-considered-harmful-to-performance
#[cfg(target_env = "musl")]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;
use axum::serve;
use chrono::{Duration, Utc};
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use std::env;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::services::{ServeDir, ServeFile};
use tracing_subscriber::EnvFilter;

use tracing;

use baby_birth_guessr::{build_router, build_state, create_pool, run_migrations};

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
        use baby_birth_guessr::schema::events::dsl::*;
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
    let pool = create_pool(&database_url);

    // Start cleanup task
    let cleanup_pool = pool.clone();
    tokio::spawn(async move {
        run_cleanup_task(cleanup_pool).await;
    });

    run_migrations(&pool);

    let state = build_state(pool);

    // define routes
    let app = build_router(state).fallback_service(
        ServeDir::new("public").not_found_service(ServeFile::new("public/index.html")),
    );

    // run server
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("{}:{}", host, port);
    let listener = TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Listening on http://{}", addr);
    serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
