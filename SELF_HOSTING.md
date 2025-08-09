Self-hosting guide (macOS)

Goal
- Run the web app (frontend + backend) on your macOS machine and make it accessible from your local network (and optionally the internet), keeping setup simple and avoiding over-engineering.

Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js >= 20 and npm >= 9 (or Docker Desktop if you prefer containers)
- An OpenAI API key (kept locally, never committed)

1) Identify your LAN IP
- Find your Mac’s local IP (en0 or Wi‑Fi):
  - System Settings > Network, or
  - `ipconfig getifaddr en0` (often works for Wi‑Fi)
- Example: 192.168.1.42

2) Configure environment & secret (Keychain)
- Copy example env:
```bash
cp server/env.example server/.env
```
- Edit `server/.env`:
  - `OFFLINE_MODE=false`
  - `OPENAI_API_KEY=sk-...` (your key) — ou utilisez le Trousseau (Keychain):
    - `bash scripts/secret-store.sh set sk-...` (stockage sécurisé macOS)
    - le script `self-host.sh` l’injectera automatiquement si la clé existe dans le Trousseau
  - `CORS_ORIGIN=http://<YOUR_LAN_IP>:5173` (e.g., http://192.168.1.42:5173)

Optional root env (for Docker Compose):
```bash
cp docker-compose.env.example .env
# Set OPENAI_API_KEY and CORS_ORIGIN=http://<YOUR_LAN_IP>:5173
```

3) Run without Docker (one-command)
- One command (auto-detects your LAN IP, configures CORS, starts both):
```bash
./scripts/self-host.sh
```
- Access:
  - Frontend: http://<YOUR_LAN_IP>:5173
  - API:      http://<YOUR_LAN_IP>:3001
  - Health:   /health and /api/health

4) Run with Docker (optional)
- Ensure Docker Desktop is running.
- Export minimal env in your shell or set them in `.env` (root):
```bash
export OPENAI_API_KEY=sk-...
export CORS_ORIGIN=http://<YOUR_LAN_IP>:5173
```
- Start:
```bash
docker-compose up -d web-api web-frontend
```
- Stop:
```bash
docker-compose down
```

5) macOS firewall
- Allow incoming connections for Node/Docker (ports 3001 and 5173):
  - System Settings > Network > Firewall > Options > Add Node/Docker or allow when prompted.

6) Optional: internet access (port forwarding)
- On your router, forward:
  - TCP 5173 to <YOUR_LAN_IP>:5173 (frontend)
  - TCP 3001 to <YOUR_LAN_IP>:3001 (API)
- Security note: this exposes dev servers publicly. Prefer a reverse proxy with TLS (nginx, Caddy) and strong allowlists if needed.

7) Health checks
- API health:
  - `http://<YOUR_LAN_IP>:3001/health`
  - `http://<YOUR_LAN_IP>:3001/api/health`

8) Logs and troubleshooting
- API logs: visible in terminal (or `docker-compose logs web-api`)
- Front logs: browser console (frontend), terminal output
- If CORS errors occur, confirm `CORS_ORIGIN` matches `http://<YOUR_LAN_IP>:5173`
- If network unreachable, confirm firewall and that the client is started with `--host 0.0.0.0`

9) Upgrades and rollback
- Review `CHANGELOG.md` for changes
- Use `ROLLBACK.md` to revert if needed
- For local changes, create a new branch and PR; CI will validate lint/build

10) Secrets and safety
- Never commit secrets (keys, tokens). `.env` files are git‑ignored.
- Rotate keys if exposed; use `server/.env` for local storage only.

11) Bot (optional)
- The Discord bot is not required for the web app to run.
- Bot docs are under `discord-bot/`. Launch scripts and requirements are provided there.

That’s it. Keep it simple: one machine hosts both services; others connect via your LAN IP.
