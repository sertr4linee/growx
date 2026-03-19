# growx

X/Twitter growth bot in Rust with a web dashboard. No API keys — uses [clix](https://github.com/spideystreet/clix) (cookie-based auth).

## Features

- **Auto-reply** — reply to mentions matching keywords, using random templates
- **Follow → DM** — auto-DM every new follower with a welcome message
- **AI variation** — optionally vary each message via OpenAI or Ollama
- **Daily rate limits** — configurable caps per feature to stay safe
- **Web dashboard** — React UI to toggle features, edit templates, view activity

## Prerequisites

1. **Rust** — https://rustup.rs
2. **Node.js 18+** — https://nodejs.org
3. **clix** — `uv pip install clix0 && clix auth login`
   - Or: `pip install clix0`
   - Authenticate once: `clix auth login` (extracts cookies from your browser)

## Setup

```bash
# 1. Install frontend dependencies and build
cd web && npm install && npm run build && cd ..

# 2. Build and run the server (runs migrations automatically)
cargo run --release --bin growx
```

Open http://localhost:3001 in your browser.

## Development

```bash
# Terminal 1 — Rust backend (hot reload with cargo-watch)
cargo watch -x 'run --bin growx'

# Terminal 2 — Vite frontend dev server (with proxy to :3001)
cd web && npm run dev
```

Frontend dev server runs at http://localhost:3000 and proxies `/api` to the Rust backend.

## Configuration

All configuration is done via the web UI at http://localhost:3001.

| Setting | Default | Description |
|---|---|---|
| Poll interval | 60s | How often to check for new mentions/followers |
| clix path | `clix` | Path to the clix binary |
| AI provider | `ollama` | `openai` or `ollama` for template variation |
| Auto-reply keywords | (empty) | Keywords to match — empty = reply to all |
| Auto-reply templates | (empty) | Pool of reply templates (random selection) |
| Auto-reply max/day | 50 | Daily reply cap |
| Follow DM template | (empty) | Welcome DM text |
| Follow DM max/day | 30 | Daily DM cap |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite://growx.db` | SQLite database path |
| `BIND_ADDR` | `0.0.0.0:3001` | Server bind address |
| `RUST_LOG` | `growx=debug` | Log level |

## Disclaimer

For educational and personal use only. Not affiliated with X Corp. Use responsibly and in accordance with X's Terms of Service.
