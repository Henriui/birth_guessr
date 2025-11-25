// @generated automatically by Diesel CLI.

diesel::table! {
    events (id) {
        id -> Uuid,
        title -> Varchar,
        description -> Nullable<Text>,
        due_date -> Nullable<Timestamp>,
        event_key -> Varchar,
        created_at -> Timestamp,
    }
}
