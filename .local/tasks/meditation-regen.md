# Meditation Skill & Out-of-Combat Regen

## What & Why

Currently HP and Power (mana) do not recover when the player is not fighting — they stay frozen at whatever value they were at when combat ended. There is also no way to actively speed up recovery. This makes the flow between combat sessions feel punishing and removes a classic idle-RPG "downtime" loop.

The fix has two parts:
- **Passive regen**: HP and Power slowly tick back up whenever the player is not in an active combat session.
- **Meditate action**: A dedicated button the player can press to enter a Meditating state, which greatly accelerates both HP and Power recovery. Meditating improves a new `Meditation` skill over time — higher Meditation levels increase the regen rate per tick.

## Done looks like

- After combat ends, the player's HP and Power bars visibly refill over time without any action from the player (passive regen every ~3 seconds).
- A "Meditate" button (or toggle) appears on the character page / out-of-combat view. Pressing it activates a meditating state with noticeably faster regen per tick.
- A `Meditation` entry appears in the Skill Snapshot section alongside Combat, Defense, etc. and levels up as the player meditates.
- Higher Meditation skill level produces a visibly faster regen rate (the per-tick regen formula scales with skill level).
- Entering a new combat session automatically cancels the meditating state.

## Out of scope

- In-combat regen changes (power regen in combat is already implemented)
- New UI page for meditation; the button lives in the existing character or sidebar area
- Party/group meditation buffs

## Tasks

1. **Add Meditation skill to the data and DB seed** — Add a `meditation` entry to `INITIAL_SKILLS` in `gameData.ts` (category: "combat", `xpPerHour: 0`, icon, description). The skill is seeded for all existing and new characters via the existing `ensureSkills` helper in the character creation flow.

2. **Passive regen endpoint** — Add a `POST /character/regen` endpoint (or extend an existing polling endpoint) that calculates elapsed time since last call, then restores a small amount of HP and Power per second of idle time (base rate scales with Wisdom / Stamina stats). Cap at max HP/Power. The client calls this endpoint on a ~3s interval whenever the player is not in active combat.

3. **Meditation state and accelerated regen** — Add a `isMeditating` boolean to the character settings (alongside existing `autoHeal`/`autoLoop` flags). When `true`, the regen endpoint applies a multiplier based on the player's current Meditation skill level (e.g., `1 + meditationLevel * 0.05`). Each regen tick while meditating awards Meditation skill XP. Use the `addSkillXp` helper from Task #20 (or an equivalent inline upsert) to write XP to the `skillsTable`.

4. **Meditate button UI** — On the character page (and/or the sidebar), show a "Meditate" toggle button when the player is not in active combat. Pressing it calls `POST /character/settings` to set `isMeditating: true`; pressing again (or entering combat) sets it back to `false`. Show a pulsing or animated indicator while meditating, and display the current regen-per-tick rate.

## Relevant files

- `artifacts/api-server/src/routes/character.ts`
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/melvor-eq2/src/pages/character.tsx`
- `lib/db/src/schema/gamestate.ts`
- `lib/db/src/schema/skills.ts`
