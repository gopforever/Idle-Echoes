# Melvor EQ2 — Idle Echoes

A browser-based idle RPG that blends the incremental mechanics of [Melvor Idle](https://www.melvoridle.com/) with the lore and world of [EverQuest 2](https://www.everquest2.com/). Progress passively, craft gear, fight monsters, and explore a persistent world — all in your browser.

🌐 **Live:** [https://idle-echoes-api-server.vercel.app](https://idle-echoes-api-server.vercel.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript |
| Backend | Express 5 |
| Frontend | React + Vite |
| Database | PostgreSQL + Drizzle ORM |
| Styles | Tailwind CSS v4 |

---

## Repository Structure

```
Idle-Echoes/
├── artifacts/
│   ├── api-server/     # Express 5 REST API (deployed to Vercel)
│   └── melvor-eq2/     # React + Vite frontend (deployed to Vercel)
└── lib/                # Shared TypeScript libraries
```

---

## Getting Started Locally

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# Install all dependencies
pnpm install

# Start all packages in development mode
pnpm run dev
```

The API server will start on `http://localhost:3000` and the frontend on `http://localhost:5173`.

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `develop` | Active development — all PRs target this branch |
| `main` | Production — merging here triggers a Vercel deploy |

Open all feature and fix PRs against `develop`. When ready to ship, merge `develop` → `main`.

