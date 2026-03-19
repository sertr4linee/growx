use std::sync::Arc;

use anyhow::Result;
use axum::{
    routing::{get, put},
    Router,
};
use growx_bot::{engine::BotConfig, BotEngine};
use tokio::sync::RwLock;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod db;
mod state;

use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "growx=debug,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://growx.db".to_string());

    let pool = db::setup(&database_url).await?;

    // Load initial config from DB
    let bot_config = Arc::new(RwLock::new(BotConfig::default()));
    let shared_config = bot_config.clone();

    // Load config values from DB into BotConfig
    {
        use db::get_config;
        use growx_bot::{
            ai::{AiConfig, AiProvider},
            rules::{auto_reply::AutoReplyConfig, follow_dm::FollowDmConfig},
        };

        let provider = match get_config(&pool, "ai.provider").await.as_deref() {
            Some("openai") => AiProvider::OpenAi,
            _ => AiProvider::Ollama,
        };

        let clix_path = get_config(&pool, "bot.clix_path").await
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| "clix".to_string());

        let ollama_url = get_config(&pool, "ai.ollama_url").await
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| "http://localhost:11434".to_string());

        *bot_config.write().await = BotConfig {
            poll_interval_secs: get_config(&pool, "bot.poll_interval_secs").await
                .and_then(|v| v.parse().ok()).unwrap_or(60),
            clix_path,
            own_handle: get_config(&pool, "bot.own_handle").await.unwrap_or_default(),
            auto_reply: AutoReplyConfig {
                enabled: get_config(&pool, "auto_reply.enabled").await.as_deref() == Some("true"),
                keywords: get_config(&pool, "auto_reply.keywords").await
                    .and_then(|v| serde_json::from_str(&v).ok()).unwrap_or_default(),
                templates: get_config(&pool, "auto_reply.templates").await
                    .and_then(|v| serde_json::from_str(&v).ok()).unwrap_or_default(),
                max_per_day: get_config(&pool, "auto_reply.max_per_day").await
                    .and_then(|v| v.parse().ok()).unwrap_or(50),
                ai_variation: get_config(&pool, "auto_reply.ai_variation").await.as_deref() == Some("true"),
            },
            follow_dm: FollowDmConfig {
                enabled: get_config(&pool, "follow_dm.enabled").await.as_deref() == Some("true"),
                template: get_config(&pool, "follow_dm.template").await.unwrap_or_default(),
                max_per_day: get_config(&pool, "follow_dm.max_per_day").await
                    .and_then(|v| v.parse().ok()).unwrap_or(30),
                ai_variation: get_config(&pool, "follow_dm.ai_variation").await.as_deref() == Some("true"),
            },
            ai: AiConfig {
                provider,
                model: get_config(&pool, "ai.model").await.unwrap_or_else(|| "llama3".to_string()),
                api_key: get_config(&pool, "ai.api_key").await.filter(|v| !v.is_empty()),
                ollama_url,
            },
        };
    }

    let engine = BotEngine::new(pool.clone(), shared_config.clone());
    let last_poll = engine.last_poll_ref();
    let bot_running = engine.running_flag();

    // Spawn the bot engine in the background
    tokio::spawn(async move { engine.run().await });

    let app_state = AppState {
        pool,
        bot_config: shared_config,
        last_poll,
        bot_running,
    };

    let api_router = Router::new()
        .route("/api/config", get(api::config::get_config).put(api::config::update_config))
        .route("/api/logs", get(api::logs::get_logs))
        .route("/api/status", get(api::status::get_status));

    // Serve built frontend from web/dist, fallback to index.html for SPA
    let frontend = ServeDir::new("web/dist").append_index_html_on_directories(true);

    let app = Router::new()
        .merge(api_router)
        .fallback_service(frontend)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3001".to_string());
    let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
    tracing::info!("growx server listening on http://{}", bind_addr);

    axum::serve(listener, app).await?;
    Ok(())
}
