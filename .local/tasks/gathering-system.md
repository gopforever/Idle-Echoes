# Gathering System — Skills, Nodes & Achievements

## What & Why
Mining, Woodcutting, Fishing, and Herbalism exist as skill entries but have no actual gameplay loop — players can't meaningfully interact with them. This task builds the full gathering experience: resource nodes tied to each gathering skill, skill level controlling what you can gather and your chances of bonus yields and rare resources, and a set of achievements to reward progression milestones. Higher skill means more resources per gather tick and better odds of pulling rare materials.

## Done looks like
- A dedicated "Gathering" page (or expanded section in the Skills page) lists resource nodes for each gathering skill (Mining: ore veins; Woodcutting: log types; Fishing: fish species; Herbalism: herb plants).
- Each node shows the player's current skill level vs. the level required to unlock it.
- Clicking "Gather" (or toggling auto-gather) starts a timer. On completion, the server awards items to inventory — quantity and rarity influenced by skill level.
- At skill levels ≥ 25, 50, 75, 100 the yield bonus and rare-tier chance increase noticeably (e.g., skill 25 = +10% bonus yield, skill 50 = +25%, etc.).
- Rare resource chance: low-skill gathers produce only common materials; high-skill gathers can occasionally yield uncommon/rare variants (e.g., Mithril Ore at Mining 75, Ancient Timber at Woodcutting 80).
- Gathering awards XP to the corresponding skill (Mining XP for mining, etc.), not just the flat idle XP the system already has.
- A set of gathering achievements is added (e.g., "First Ore" at 1 Mining gather, "Master Miner" at Mining level 100, "10,000 Resources Gathered" total), displayed on the Achievements page under a "Gathering" category.
- Ghost players (NPCs) participate in gathering during their simulation ticks, producing materials that flow into their inventories and auction listings.

## Out of scope
- Clickable resource nodes on a world map (all gathering stays timer/idle-based).
- Player-to-player resource trading (Auction Hall handles sales).
- Crafting queue changes (separate task).

## Tasks
1. **Gathering data** — Define resource node tables in `gameData.ts`: each gathering skill maps to 8–12 nodes (e.g., Copper Vein lv1, Iron Vein lv20, Mithril Vein lv75) each with a `skillRequired`, base `gatherTime`, base `quantity` range, and a `rareItem` entry that drops at a skill-scaled probability.

2. **Gathering backend** — Add a `POST /gathering/start` and `GET /gathering/status` API. On start, record `gatheringSkill`, `nodeId`, and `startedAt` in a new `gathering_session` table (or in the character's JSONB state). On status poll (or via a tick endpoint), evaluate completions: award the correct items to inventory, give skill XP, and apply the yield/rare-chance formula. Yield bonus: `base + floor(skillLevel / 25) * 0.1` multiplied on quantity. Rare item chance: `0` at skill < 50, `(skillLevel - 50) * 0.5%` above that, capped at 15%.

3. **Gathering page UI** — Build a new "Gathering" page (route `/gathering`) that groups nodes by skill (Mining, Woodcutting, Fishing, Herbalism). Each node card shows the resource icon, level requirement, gather time, expected yield/hr, and a Lock icon if the player's skill is too low. A "Gather" toggle starts/stops auto-gather for that node. The active node shows a progress bar counting down. Only one node can be active at a time per skill; gathering multiple skills simultaneously is allowed.

4. **Yield & rare chance display** — On each node card, show a stat breakdown: base yield, your current bonus yield %, and (if skill ≥ 50) the rare item chance %. This makes the skill progression feel rewarding and tangible.

5. **Gathering achievements** — Add ~12 achievements in the "Gathering" category: first gather per skill (4), skill milestones at level 50 and 100 per skill (8 more), and a total cumulative gather count milestone (e.g., 10,000 resources). Wire these into the existing achievement check system so they trigger automatically and appear on the Achievements page.

6. **Ghost gathering simulation** — In the ghost simulator tick, have each ghost pick a gathering node matching their personality (Scholarly → Herbalism, Greedy → Mining, Explorer → any) and award that ghost random gathering loot using the same yield formula scaled to their ghost level.

## Relevant files
- `artifacts/api-server/src/lib/gameData.ts`
- `artifacts/api-server/src/lib/ghostSimulator.ts`
- `artifacts/api-server/src/routes/skills.ts`
- `artifacts/api-server/src/routes/achievements.ts`
- `artifacts/api-server/src/routes/inventory.ts`
- `artifacts/melvor-eq2/src/pages/skills.tsx`
- `lib/db/src/schema/character.ts`
- `lib/db/src/schema/skills.ts`
