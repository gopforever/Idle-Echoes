---
title: WoW-Style Gear Score — Slot Weights
---
# WoW-Style Gear Score — Slot Weights

## What & Why
The current Gear Score formula treats every equipped slot identically: `item.level × rarityMultiplier`. In the real GearScore addon (and WoW's own design), a weapon contributes several times more to GS than a ring or earring. This task upgrades the formula to a slot-weighted system so a character's weapon quality has a meaningful impact on GS, jewelry is minor, and overall GS better represents actual combat power.

## Done looks like
- The character sheet and dungeon page both show the same GS value — and it now correctly reflects that equipping a high-level weapon dramatically raises GS while upgrading a ring has a smaller effect.
- Each item tooltip and paperdoll badge already shows per-item GS; after this change those badges will show the slot-weighted value (e.g. a level-20 rare sword shows ~200 GS contribution while a level-20 rare ring shows ~40).
- Weapons (primary, secondary, ranged) produce visibly higher individual GS contributions than armor, which in turn beats jewelry.
- Dungeon GS gates and badge color thresholds are recalibrated so the existing progression pace is preserved (normal ≈ no requirement; expert ≈ starter uncommon gear; legendary ≈ rare gear; mythical ≈ legendary/fabled gear).

## Out of scope
- Adding new gear slots or changing how gear is equipped.
- Changing rarity multiplier values.
- Changing how GS is displayed structurally (tooltip layout, badge placement). Only the numerical values change.

## Tasks
1. **Add `SLOT_GS_WEIGHT` constants and update `computeGearScore`** — Define slot weights in `eq2Formulas.ts` (weapons ≈ 2.5×, body armor ≈ 1.25×, standard armor slots ≈ 1.0×, accessories ≈ 0.75×, jewelry ≈ 0.5×). Update the primary `computeGearScore(gear: Record<slot, itemId>)` signature to look up each item's weight by slot key. Update the legacy array signature to accept an optional `slot` field and fall back to weight 1.0 when slot is absent. Export `SLOT_GS_WEIGHT` so the frontend can use it directly.

2. **Update per-item GS calculation in `ItemIcon`** — The component currently has a local `computeItemGS(level, rarity)` duplicate that doesn't use slot weights. Replace it with the exported `RARITY_GS_MULTIPLIER` + `SLOT_GS_WEIGHT` lookup using `item.slot` (which is always present on equippable items) so tooltip/badge GS values match the server formula exactly.

3. **Recalibrate `DUNGEON_GS_GATE` and UI color thresholds** — After the formula change, compute realistic GS ranges for each progression tier (look at starter common gear at level 1–5, uncommon at level 5–10, rare at level 15–25, legendary/fabled at level 30–50) and set gate values that preserve the existing unlock pacing. Update the color-coded GS badge breakpoints in the character sheet and dungeon pages to match the new scale.

## Relevant files
- `artifacts/api-server/src/lib/eq2Formulas.ts:315-369`
- `artifacts/melvor-eq2/src/components/game/item-icon.tsx`
- `artifacts/melvor-eq2/src/pages/character.tsx:979-996`
- `artifacts/melvor-eq2/src/pages/dungeons.tsx:93-133,453,481`
- `lib/api-client-react/src/generated/api.schemas.ts`