use crate::models::LiveUpdate;
use diesel::pg::PgConnection;
use diesel::r2d2::{self, ConnectionManager};
use tokio::sync::broadcast;

pub type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub tx: broadcast::Sender<LiveUpdate>,
}
