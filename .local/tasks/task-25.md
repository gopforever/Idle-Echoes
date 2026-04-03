---
title: Bank & Item Storage System
---
# Bank & Item Storage System

## What & Why
Players have no place to store items beyond their 40-slot inventory. A bank provides unlimited permanent storage for items and coin, modeled after EQ2's shared bank vault. Items deposited in the bank are safe, searchable, and withdrawable any time outside of combat.

## Done looks like
- A "Bank" entry appears in the sidebar navigation.
- The Bank page has two tabs: "Items" (stored items) and "Gold" (deposited coin).
- Players can deposit items from their inventory into the bank by clicking "Deposit" on any item in the inventory page (new button alongside Sell/Use).
- Players can withdraw items from the bank back to their inventory (subject to the 40-slot inventory cap).
- Players can deposit and withdraw gold in custom amounts, with current balances shown for both wallet and bank.
- Items in the bank display their icon, name, quantity, and rarity border (same visual style as inventory). A search bar filters items by name.
- The bank has no slot limit — it is intended as permanent overflow storage.
- Depositing/withdrawing is blocked during active combat.

## Out of scope
- Bank tabs or multiple vault sections
- Shared bank across characters
- Auction House integration

## Tasks
1. **Bank DB schema and migration** — Add a `bank_items` table (itemId, itemData jsonb, quantity, createdAt) and a `bank_gold` integer column on the characters table (default 0). Run schema push.

2. **Bank API routes** — Implement `GET /bank` (list items + gold balance), `POST /bank/deposit-item` (move item from inventory to bank), `POST /bank/withdraw-item` (move item from bank to inventory, checking 40-slot cap), `POST /bank/deposit-gold` (amount), `POST /bank/withdraw-gold` (amount). All routes block while `combatState.active`.

3. **Bank page UI** — Create a new Bank page with two tabs (Items / Gold). Items tab shows a searchable grid of stored items with icon, name, quantity, rarity border, and a Withdraw button. Gold tab shows wallet vs bank balances with a deposit/withdraw input field.

4. **Deposit button in inventory** — Add a "Bank" (deposit) button to inventory items so players can send items directly from inventory to the bank without leaving the page.

5. **Sidebar navigation entry** — Add Bank to the sidebar navigation between Inventory and Skills (or at the bottom of the character section).

## Relevant files
- `lib/db/src/schema/combat.ts`
- `lib/db/src/schema/character.ts`
- `artifacts/api-server/src/routes/inventory.ts`
- `artifacts/api-server/src/index.ts`
- `artifacts/melvor-eq2/src/pages/inventory.tsx`
- `artifacts/melvor-eq2/src/components/layout/sidebar.tsx`
- `artifacts/melvor-eq2/src/App.tsx`