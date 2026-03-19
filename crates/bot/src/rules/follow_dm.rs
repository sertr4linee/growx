use anyhow::Result;
use sqlx::SqlitePool;

use crate::{
    ai::{self, AiConfig},
    clix::ClixClient,
    rate_limiter::RateLimiter,
};

#[derive(Debug, Clone)]
pub struct FollowDmConfig {
    pub enabled: bool,
    pub template: String,
    pub max_per_day: i64,
    pub ai_variation: bool,
}

pub async fn run(
    pool: &SqlitePool,
    clix: &ClixClient,
    own_handle: &str,
    config: &FollowDmConfig,
    ai_config: &AiConfig,
) -> Result<()> {
    if !config.enabled || config.template.is_empty() {
        return Ok(());
    }

    let followers = clix.get_followers(own_handle, 200).await.unwrap_or_default();
    let rate_limiter = RateLimiter::new(pool.clone());

    for handle in followers {
        // Skip if already DM'd
        let exists: bool = sqlx::query_scalar!(
            "SELECT COUNT(*) > 0 FROM seen_followers WHERE user_handle = ?",
            handle
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if exists {
            continue;
        }

        // Mark as seen immediately (even if DM fails, we don't retry to avoid spam)
        let _ = sqlx::query!(
            "INSERT OR IGNORE INTO seen_followers (user_handle) VALUES (?)",
            handle
        )
        .execute(pool)
        .await;

        // Check rate limit
        let allowed = rate_limiter.check_and_increment("follow_dm", config.max_per_day).await?;
        if !allowed {
            tracing::info!("Follow-DM daily cap reached, skipping @{}", handle);
            log_action(pool, &handle, "", "skipped").await;
            break;
        }

        let text = if config.ai_variation {
            ai::vary_template(&config.template, ai_config).await
        } else {
            config.template.clone()
        };

        match clix.send_dm(&handle, &text).await {
            Ok(_) => {
                tracing::info!("DM sent to @{}: {}", handle, text);
                log_action(pool, &handle, &text, "success").await;
            }
            Err(e) => {
                tracing::error!("Failed to DM @{}: {}", handle, e);
                log_action(pool, &handle, &e.to_string(), "error").await;
            }
        }
    }

    Ok(())
}

async fn log_action(pool: &SqlitePool, target_user: &str, message: &str, status: &str) {
    let _ = sqlx::query!(
        "INSERT INTO activity_log (action, target_user, message, status) VALUES ('follow_dm', ?, ?, ?)",
        target_user,
        message,
        status,
    )
    .execute(pool)
    .await;
}
