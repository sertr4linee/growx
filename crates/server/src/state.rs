use std::sync::Arc;

use growx_bot::engine::BotConfig;
use sqlx::SqlitePool;
use tokio::sync::RwLock;

pub type SharedBotConfig = Arc<RwLock<BotConfig>>;
pub type SharedLastPoll = Arc<RwLock<Option<chrono::DateTime<chrono::Utc>>>>;
pub type SharedRunning = Arc<RwLock<bool>>;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub bot_config: SharedBotConfig,
    pub last_poll: SharedLastPoll,
    pub bot_running: SharedRunning,
}
