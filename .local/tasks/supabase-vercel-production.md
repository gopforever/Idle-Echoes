# Supabase Realtime + Vercel Production Deployment

## What & Why
Migrate the database to Supabase Pro for real-time subscriptions and enterprise-grade PostgreSQL, then deploy the frontend to Vercel Pro for global CDN and the API as a production Express server. This turns the game into a true persistent world anyone can access at a stable public URL, with live ghost player activity pushed to all connected clients simultaneously.

## Done looks like
- The game database is running on Supabase — all existing data and schema migrated without data loss
- Ghost player world events push to all connected browser clients in real-time via Supabase Realtime (no polling needed for the World page — it updates instantly as ghosts act)
- The combat log on the combat page also updates via Realtime subscriptions so future multiplayer additions are unblocked
- The frontend is deployed to Vercel and accessible at a public `.vercel.app` URL (or custom domain if configured)
- The Express API server is deployed and publicly accessible, with the Vercel frontend configured to point at it
- Environment variables (DATABASE_URL → Supabase, SESSION_SECRET, AI integration keys) are correctly set in both environments
- A public World API is documented and accessible: `GET /api/world/players`, `GET /api/world/events`, `GET /api/world/leaderboard` — these work from any external HTTP client without auth
- CORS is configured to allow both the Vercel frontend domain and `localhost` for development

## Out of scope
- Full multiplayer (two real players in the same zone) — ghost players only for now
- Supabase Auth (using existing session-based auth approach)
- Custom domain setup (Vercel `.vercel.app` domain is sufficient)
- Database Row Level Security policies (single-player + ghost data, no multi-tenant risk yet)

## Tasks
1. **Supabase database migration** — Create connection in Supabase Pro project. Update `DATABASE_URL` environment variable to point at the Supabase PostgreSQL connection string (using the direct connection, not the pooler, for Drizzle compatibility). Run `pnpm --filter @workspace/db run push` against Supabase to apply all existing migrations. Verify all tables (characters, combat_state, world_players, world_events, quests, etc.) exist and have correct structure.

2. **Supabase Realtime integration** — Install `@supabase/supabase-js` in the frontend package. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables. Replace the 10-second polling on the World page with a Supabase Realtime subscription to the `world_events` table (`INSERT` events). Replace the combat log polling with a Realtime subscription to the `combat_log` table. Ensure the API server enables Realtime replication on the relevant tables via SQL (ALTER TABLE ... REPLICA IDENTITY FULL).

3. **API server production config** — Add CORS configuration that allows the Vercel frontend domain and `localhost:5173`. Ensure all environment variables are read from `process.env` with clear error messages if missing. Add a health check endpoint (`GET /api/health`) that returns DB connection status. Make the server bind to `0.0.0.0` and respect the `PORT` environment variable for production hosting.

4. **Vercel frontend deployment** — Add `vercel.json` to the `artifacts/melvor-eq2` directory configuring it as a single-page app (all routes serve `index.html`). Add `VITE_API_BASE_URL` environment variable wiring so the frontend points at the production API server URL instead of a relative path. Build the frontend with `pnpm --filter @workspace/melvor-eq2 run build` and verify the output is deployable. Document the Vercel project settings (build command, output directory, environment variables).

5. **Public World API documentation** — Add a `GET /api/world/docs` endpoint (or serve a minimal OpenAPI JSON) describing the public world API endpoints. Ensure these endpoints work with no authentication required: world players, events, leaderboard, and individual ghost player profiles. Add appropriate rate limiting (100 req/min per IP) using a lightweight middleware.

## Relevant files
- `lib/db/src/schema/index.ts`
- `lib/db/drizzle.config.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/melvor-eq2/src/pages/combat.tsx`
- `artifacts/melvor-eq2/vite.config.ts`
- `artifacts/melvor-eq2/package.json`
- `artifacts/api-server/src/index.ts`
