use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AiProvider {
    OpenAi,
    Ollama,
}

#[derive(Debug, Clone)]
pub struct AiConfig {
    pub provider: AiProvider,
    pub model: String,
    pub api_key: Option<String>,
    pub ollama_url: String,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: AiProvider::Ollama,
            model: "llama3".to_string(),
            api_key: None,
            ollama_url: "http://localhost:11434".to_string(),
        }
    }
}

pub async fn vary_template(template: &str, config: &AiConfig) -> String {
    match try_vary_template(template, config).await {
        Ok(varied) => varied,
        Err(e) => {
            tracing::warn!("AI variation failed, using original template: {}", e);
            template.to_string()
        }
    }
}

async fn try_vary_template(template: &str, config: &AiConfig) -> Result<String> {
    let prompt = format!(
        "Rewrite the following message in a slightly different, natural way while keeping the same intent and tone. \
         Return only the rewritten message, nothing else.\n\nOriginal: {}",
        template
    );

    match config.provider {
        AiProvider::OpenAi => vary_openai(&prompt, config).await,
        AiProvider::Ollama => vary_ollama(&prompt, config).await,
    }
}

async fn vary_openai(prompt: &str, config: &AiConfig) -> Result<String> {
    let api_key = config.api_key.as_deref().unwrap_or_default();
    let client = Client::new();

    #[derive(Serialize)]
    struct Req<'a> {
        model: &'a str,
        messages: Vec<Msg<'a>>,
        max_tokens: u32,
    }
    #[derive(Serialize)]
    struct Msg<'a> {
        role: &'a str,
        content: &'a str,
    }
    #[derive(Deserialize)]
    struct Resp {
        choices: Vec<Choice>,
    }
    #[derive(Deserialize)]
    struct Choice {
        message: RespMsg,
    }
    #[derive(Deserialize)]
    struct RespMsg {
        content: String,
    }

    let resp: Resp = client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&Req {
            model: &config.model,
            messages: vec![Msg { role: "user", content: prompt }],
            max_tokens: 280,
        })
        .send()
        .await?
        .json()
        .await?;

    Ok(resp.choices.into_iter().next()
        .map(|c| c.message.content.trim().to_string())
        .unwrap_or_default())
}

async fn vary_ollama(prompt: &str, config: &AiConfig) -> Result<String> {
    let client = Client::new();

    #[derive(Serialize)]
    struct Req<'a> {
        model: &'a str,
        prompt: &'a str,
        stream: bool,
    }
    #[derive(Deserialize)]
    struct Resp {
        response: String,
    }

    let url = format!("{}/api/generate", config.ollama_url.trim_end_matches('/'));
    let resp: Resp = client
        .post(&url)
        .json(&Req { model: &config.model, prompt, stream: false })
        .send()
        .await?
        .json()
        .await?;

    Ok(resp.response.trim().to_string())
}
