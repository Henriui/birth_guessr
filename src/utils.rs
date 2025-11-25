use rand::{Rng, distributions::Alphanumeric};

/// Generates a random event key in the format XXXXXX-XXXXXX-XXXXXX
pub fn generate_event_key() -> String {
    let rng = rand::thread_rng();
    let part1: String = rng
        .clone()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();
    let part2: String = rng
        .clone()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();
    let part3: String = rng
        .clone()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();

    format!("{}-{}-{}", part1, part2, part3)
}
