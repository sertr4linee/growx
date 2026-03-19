use anyhow::Result;
use rand::seq::SliceRandom;
use sqlx::SqlitePool;

use crate::{
    ai::{self, AiConfig},
    clix::ClixClient,
    rate_limiter::RateLimiter,
};

#[derive(Debug, Clone)]
pub struct AutoReplyConfig {
    pub enabled: bool,
    pub keywords: Vec<String>,
    pub templates: Vec<String>,
    pub max_per_day: i64,
    pub ai_variation: bool,
}

pub async fn run(
    pool: &SqlitePool,
    clix: &ClixClient,
    config: &AutoReplyConfig,
    ai_config: &AiConfig,
) -> Result<()> {
    if !config.enabled || config.templates.is_empty() {
        return Ok(());
    }

    let mentions = clix.get_mentions(50).await.unwrap_or_default();
    let rate_limiter = RateLimiter::new(pool.clone());

    for mention in mentions {
        // Skip already-processed tweets
        let exists: bool = sqlx::query_scalar!(
            "SELECT COUNT(*) > 0 FROM seen_mentions WHERE tweet_id = ?",
            mention.id
        )
        .fetch_one(pool)
        .await
        .unwrap_or(false);

        if exists {
            continue;
        }

        // Mark as seen regardless of whether we reply (avoid reprocessing)
        let _ = sqlx::query!(
            "INSERT OR IGNORE INTO seen_mentions (tweet_id) VALUES (?)",
            mention.id
        )
        .execute(pool)
        .await;

        // Check keyword match (empty keywords = reply to all mentions)
        let matches = config.keywords.is_empty()
            || config.keywords.iter().any(|kw| {
                mention.text.to_lowercase().contains(&kw.to_lowercase())
            });

        if !matches {
            continue;
        }

        // Check rate limit
        let allowed = rate_limiter.check_and_increment("auto_reply", config.max_per_day).await?;
        if !allowed {
            tracing::info!("Auto-reply daily cap reached, skipping @{}", mention.author.handle);
            log_action(pool, "auto_reply", &mention.author.handle, Some(&mention.id), "", "skipped").await;
            break;
        }

        // Pick a template
        let template = config.templates
            .choose(&mut rand::thread_rng())
            .cloned()
            .unwrap_or_default();

        let text = if config.ai_variation {
            ai::vary_template(&template, ai_config).await
        } else {
            template
        };

        match clix.post_reply(&mention.id, &text).await {
            Ok(_) => {
                tracing::info!("Replied to @{}: {}", mention.author.handle, text);
                log_action(pool, "auto_reply", &mention.author.handle, Some(&mention.id), &text, "success").await;
            }
            Err(e) => {
                tracing::error!("Failed to reply to @{}: {}", mention.author.handle, e);
                log_action(pool, "auto_reply", &mention.author.handle, Some(&mention.id), &e.to_string(), "error").await;
            }
        }
    }

    Ok(())
}

async fn log_action(
    pool: &SqlitePool,
    action: &str,
    target_user: &str,
    tweet_id: Option<&str>,
    message: &str,
    status: &str,
) {
    let _ = sqlx::query!(
        "INSERT INTO activity_log (action, target_user, tweet_id, message, status) VALUES (?, ?, ?, ?, ?)",
        action,
        target_user,
        tweet_id,
        message,
        status,
    )
    .execute(pool)
    .await;
}
