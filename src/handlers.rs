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
    models::{
        Event, EventWithSecret, GraphPoint, Guess, GuessUpdate, Invitee, LiveUpdate, NewEvent,
        NewGuess, NewInvitee,
    },
    schema::events,
    types::AppState,
    utils::{generate_event_key, generate_secret_key},
};

// ... (health check remains same)

pub async fn health() -> &'static str {
    "ok"
}

#[derive(Deserialize)]
pub struct DeleteEventRequest {
    pub secret_key: String,
}

pub async fn delete_event(
    State(state): State<AppState>,
    Path(event_id): Path<Uuid>,
    Json(payload): Json<DeleteEventRequest>,
) -> Result<StatusCode, StatusCode> {
    use crate::schema::events::dsl::*;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let target_event = events
        .find(event_id)
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if target_event.secret_key != payload.secret_key {
        return Err(StatusCode::FORBIDDEN);
    }

    diesel::delete(events.filter(id.eq(event_id)))
        .execute(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct CreateEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<chrono::NaiveDateTime>,
    pub guess_close_date: Option<chrono::NaiveDateTime>,
    pub turnstile_token: String,
    pub min_weight_kg: Option<f64>,
    pub max_weight_kg: Option<f64>,
    pub allow_guess_edits: Option<bool>,
}

#[derive(Deserialize)]
struct TurnstileVerifyResponse {
    success: bool,
}

pub async fn create_event(
    State(state): State<AppState>,
    Json(payload): Json<CreateEventRequest>,
) -> Result<Json<EventWithSecret>, StatusCode> {
    const DEFAULT_MIN_WEIGHT_KG: f64 = 1.8;
    const DEFAULT_MAX_WEIGHT_KG: f64 = 5.2;
    const HARD_MIN_WEIGHT_KG: f64 = 1.0;
    const HARD_MAX_WEIGHT_KG: f64 = 8.0;

    // Verify Turnstile Token
    let secret =
        std::env::var("TURNSTILE_SECRET_KEY").map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let client = reqwest::Client::new();
    let verify_result = client
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .form(&[
            ("secret", secret),
            ("response", payload.turnstile_token.clone()),
        ])
        .send()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .json::<TurnstileVerifyResponse>()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !verify_result.success {
        return Err(StatusCode::BAD_REQUEST);
    }

    if payload.due_date.is_none() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let event_key = generate_event_key();
    let secret_key = generate_secret_key();

    let mut min_weight_kg = payload.min_weight_kg.unwrap_or(DEFAULT_MIN_WEIGHT_KG);
    let mut max_weight_kg = payload.max_weight_kg.unwrap_or(DEFAULT_MAX_WEIGHT_KG);
    let allow_guess_edits = payload.allow_guess_edits.unwrap_or(false);

    if !min_weight_kg.is_finite() || !max_weight_kg.is_finite() {
        return Err(StatusCode::BAD_REQUEST);
    }

    min_weight_kg = min_weight_kg.clamp(HARD_MIN_WEIGHT_KG, HARD_MAX_WEIGHT_KG);
    max_weight_kg = max_weight_kg.clamp(HARD_MIN_WEIGHT_KG, HARD_MAX_WEIGHT_KG);

    if max_weight_kg <= min_weight_kg {
        return Err(StatusCode::BAD_REQUEST);
    }

    let new_event = NewEvent {
        title: &payload.title,
        description: payload.description.as_deref(),
        due_date: payload.due_date,
        guess_close_date: payload.guess_close_date,
        event_key: &event_key,
        secret_key: &secret_key,
        min_weight_kg,
        max_weight_kg,
        allow_guess_edits,
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

    // Construct response with explicit secret key
    let response = EventWithSecret { event, secret_key };

    Ok(Json(response))
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
            invitees::id,
            invitees::display_name,
            invitees::color_hex,
            guesses::guessed_date,
            guesses::guessed_weight_kg,
        ))
        .load::<(Uuid, String, String, chrono::NaiveDateTime, f64)>(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let points = results
        .into_iter()
        .map(|(invitee_id, name, color, date, weight)| GraphPoint {
            invitee_id,
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

    // Check if guesses are still allowed
    let event = events::table
        .find(event_id_param)
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if !payload.guessed_weight_kg.is_finite()
        || payload.guessed_weight_kg < event.min_weight_kg
        || payload.guessed_weight_kg > event.max_weight_kg
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    let now = chrono::Utc::now().naive_utc();
    let close_date = event.guess_close_date.or(event.due_date);

    if let Some(close) = close_date {
        if now > close {
            return Err(StatusCode::FORBIDDEN);
        }
    }

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
            invitee_id: invitee.id,
            display_name: invitee.display_name.clone(),
            color_hex: invitee.color_hex.clone(),
            guessed_date: guess.guessed_date,
            guessed_weight_kg: guess.guessed_weight_kg,
        },
    };
    // We ignore errors here (e.g. if no one is listening)
    let _ = state.tx.send(LiveUpdate::Guess(update));

    Ok(Json((invitee, guess)))
}

#[derive(Deserialize)]
pub struct UpdateGuessRequest {
    pub display_name: String,
    pub guessed_date: chrono::NaiveDateTime,
    pub guessed_weight_kg: f64,
    pub color_hex: String,
}

pub async fn update_guess(
    State(state): State<AppState>,
    Path((event_id_param, invitee_id_param)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateGuessRequest>,
) -> Result<Json<GraphPoint>, StatusCode> {
    use crate::schema::{events, guesses, invitees};

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let event = events::table
        .find(event_id_param)
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if !event.allow_guess_edits {
        return Err(StatusCode::FORBIDDEN);
    }

    if !payload.guessed_weight_kg.is_finite()
        || payload.guessed_weight_kg < event.min_weight_kg
        || payload.guessed_weight_kg > event.max_weight_kg
    {
        return Err(StatusCode::BAD_REQUEST);
    }

    let now = chrono::Utc::now().naive_utc();
    let close_date = event.guess_close_date.or(event.due_date);
    if let Some(close) = close_date {
        if now > close {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    // Ensure invitee belongs to event
    let target_invitee = invitees::table
        .find(invitee_id_param)
        .first::<Invitee>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if target_invitee.event_id != event_id_param {
        return Err(StatusCode::FORBIDDEN);
    }

    let updated = conn
        .transaction::<GraphPoint, diesel::result::Error, _>(|conn| {
            diesel::update(invitees::table.find(invitee_id_param))
                .set((
                    invitees::display_name.eq(&payload.display_name),
                    invitees::color_hex.eq(&payload.color_hex),
                ))
                .execute(conn)?;

            // Assumption: one guess per invitee.
            let updated_guess_rows = diesel::update(
                guesses::table.filter(guesses::invitee_id.eq(invitee_id_param)),
            )
                .set((
                    guesses::guessed_date.eq(payload.guessed_date),
                    guesses::guessed_weight_kg.eq(payload.guessed_weight_kg),
                ))
                .execute(conn)?;

            if updated_guess_rows == 0 {
                return Err(diesel::result::Error::NotFound);
            }

            Ok(GraphPoint {
                invitee_id: invitee_id_param,
                display_name: payload.display_name.clone(),
                color_hex: payload.color_hex.clone(),
                guessed_date: payload.guessed_date,
                guessed_weight_kg: payload.guessed_weight_kg,
            })
        })
        .map_err(|e| match e {
            diesel::result::Error::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    let update = GuessUpdate {
        event_id: event_id_param,
        guess: updated.clone(),
    };
    let _ = state.tx.send(LiveUpdate::Guess(update));

    Ok(Json(updated))
}

#[derive(Deserialize)]
pub struct UpdateEventSettingsRequest {
    pub secret_key: String,
    pub allow_guess_edits: bool,
}

pub async fn update_event_settings(
    State(state): State<AppState>,
    Path(event_id_param): Path<Uuid>,
    Json(payload): Json<UpdateEventSettingsRequest>,
) -> Result<Json<Event>, StatusCode> {
    use crate::schema::events::dsl::*;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let target_event = events
        .find(event_id_param)
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if target_event.secret_key != payload.secret_key {
        return Err(StatusCode::FORBIDDEN);
    }

    let updated_event = diesel::update(events.find(event_id_param))
        .set(allow_guess_edits.eq(payload.allow_guess_edits))
        .returning(Event::as_returning())
        .get_result(&mut conn)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let _ = state.tx.send(LiveUpdate::EventSettings {
        event_id: event_id_param,
        allow_guess_edits: updated_event.allow_guess_edits,
    });

    Ok(Json(updated_event))
}

#[derive(Deserialize)]
pub struct ClaimEventRequest {
    pub secret_key: String,
}

pub async fn claim_event(
    State(state): State<AppState>,
    Path(event_id_param): Path<Uuid>,
    Json(payload): Json<ClaimEventRequest>,
) -> Result<Json<Event>, StatusCode> {
    use crate::schema::events::dsl::*;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let target_event = events
        .find(event_id_param)
        .first::<Event>(&mut conn)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    if target_event.secret_key != payload.secret_key {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(Json(target_event))
}

pub async fn sse_subscribe(
    Path(event_id_param): Path<Uuid>,
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<SseEvent, axum::Error>>> {
    let rx = state.tx.subscribe();

    let stream = BroadcastStream::new(rx).filter_map(move |result| match result {
        Ok(update) => {
            let matches_event = match &update {
                LiveUpdate::Guess(g) => g.event_id == event_id_param,
                LiveUpdate::EventSettings { event_id, .. } => *event_id == event_id_param,
            };

            if !matches_event {
                return None;
            }

            serde_json::to_string(&update)
                .ok()
                .map(|json| Ok(SseEvent::default().data(json)))
        }
        Err(_) => None,
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
