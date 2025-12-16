use crate::models::LiveUpdate;
use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager};
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::broadcast;
use tokio::sync::Mutex;

pub type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

pub struct RateLimiter {
    buckets: Mutex<HashMap<IpAddr, TokenBucket>>,
}

struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
        }
    }

    pub async fn allow(&self, ip: IpAddr, refill_per_sec: f64, capacity: f64) -> bool {
        let now = Instant::now();
        let mut buckets = self.buckets.lock().await;
        let bucket = buckets.entry(ip).or_insert_with(|| TokenBucket {
            tokens: capacity,
            last_refill: now,
        });

        let elapsed = now.duration_since(bucket.last_refill).as_secs_f64();
        if elapsed > 0.0 {
            bucket.tokens = (bucket.tokens + elapsed * refill_per_sec).min(capacity);
            bucket.last_refill = now;
        }

        if bucket.tokens >= 1.0 {
            bucket.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub tx: broadcast::Sender<LiveUpdate>,
    pub rate_limiter: Arc<RateLimiter>,
}
