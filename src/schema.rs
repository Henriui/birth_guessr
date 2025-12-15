// @generated automatically by Diesel CLI.

diesel::table! {
    events (id) {
        id -> Uuid,
        title -> Varchar,
        description -> Nullable<Text>,
        due_date -> Nullable<Timestamp>,
        event_key -> Varchar,
        created_at -> Timestamp,
        guess_close_date -> Nullable<Timestamp>,
        secret_key -> Varchar,
    }
}

diesel::table! {
    guesses (id) {
        id -> Uuid,
        invitee_id -> Uuid,
        guessed_date -> Timestamp,
        guessed_weight_kg -> Float8,
        created_at -> Timestamp,
    }
}

diesel::table! {
    invitees (id) {
        id -> Uuid,
        event_id -> Uuid,
        display_name -> Varchar,
        created_at -> Timestamp,
        #[max_length = 7]
        color_hex -> Varchar,
    }
}

diesel::joinable!(guesses -> invitees (invitee_id));
diesel::joinable!(invitees -> events (event_id));

diesel::allow_tables_to_appear_in_same_query!(events, guesses, invitees,);
