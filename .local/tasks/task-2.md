---
title: Deep Combat — AA, enemy abilities, status effects, visual overhaul
---
# Deep Combat Overhaul — Stats, AA, Enemy Abilities

  ## What & Why

  The current combat system has basic auto-attack math but ignores Alternate Advancement nodes, gives enemies no personality (they just auto-attack), and has a minimal frontend. This task wires together all existing systems — AA tree, ability definitions, damage type data — into a fully EQ2-accurate combat simulation and rebuilds the combat UI to surface every calculation in real-time.

  ## Done looks like

  - **AA affects every fight**: Critical chance, avoidance, mitigation, double-attack proc, crit bonus damage, and spell potency bonuses from invested AA nodes are computed each tick and shown as glowing badges when they fire
  - **Enemies have special abilities**: Each enemy type has 1–3 unique abilities (Rabid Wolf bleeds, Gnoll Warrior frenzies at 50% HP, Lord Nagafen breathes fire every 6 ticks). A scrollable enemy ability list is visible in the enemy selection panel before engaging
  - **Status effects are visible**: Active bleed/stun/slow/buff/drain icons with tick-countdown appear beneath each fighter's HP bar; DoT damage and HoT healing are logged separately with their own colors
  - **Floating damage numbers**: Every hit, crit, heal, miss, or resist spawns a number that flies upward and fades over the combatant's portrait — crits are large yellow, normal hits green (player) or red (enemy), heals emerald "+N", misses slate "Evade"
  - **Live combat stat panel**: A compact real-time breakdown in the arena shows Attack Rating vs Enemy Defense Rating, Mitigation%, Avoidance%, Power Regen per tick, and active AA bonuses — color-coded green if player has an edge, red if not
  - **Enhanced ability bar**: Each ability card shows a circular cooldown countdown overlay; abilities boosted by invested AA nodes display a subtle indicator
  - **Power regeneration**: Wisdom-based power regen each tick; power bar climbs visibly between ability uses
  - **Damage types and resistances**: Abilities and auto-attacks carry a damage type (pierce, slash, crush, heat, cold, divine); enemies have per-type resistance percentages that reduce incoming damage and are logged in the combat feed

  ## Out of scope

  - PvP or party-based combat
  - New zones or enemies beyond what already exists
  - Inventory item crafting
  - Any non-combat systems (skills, factions, shop)

  ## Tasks

  1. **AA bonus engine** — Write a `applyAABonuses(investedNodes)` function in `eq2Formulas.ts` that reads each invested AA node's `effect` type and `currentRank` and returns a modifier object covering: crit_chance, avoidance, mitigation, double_attack chance, extra_attack_chance, crit_bonus, spell_damage, spell_crit_chance, max_hp percent, backstab_damage, cooldown_reduction, and power_cost_reduction. Wire this into the tick handler so every computed player stat includes AA contributions.

  2. **Enemy abilities and resistances** — Add an `EnemyAbility` interface and `resistances` object to the `Enemy` type in `gameData.ts`. Populate each of the 17 existing enemies with 1–3 abilities (bleed, burst hit, fear, dragon breath, stun, shield bash, life drain, frenzy, absorb) with trigger types (every_n_ticks, percent_hp threshold, on_hit_proc chance) and resistances matching their monster type (undead = divine resist, elemental = heat/cold partial immunity, beast = pierce weakness, humanoid = balanced).

  3. **Status effects and power regen in the tick engine** — Add `playerStatusEffects` and `enemyStatusEffects` JSONB columns to `combat_state` in the DB schema. In the tick handler: load AA nodes, apply bonuses, regenerate power (wisdom × 0.2 per tick), process active status effect ticks (deal DoT damage, decrement durations, expire effects), check and fire enemy abilities based on their trigger conditions, handle double-attack AA procs (extra auto-attack roll if proc fires), and include all the above in the tick response as structured data (`playerStatusEffects`, `enemyStatusEffects`, `aaProcs`, `powerAfter`, `powerRegen`).

  4. **Frontend combat overhaul** — Rebuild `combat.tsx` with: (a) floating damage number overlay using framer-motion absolute-position elements that animate upward; (b) status effect badge rows under each HP bar; (c) live combat stat mini-panel in the arena header showing key derived stats vs enemy; (d) AA proc flash badge ("DOUBLE ATTACK!", "CRIT BONUS!") that fades in 1 second; (e) enhanced ability bar with circular cooldown sweep overlays and power-cost indicators; (f) enemy ability list in the EnemyCard expanded view with icons and descriptions.

  ## Relevant files

  - `artifacts/api-server/src/lib/eq2Formulas.ts`
  - `artifacts/api-server/src/lib/gameData.ts:43-65,594-801`
  - `artifacts/api-server/src/routes/combat.ts`
  - `artifacts/api-server/src/routes/aa.ts`
  - `artifacts/api-server/src/lib/eq2Data.ts`
  - `artifacts/melvor-eq2/src/pages/combat.tsx`
  - `lib/db/src/schema/combat.ts`