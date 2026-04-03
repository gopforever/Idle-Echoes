---
title: Deep Character Sheet — 5-tab MMO reference panel
---
# Deep Character Sheet Overhaul

  ## What & Why
  The Character page is currently a thin 201-line placeholder with a paper doll, 6 base stats, and 9 combat stats in plain lists. As the game deepens — higher levels, more gear, AA investment, faction standings, skill training — players need a single authoritative place to understand every number about their character: where each stat comes from, what their race and class mean mechanically, their full skill tree, all faction relationships, and a career profile. This task rebuilds the page into a tabbed reference sheet worthy of an MMO.

  ## Done looks like
  - Character page has 5 tabs: Overview, Attributes, Lore, Progression, Profile
  - **Overview**: Full identity banner (portrait placeholder, race/class/archetype/alignment/zone badges, level + XP bar, gold, K/D, playtime), paper doll with 14 labeled gear slots arranged around a character silhouette, active mount display, and a compact "at a glance" combat stat summary
  - **Attributes**: Each of the 6 primary stats (STR/AGI/STA/INT/WIS/CHA) shown with a multi-source breakdown bar: Base → + Race bonus → + Class bonus → + Gear bonus → Total, with tooltips explaining what each stat drives. Below: all derived combat stats (attack rating, defense, mitigation, avoidance, crit %, crit bonus, haste, DPS, spell crit, weapon damage range) grouped into Offense / Defense / Spells / Vitals sections with color-coded values
  - **Lore**: Race card with portrait placeholder, full lore paragraph, racial ability displayed as a glowing ability card, racial stat bonus grid (showing +/- values for all 6 stats), starting zone, allowed alignments. Class card with lore text, archetype → subclass → class progression chain, role and armor type badges, class stat bonuses, and a full scrollable ability list showing each ability's icon, name, type (Combat Art / Spell / Heroic Art / Proc), damage type, power cost, cooldown, level required, and description
  - **Progression**: Skills grouped by category (Combat, Gathering, Crafting, Support) each with a labeled XP bar showing level and progress. All faction standings as a list with standing bars and standing title (Ally/Amiable/Indifferent/etc) plus perks. AA summary (points available, spent, total) with a mini node breakdown. Achievement completion counter (X of 30)
  - **Profile**: Career stats panel: total kill count, death count, K/D ratio, total gold ever earned, active zone, total play time formatted as hours/minutes, Heroic Opportunity completions. Visual "card" layout so it reads like an in-game profile pane

  ## Out of scope
  - Editing character name or appearance (read-only sheet)
  - Gear comparison from this page (handled by Inventory page)
  - Clicking abilities to cast them
  - Any new database tables or schema changes

  ## Tasks
  1. **Backend: /api/character/profile endpoint** — Add a new route that returns the character record merged with its matching race definition and class definition from eq2Data (lore, bonuses, racialAbility, racial stat grid, class lore, abilities list, armorType, role, primaryStat, subclassOf). Also include a stat breakdown object for each primary stat showing base/race/class/total components and the heroicState completions count.

  2. **Frontend: 5-tab character sheet** — Rewrite character.tsx using a tab component. Overview tab shows the identity header, paper doll, and quick stat summary. Attributes tab shows each primary stat with a source breakdown bar and all derived combat stats in grouped sections. Lore tab shows the race card and class card with full lore text, racial ability, archetype chain, and scrollable ability list. Progression tab shows skills by category, all faction standings, and achievement/AA counts. Profile tab shows the career stats panel.

  3. **Frontend: Stat source breakdown** — For each of the 6 primary stats, compute the breakdown on the frontend using the profile endpoint data (base = total minus race bonus minus class bonus; show each source as a labeled colored segment). Display negative bonuses in red, positive in green.

  ## Relevant files
  - `artifacts/melvor-eq2/src/pages/character.tsx`
  - `artifacts/api-server/src/routes/character.ts`
  - `artifacts/api-server/src/lib/eq2Data.ts:1-140`
  - `artifacts/api-server/src/lib/eq2Data.ts:124-500`
  - `artifacts/api-server/src/routes/heroic.ts`