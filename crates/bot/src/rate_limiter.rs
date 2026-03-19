use anyhow::Result;
use chrono::Utc;
use sqlx::SqlitePool;

pub struct RateLimiter {
    pool: SqlitePool,
}

impl RateLimiter {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Returns true if the action is allowed and increments the counter.
    /// Returns false if the daily cap has been reached.
    pub async fn check_and_increment(&self, action: &str, max_per_day: i64) -> Result<bool> {
        let today = Utc::now().format("%Y-%m-%d").to_string();

        // Upsert: insert or increment
        sqlx::query!(
            r#"
            INSERT INTO rate_counters (action, date, count)
            VALUES (?, ?, 0)
            ON CONFLICT(action, date) DO NOTHING
            "#,
            action,
            today,
        )
        .execute(&self.pool)
        .await?;

        let row = sqlx::query!(
            "SELECT count FROM rate_counters WHERE action = ? AND date = ?",
            action,
            today,
        )
        .fetch_one(&self.pool)
        .await?;

        if row.count >= max_per_day {
            return Ok(false);
        }

        sqlx::query!(
            "UPDATE rate_counters SET count = count + 1 WHERE action = ? AND date = ?",
            action,
            today,
        )
        .execute(&self.pool)
        .await?;

        Ok(true)
    }

    pub async fn today_count(&self, action: &str) -> Result<i64> {
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let row = sqlx::query!(
            "SELECT COALESCE(count, 0) as count FROM rate_counters WHERE action = ? AND date = ?",
            action,
            today,
        )
        .fetch_optional(&self.pool)
        .await?;
        Ok(row.map(|r| r.count).unwrap_or(0))
    }
}
