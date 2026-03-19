use axum::{extract::State, response::Json};
use chrono::Utc;
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct StatusResponse {
    pub running: bool,
    pub last_poll: Option<String>,
    pub today_replies: i64,
    pub today_dms: i64,
}

pub async fn get_status(State(state): State<AppState>) -> Json<StatusResponse> {
    let running = *state.bot_running.read().await;
    let last_poll = state
        .last_poll
        .read()
        .await
        .map(|dt| dt.to_rfc3339());

    let today = Utc::now().format("%Y-%m-%d").to_string();

    let today_replies: i64 = sqlx::query_scalar!(
        "SELECT COALESCE(count, 0) FROM rate_counters WHERE action = 'auto_reply' AND date = ?",
        today
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(0);

    let today_dms: i64 = sqlx::query_scalar!(
        "SELECT COALESCE(count, 0) FROM rate_counters WHERE action = 'follow_dm' AND date = ?",
        today
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(0);

    Json(StatusResponse {
        running,
        last_poll,
        today_replies,
        today_dms,
    })
}
