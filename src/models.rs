use crate::schema::events;
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::Serialize;
use uuid::Uuid;

#[derive(Queryable, Selectable, Serialize, Debug)]
#[diesel(table_name = events)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Event {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<NaiveDateTime>,
    pub event_key: String,
    pub created_at: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = events)]
pub struct NewEvent<'a> {
    pub title: &'a str,
    pub description: Option<&'a str>,
    pub due_date: Option<NaiveDateTime>,
    pub event_key: &'a str,
}
