use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{db, state::AppState};
use growx_bot::{
    ai::{AiConfig, AiProvider},
    engine::BotConfig,
    rules::{auto_reply::AutoReplyConfig, follow_dm::FollowDmConfig},
};

#[derive(Serialize)]
pub struct ConfigResponse {
    pub config: HashMap<String, String>,
}

#[derive(Deserialize)]
pub struct ConfigUpdate {
    pub updates: HashMap<String, String>,
}

pub async fn get_config(State(state): State<AppState>) -> Json<ConfigResponse> {
    let rows = sqlx::query!("SELECT key, value FROM config ORDER BY key")
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let config = rows.into_iter().filter_map(|r| r.key.map(|k| (k, r.value))).collect();
    Json(ConfigResponse { config })
}

pub async fn update_config(
    State(state): State<AppState>,
    Json(body): Json<ConfigUpdate>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    for (key, value) in &body.updates {
        db::set_config(&state.pool, key, value)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Reload bot config from DB into shared state
    reload_bot_config(&state).await;

    Ok(Json(serde_json::json!({"ok": true})))
}

async fn reload_bot_config(state: &AppState) {
    let get = |key: &str| {
        let pool = state.pool.clone();
        let k = key.to_string();
        async move { db::get_config(&pool, &k).await.unwrap_or_default() }
    };

    let provider = match get("ai.provider").await.as_str() {
        "openai" => AiProvider::OpenAi,
        _ => AiProvider::Ollama,
    };

    let new_cfg = BotConfig {
        poll_interval_secs: get("bot.poll_interval_secs").await.parse().unwrap_or(60),
        clix_path: {
            let v = get("bot.clix_path").await;
            if v.is_empty() { "clix".to_string() } else { v }
        },
        own_handle: get("bot.own_handle").await,
        auto_reply: AutoReplyConfig {
            enabled: get("auto_reply.enabled").await == "true",
            keywords: serde_json::from_str(&get("auto_reply.keywords").await).unwrap_or_default(),
            templates: serde_json::from_str(&get("auto_reply.templates").await).unwrap_or_default(),
            max_per_day: get("auto_reply.max_per_day").await.parse().unwrap_or(50),
            ai_variation: get("auto_reply.ai_variation").await == "true",
        },
        follow_dm: FollowDmConfig {
            enabled: get("follow_dm.enabled").await == "true",
            template: get("follow_dm.template").await,
            max_per_day: get("follow_dm.max_per_day").await.parse().unwrap_or(30),
            ai_variation: get("follow_dm.ai_variation").await == "true",
        },
        ai: AiConfig {
            provider,
            model: get("ai.model").await,
            api_key: {
                let v = get("ai.api_key").await;
                if v.is_empty() { None } else { Some(v) }
            },
            ollama_url: {
                let v = get("ai.ollama_url").await;
                if v.is_empty() { "http://localhost:11434".to_string() } else { v }
            },
        },
    };

    *state.bot_config.write().await = new_cfg;
}
