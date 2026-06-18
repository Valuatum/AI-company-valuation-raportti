# Deploy — frontend on Vercel, backend on Fly.io

The backend needs Python + subprocess + a persistent disk + headless Chrome, so
it runs as a Docker container on Fly.io (Railway/Render work too — same image).
The frontend is a static Vite build on Vercel that calls the backend over HTTPS.

```
 Browser ──HTTPS──▶ Vercel (static React UI)
                      │  fetch(VITE_API_BASE + /api/...)  +  Authorization: Bearer APP_TOKEN
                      ▼
                    Fly.io backend (FastAPI, SQLite on /data volume, node+chromium)
                      │  OPENROUTER_API_KEY / VALUATUM_TOKEN / VALU_MCP_PROFINDER_URL  (server-side only)
```

## 1. Backend → Fly.io

Run from the **repo root** (where `fly.toml` lives).

```bash
brew install flyctl              # if needed
fly auth login

# Edit fly.toml: set a unique `app = "..."` name and a region.
fly apps create <your-app-name>          # or: fly launch --no-deploy --copy-config
fly volumes create valu_data --size 1 --region <region>   # persistent SQLite

# Secrets (never commit these):
fly secrets set \
  APP_TOKEN="$(openssl rand -hex 24)" \
  OPENROUTER_API_KEY="sk-or-..." \
  VALUATUM_TOKEN="..." \
  VALU_MCP_PROFINDER_URL="https://..." \
  ALLOWED_ORIGINS="https://<your-vercel-app>.vercel.app"

fly deploy

fly secrets list        # confirm; copy the APP_TOKEN value you generated
```

Backend URL: `https://<your-app-name>.fly.dev`. Check `…/api/health` → `{"ok":true,"auth":true}`.

**APP_TOKEN** is the shared password the whole team uses to reach the tool. Keep
it secret — anyone with it can spend the OpenRouter/Valuatum tokens.

## 2. Frontend → Vercel

```bash
npm i -g vercel        # or use the Vercel dashboard
cd pipeline-runner/frontend
vercel link            # create/link the project
# Project → Settings → Root Directory = pipeline-runner/frontend
```

Set env var in Vercel (Project → Settings → Environment Variables):

```
VITE_API_BASE = https://<your-app-name>.fly.dev
```

Deploy:

```bash
vercel --prod
```

Then go back and set `ALLOWED_ORIGINS` on Fly to the final Vercel domain (step 1),
`fly deploy` again if it changed.

## 3. Use

Open the Vercel URL → it prompts for the access token → paste the `APP_TOKEN`.
Stored in the browser (localStorage); change it anytime via the 🔒 button.

## Notes

- **Persistence:** SQLite lives on the `/data` Fly volume. Single machine only —
  don't scale the backend to >1 instance with SQLite. For multi-instance, switch
  `PIPELINE_DB`/`store.py` to managed Postgres.
- **Other hosts:** the same `pipeline-runner/Dockerfile` runs on Railway or Render.
  Set the same env vars; mount a volume at `/data`.
- **Local dev is unchanged:** `./run.sh`, no `APP_TOKEN` → auth disabled,
  `VITE_API_BASE` empty → Vite proxies `/api`.
- **Cost guard:** every model call spends real money; the shared token is the
  only gate. Rotate it (`fly secrets set APP_TOKEN=...`) if it leaks.
