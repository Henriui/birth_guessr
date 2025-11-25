CREATE TABLE invitees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    display_name VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE guesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitee_id UUID NOT NULL REFERENCES invitees(id) ON DELETE CASCADE,
    guessed_date TIMESTAMP NOT NULL,
    guessed_weight_kg FLOAT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
