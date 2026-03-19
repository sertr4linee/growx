use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use sqlx::SqlitePool;
use tokio::sync::RwLock;
use tokio::time::sleep;

use crate::{
    ai::{AiConfig},
    clix::ClixClient,
    rules::{auto_reply, follow_dm},
};

#[derive(Debug, Clone)]
pub struct BotConfig {
    pub poll_interval_secs: u64,
    pub clix_path: String,
    pub own_handle: String,
    pub auto_reply: auto_reply::AutoReplyConfig,
    pub follow_dm: follow_dm::FollowDmConfig,
    pub ai: AiConfig,
}

impl Default for BotConfig {
    fn default() -> Self {
        Self {
            poll_interval_secs: 60,
            clix_path: "clix".to_string(),
            own_handle: String::new(),
            auto_reply: auto_reply::AutoReplyConfig {
                enabled: false,
                keywords: vec![],
                templates: vec![],
                max_per_day: 50,
                ai_variation: false,
            },
            follow_dm: follow_dm::FollowDmConfig {
                enabled: false,
                template: String::new(),
                max_per_day: 30,
                ai_variation: false,
            },
            ai: AiConfig::default(),
        }
    }
}

pub struct BotEngine {
    pool: SqlitePool,
    config: Arc<RwLock<BotConfig>>,
    running: Arc<RwLock<bool>>,
    last_poll: Arc<RwLock<Option<chrono::DateTime<chrono::Utc>>>>,
}

impl BotEngine {
    pub fn new(pool: SqlitePool, config: Arc<RwLock<BotConfig>>) -> Self {
        Self {
            pool,
            config,
            running: Arc::new(RwLock::new(false)),
            last_poll: Arc::new(RwLock::new(None)),
        }
    }

    pub fn running_flag(&self) -> Arc<RwLock<bool>> {
        self.running.clone()
    }

    pub fn last_poll_ref(&self) -> Arc<RwLock<Option<chrono::DateTime<chrono::Utc>>>> {
        self.last_poll.clone()
    }

    pub async fn run(self) {
        tracing::info!("Bot engine started");
        *self.running.write().await = true;

        loop {
            let cfg = self.config.read().await.clone();

            if cfg.own_handle.is_empty() {
                tracing::warn!("bot.own_handle not configured — set your X handle in Settings");
                tokio::time::sleep(std::time::Duration::from_secs(cfg.poll_interval_secs)).await;
                continue;
            }

            let clix = ClixClient::new(&cfg.clix_path);

            if let Err(e) = self.poll_once(&cfg, &clix).await {
                tracing::error!("Poll error: {}", e);
            }

            *self.last_poll.write().await = Some(chrono::Utc::now());

            sleep(Duration::from_secs(cfg.poll_interval_secs)).await;
        }
    }

    async fn poll_once(&self, cfg: &BotConfig, clix: &ClixClient) -> Result<()> {
        tracing::debug!("Polling as @{}", cfg.own_handle);

        auto_reply::run(&self.pool, clix, &cfg.own_handle, &cfg.auto_reply, &cfg.ai).await?;
        follow_dm::run(&self.pool, clix, &cfg.own_handle, &cfg.follow_dm, &cfg.ai).await?;

        Ok(())
    }
}
