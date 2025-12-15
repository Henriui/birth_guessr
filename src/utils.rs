use rand::Rng;

/// Generates a random event key in the format XXXXXX-XXXXXX-XXXXXX
pub fn generate_event_key() -> String {
    let mut rng = rand::thread_rng();
    let key: String = (0..18)
        .map(|i| {
            if i > 0 && i % 6 == 0 {
                '-'
            } else {
                const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            }
        })
        .collect();
    key
}

pub fn generate_secret_key() -> String {
    petname::petname(3, "-").unwrap_or_else(|| "secret-key-fallback".to_string())
}
