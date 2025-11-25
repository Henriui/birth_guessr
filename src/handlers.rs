use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::sse::{Event as SseEvent, KeepAlive, Sse},
};
use diesel::prelude::*;
use futures::stream::Stream;
use serde::Deserialize;
use tokio_stream::StreamExt;
use tokio_stream::wrappers::BroadcastStream;
use uuid::Uuid;

use crate::{
    models::{Event, GraphPoint, Guess, GuessUpdate, Invitee, NewEvent, NewGuess, NewInvitee},
    schema::events,
    types::AppState,
    utils::generate_event_key,
};

// ... (health, create_event remain unchanged) ...

pub async fn health() -> &'static str {
    "ok"
}

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::NaiveDateTime>,
}

pub async fn create_event(
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> Json<Event> {
    let event_key = generate_event_key();

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

pub async fn get_event_guesses(
    State(state): State<AppState>,
    Path(event_id_param): Path<Uuid>,
) -> Result<Json<Vec<GraphPoint>>, StatusCode> {
    use crate::schema::{guesses, invitees};

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let results = invitees::table
        .inner_join(guesses::table)
        .filter(invitees::event_id.eq(event_id_param))
        .select((
            invitees::display_name,
            invitees::color_hex,
            guesses::guessed_date,
            guesses::guessed_weight_kg,
        ))
        .load::<(String, String, chrono::NaiveDateTime, f64)>(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let points = results
        .into_iter()
        .map(|(name, color, date, weight)| GraphPoint {
            display_name: name,
            color_hex: color,
            guessed_date: date,
            guessed_weight_kg: weight,
        })
        .collect();

    Ok(Json(points))
}

pub async fn get_event_by_key(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Json<Event>, StatusCode> {
    use crate::schema::events::dsl::*;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let event = events
        .filter(event_key.eq(key))
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(event))
}

#[derive(Deserialize)]
pub struct SubmitGuessRequest {
    pub display_name: String,
    pub guessed_date: chrono::NaiveDateTime,
    pub guessed_weight_kg: f64,
    pub color_hex: String,
}

pub async fn submit_guess(
    State(state): State<AppState>,
    Path(event_id_param): Path<Uuid>,
    Json(payload): Json<SubmitGuessRequest>,
) -> Result<Json<(Invitee, Guess)>, StatusCode> {
    use crate::schema::{guesses, invitees};

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 1. Save to DB
    let (invitee, guess) = conn
        .transaction::<(Invitee, Guess), diesel::result::Error, _>(|conn| {
            let new_invitee = NewInvitee {
                event_id: event_id_param,
                display_name: &payload.display_name,
                color_hex: &payload.color_hex,
            };

            let invitee = diesel::insert_into(invitees::table)
                .values(&new_invitee)
                .returning(Invitee::as_returning())
                .get_result(conn)?;

            let new_guess = NewGuess {
                invitee_id: invitee.id,
                guessed_date: payload.guessed_date,
                guessed_weight_kg: payload.guessed_weight_kg,
            };

            let guess = diesel::insert_into(guesses::table)
                .values(&new_guess)
                .returning(Guess::as_returning())
                .get_result(conn)?;

            Ok((invitee, guess))
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 2. Broadcast event
    let update = GuessUpdate {
        event_id: event_id_param,
        guess: GraphPoint {
            display_name: invitee.display_name.clone(),
            color_hex: invitee.color_hex.clone(),
            guessed_date: guess.guessed_date,
            guessed_weight_kg: guess.guessed_weight_kg,
        },
    };
    // We ignore errors here (e.g. if no one is listening)
    let _ = state.tx.send(update);

    Ok(Json((invitee, guess)))
}

pub async fn sse_subscribe(
    Path(event_id_param): Path<Uuid>,
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<SseEvent, axum::Error>>> {
    let rx = state.tx.subscribe();

    let stream = BroadcastStream::new(rx).filter_map(move |result| {
        match result {
            Ok(update) => {
                // Only forward updates for this specific event
                if update.event_id == event_id_param {
                    if let Ok(json) = serde_json::to_string(&update.guess) {
                        return Some(Ok(SseEvent::default().data(json)));
                    }
                }
                None
            }
            Err(_) => None, // Lagged or closed, ignore
        }
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
