use anyhow::{Context, Result};
use serde::Deserialize;
use tokio::process::Command;

#[derive(Debug, Clone, Deserialize)]
pub struct Mention {
    pub id: String,
    pub text: String,
    pub author: MentionAuthor,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MentionAuthor {
    pub handle: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FollowerList {
    pub users: Vec<FollowerUser>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct FollowerUser {
    pub handle: String,
}

#[derive(Debug, Clone)]
pub struct ClixClient {
    pub clix_path: String,
}

impl ClixClient {
    pub fn new(clix_path: impl Into<String>) -> Self {
        Self { clix_path: clix_path.into() }
    }

    async fn run_json(&self, args: &[&str]) -> Result<serde_json::Value> {
        let mut all_args: Vec<&str> = args.to_vec();
        all_args.push("--json");

        let output = Command::new(&self.clix_path)
            .args(&all_args)
            .output()
            .await
            .with_context(|| format!("Failed to run clix with args: {:?}", args))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("clix exited with error: {}", stderr);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&stdout)
            .with_context(|| format!("Failed to parse clix JSON output: {}", stdout))
    }

    pub async fn get_mentions(&self, count: u32) -> Result<Vec<Mention>> {
        let count_str = count.to_string();
        let val = self.run_json(&["search", "@me", "--type", "latest", "--count", &count_str]).await?;

        let mentions: Vec<Mention> = serde_json::from_value(
            val.get("tweets").cloned().unwrap_or(serde_json::Value::Array(vec![]))
        ).unwrap_or_default();
        Ok(mentions)
    }

    pub async fn get_followers(&self, handle: &str, count: u32) -> Result<Vec<String>> {
        let count_str = count.to_string();
        let val = self.run_json(&["user", handle, "--followers", "--count", &count_str]).await?;

        let users: Vec<FollowerUser> = serde_json::from_value(
            val.get("followers").cloned().unwrap_or(serde_json::Value::Array(vec![]))
        ).unwrap_or_default();
        Ok(users.into_iter().map(|u| u.handle).collect())
    }

    pub async fn post_reply(&self, tweet_id: &str, text: &str) -> Result<()> {
        self.run_json(&["post", text, "--reply-to", tweet_id]).await?;
        Ok(())
    }

    pub async fn send_dm(&self, handle: &str, text: &str) -> Result<()> {
        self.run_json(&["dm", "send", handle, text]).await?;
        Ok(())
    }

    /// Returns the authenticated user's handle from `clix auth status`
    pub async fn get_own_handle(&self) -> Result<String> {
        let val = self.run_json(&["auth", "status"]).await?;
        val.get("handle")
            .and_then(|v| v.as_str())
            .map(String::from)
            .context("Could not find handle in auth status output")
    }
}
