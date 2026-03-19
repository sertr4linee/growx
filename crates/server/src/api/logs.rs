use axum::{
    extract::{Query, State},
    response::Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Deserialize)]
pub struct LogsQuery {
    pub limit: Option<i64>,
    pub action: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize)]
pub struct LogEntry {
    pub id: i64,
    pub action: String,
    pub target_user: Option<String>,
    pub tweet_id: Option<String>,
    pub message: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct LogsResponse {
    pub logs: Vec<LogEntry>,
}

pub async fn get_logs(
    State(state): State<AppState>,
    Query(q): Query<LogsQuery>,
) -> Json<LogsResponse> {
    let limit = q.limit.unwrap_or(50).min(500);

    let rows = sqlx::query!(
        r#"
        SELECT id, action, target_user, tweet_id, message, status,
               datetime(created_at) as "created_at!: String"
        FROM activity_log
        WHERE (? IS NULL OR action = ?)
          AND (? IS NULL OR status = ?)
        ORDER BY created_at DESC
        LIMIT ?
        "#,
        q.action, q.action,
        q.status, q.status,
        limit,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let logs = rows
        .into_iter()
        .map(|r| LogEntry {
            id: r.id,
            action: r.action,
            target_user: r.target_user,
            tweet_id: r.tweet_id,
            message: r.message,
            status: r.status,
            created_at: r.created_at,
        })
        .collect();

    Json(LogsResponse { logs })
}
