# Multi-User Accounts & Character Selection

  ## What & Why
  Add a username/password authentication system so multiple people can play. Each account holds up to 3 characters. Players can log out and switch between their characters on a character selection screen.

  ## Done looks like
  - A login/register screen is shown to anyone who isn't logged in
  - After login, a character selection screen shows the player's characters (up to 3) and a "Create new character" button (disabled at 3)
  - Selecting a character loads the game as that character
  - A logout button in the game header returns the player to the login screen
  - All game state (inventory, skills, combat, etc.) is correctly scoped to the active character
  - The leaderboard continues to work publicly for all characters from all accounts
  - Any existing character data is preserved (assigned to a seed account on migration)

  ## Out of scope
  - Email verification, password reset, or OAuth (username + password only)
  - Admin account management UI
  - Account deletion

  ## Tasks

  1. **Database: users table + character ownership** — Create a `users` table (id, username, password_hash, created_at). Add a nullable `user_id` FK column to `characters`. Add SQL migration file `0011_user_accounts.sql`. Any existing characters without a user get assigned to a default seed account.

  2. **Auth API routes** — Add `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me` routes. Install `express-session` and `bcrypt`, configure session middleware in `app.ts` using the existing `SESSION_SECRET` env var. Store `userId` and `activeCharacterId` in the session.

  3. **Character selection API** — Add `GET /auth/characters` (list all characters for the logged-in user) and `POST /auth/select-character/:id` (set active character in session). Update `creation.ts` so creating a new character: requires login, enforces the 3-character cap, links the character to the user, and does NOT wipe other characters. Update `getOrCreateCharacter()` to read `req.session.activeCharacterId`.

  4. **Auth middleware + route protection** — Add an `authMiddleware` that returns 401 on unauthenticated requests to game routes. Apply it to all existing game routes. Leaderboard routes remain public.

  5. **Login/Register/Character-Select UI** — Add Login and Register pages to the main game app. After login, show a Character Selection screen with class/level info, a "Play" button per character, and a "Create New Character" button (disabled at 3). Add a Logout button to the game header.

  ## Relevant files
  - `lib/db/src/schema/character.ts`
  - `lib/db/src/schema/index.ts`
  - `lib/db/drizzle/0009_gathering.sql`
  - `artifacts/api-server/src/app.ts`
  - `artifacts/api-server/src/routes/character.ts`
  - `artifacts/api-server/src/routes/creation.ts`
  - `artifacts/api-server/src/routes/index.ts`
  - `artifacts/melvor-eq2/src/App.tsx`
  - `artifacts/melvor-eq2/src/pages/creation.tsx`
  