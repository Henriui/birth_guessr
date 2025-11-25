use axum::{
    Router,
    extract::{Json, State},
    routing::{get, post},
    serve,
};
use diesel::prelude::*;
use diesel::r2d2::{self, ConnectionManager};
use rand::{Rng, distributions::Alphanumeric};
use serde::Deserialize;
use std::env;
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

use tracing;

mod models;
mod schema;

use models::{Event, NewEvent};

type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

#[derive(Clone)]
struct AppState {
    pool: DbPool,
}

#[tokio::main]
async fn main() {
    // init logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    let pool = r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool.");

    let state = AppState { pool };

    // define routes
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/events", post(create_event))
        .with_state(state);

    // run server
    let addr = "127.0.0.1:3000";
    let listener = TcpListener::bind(addr).await.unwrap();
    tracing::info!("Listening on http://{}", addr);
    serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "baby_birth_guessr backend is running"
}

async fn health() -> &'static str {
    "ok"
}

#[derive(Deserialize)]
struct CreateEventRequest {
    title: String,
    description: Option<String>,
    due_date: Option<chrono::NaiveDateTime>,
}

async fn create_event(
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> Json<Event> {
    use schema::events;

    // Generate a random key
    let event_key: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();

    let new_event = NewEvent {
        title: &payload.title,
        description: payload.description.as_deref(),
        due_date: payload.due_date,
        event_key: &event_key,
    };

    let mut conn = state
        .pool
        .get()
        .expect("couldn't get db connection from pool");

    let event = diesel::insert_into(events::table)
        .values(&new_event)
        .returning(Event::as_returning())
        .get_result(&mut conn)
        .expect("Error saving new event");

    Json(event)
}
