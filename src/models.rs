use crate::schema::{events, guesses, invitees};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = invitees)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Invitee {
    pub id: Uuid,
    pub event_id: Uuid,
    pub display_name: String,
    pub created_at: NaiveDateTime,
    pub color_hex: String,
}

#[derive(Insertable)]
#[diesel(table_name = invitees)]
pub struct NewInvitee<'a> {
    pub event_id: Uuid,
    pub display_name: &'a str,
    pub color_hex: &'a str,
}

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = guesses)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Guess {
    pub id: Uuid,
    pub invitee_id: Uuid,
    pub guessed_date: NaiveDateTime,
    pub guessed_weight_kg: f64,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = guesses)]
pub struct NewGuess {
    pub invitee_id: Uuid,
    pub guessed_date: NaiveDateTime,
    pub guessed_weight_kg: f64,
}

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = events)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Event {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<NaiveDateTime>,
    pub guess_close_date: Option<NaiveDateTime>,
    pub event_key: String,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = events)]
pub struct NewEvent<'a> {
    pub title: &'a str,
    pub description: Option<&'a str>,
    pub due_date: Option<NaiveDateTime>,
    pub guess_close_date: Option<NaiveDateTime>,
    pub event_key: &'a str,
}

#[derive(Serialize, Clone, Debug)]
pub struct GraphPoint {
    pub display_name: String,
    pub color_hex: String,
    pub guessed_date: NaiveDateTime,
    pub guessed_weight_kg: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct GuessUpdate {
    pub event_id: Uuid,
    pub guess: GraphPoint,
}
