          } else if (ability.effectType === "damage_burst") {
            let burstDmg = Math.max(1, Math.floor(ability.effectValue * (1 - Math.min(0.75, (playerStats.mitigation + aaBonuses.dmgReduction) / 100))));
            // Apply player resistance for this damage type (capped at 50%), mirroring the scheduled damage_burst path
            const burstDmgType = ability.damageType ?? "slash";
            const burstResistPct = Math.min(50, playerStats.resistances[burstDmgType] ?? 0);
            const burstResistAmt = Math.floor(burstDmg * burstResistPct / 100);
            if (burstResistAmt > 0) {
              burstDmg = Math.max(1, burstDmg - burstResistAmt);
              floatEvents.push({ value: burstResistAmt, type: "resist" });
            }
            const procHpBefore = playerHp;
            playerHp = Math.max(0, playerHp - burstDmg);
            // Track as lethal source if this on-hit proc kills the player
            if (enemy.isBoss && procHpBefore > 0 && playerHp <= 0) lastEnemyAbilityUsedId = ability.id;
            enemyDamageDealt += burstDmg;
            floatEvents.push({ value: burstDmg, type: "enemy" });
            const burstResistText = burstResistAmt > 0 ? ` (${burstResistAmt} resisted)` : "";
            procMsg = `💥 ${enemy.name} procs ${ability.name}! ${burstDmg} bonus damage!${burstResistText}`;
          }