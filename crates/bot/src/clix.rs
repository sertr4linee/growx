use anyhow::{Context, Result};
use serde::Deserialize;
use tokio::process::Command;

/// A tweet/mention from the feed.
#[derive(Debug, Clone, Deserialize)]
pub struct Mention {
    pub id: String,
    pub text: String,
    pub author_handle: String,
    pub reply_to_handle: Option<String>,
}

/// A user from the followers list.
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

    /// Run a clix command with --json and parse stdout as JSON.
    /// Strips warning/log lines that appear before the actual JSON.
    async fn run_json(&self, args: &[&str]) -> Result<serde_json::Value> {
        let mut all_args: Vec<&str> = args.to_vec();
        all_args.push("--json");

        let output = Command::new(&self.clix_path)
            .args(&all_args)
            .output()
            .await
            .with_context(|| format!("Failed to spawn clix (path: {})", self.clix_path))?;

        // clix may print warning lines to stdout before the JSON — find the first [ or {
        let raw = String::from_utf8_lossy(&output.stdout);
        let json_start = raw.find(|c| c == '[' || c == '{').with_context(|| {
            let stderr = String::from_utf8_lossy(&output.stderr);
            format!("No JSON in clix output. stderr: {}", stderr.lines().next().unwrap_or("(empty)"))
        })?;

        serde_json::from_str(&raw[json_start..])
            .with_context(|| format!("Failed to parse clix JSON (args: {:?})", args))
    }

    /// Fetch the home timeline feed and return tweets that mention `own_handle`.
    /// Used as a fallback since `clix search` endpoint is frequently stale on X.
    pub async fn get_mentions(&self, own_handle: &str, count: u32) -> Result<Vec<Mention>> {
        let count_str = count.to_string();
        let val = self.run_json(&["feed", "--type", "following", "--count", &count_str]).await?;

        let all: Vec<Mention> = serde_json::from_value(val).unwrap_or_default();

        // Keep tweets that reply to own_handle OR mention @handle in text
        let handle_lower = own_handle.to_lowercase();
        let at_handle = format!("@{}", handle_lower);
        let filtered = all
            .into_iter()
            .filter(|t| {
                t.reply_to_handle
                    .as_deref()
                    .map(|h| h.to_lowercase() == handle_lower)
                    .unwrap_or(false)
                    || t.text.to_lowercase().contains(&at_handle)
            })
            .collect();

        Ok(filtered)
    }

    /// Fetch the followers list for `handle`.
    /// Syntax: `clix user <handle> followers <handle> --count <n>`
    pub async fn get_followers(&self, handle: &str, count: u32) -> Result<Vec<String>> {
        let count_str = count.to_string();
        let val = self
            .run_json(&["user", handle, "followers", handle, "--count", &count_str])
            .await?;

        let users: Vec<FollowerUser> = serde_json::from_value(val).unwrap_or_default();
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
}
