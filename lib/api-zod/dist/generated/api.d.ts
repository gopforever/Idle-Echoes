/**
 * @summary Health check
 */
export declare const HealthCheckResponse: any;
/**
 * @summary Get character state
 */
export declare const GetCharacterResponse: any;
/**
 * @summary Update character state
 */
export declare const UpdateCharacterBody: any;
export declare const UpdateCharacterResponse: any;
/**
 * @summary Get computed character stats (EQ2 formulas)
 */
export declare const GetCharacterStatsResponse: any;
/**
 * @summary Update combat settings (auto-loop, auto-heal, meditation)
 */
export declare const UpdateCombatSettingsBody: any;
export declare const UpdateCombatSettingsResponse: any;
/**
 * @summary Apply passive and meditation-boosted out-of-combat HP/Power regen
 */
export declare const ApplyRegenResponse: any;
/**
 * @summary Get available races and classes for character creation
 */
export declare const GetCreationOptionsResponse: any;
/**
 * @summary Create a new character (resets game)
 */
export declare const CreateCharacterBody: any;
export declare const CreateCharacterResponse: any;
/**
 * @summary Get current combat state
 */
export declare const GetCombatStateResponse: any;
/**
 * @summary Start combat with enemy
 */
export declare const StartCombatBody: any;
export declare const StartCombatResponse: any;
/**
 * @summary Stop combat
 */
export declare const StopCombatResponse: any;
/**
 * @summary Advance combat by one tick and get result
 */
export declare const TickCombatResponse: any;
/**
 * @summary Get recent combat log entries
 */
export declare const GetCombatLogResponseItem: any;
export declare const GetCombatLogResponse: any;
/**
 * @summary Get character's class abilities with cooldown status
 */
export declare const GetAbilitiesResponseItem: any;
export declare const GetAbilitiesResponse: any;
/**
 * @summary Manually activate an ability (if off cooldown)
 */
export declare const ActivateAbilityParams: any;
export declare const ActivateAbilityResponse: any;
/**
 * @summary Get current Heroic Opportunity chain state
 */
export declare const GetHeroicStateResponse: any;
/**
 * @summary Trigger a heroic opportunity step
 */
export declare const TriggerHeroicBody: any;
export declare const TriggerHeroicResponse: any;
/**
 * @summary Get player inventory
 */
export declare const GetInventoryResponse: any;
/**
 * @summary Equip an item to a gear slot
 */
export declare const EquipItemBody: any;
export declare const EquipItemResponse: any;
/**
 * @summary Unequip an item from a gear slot
 */
export declare const UnequipItemBody: any;
export declare const UnequipItemResponse: any;
/**
 * @summary Sell an item for gold
 */
export declare const SellItemBody: any;
export declare const SellItemResponse: any;
/**
 * @summary Get available adornments in inventory
 */
export declare const GetAdornmentsResponseItem: any;
export declare const GetAdornmentsResponse: any;
/**
 * @summary Apply an adornment to a gear slot
 */
export declare const ApplyAdornmentBody: any;
export declare const ApplyAdornmentResponse: any;
/**
 * @summary Get all character skills
 */
export declare const GetSkillsResponseItem: any;
export declare const GetSkillsResponse: any;
/**
 * @summary Toggle idle training for a skill
 */
export declare const ToggleSkillTrainingParams: any;
export declare const ToggleSkillTrainingResponse: any;
/**
 * @summary Get skill summary
 */
export declare const GetSkillsSummaryResponse: any;
/**
 * @summary Get item database
 */
export declare const GetItemsQueryParams: any;
export declare const GetItemsResponseItem: any;
export declare const GetItemsResponse: any;
/**
 * @summary Get a specific item
 */
export declare const GetItemParams: any;
export declare const GetItemResponse: any;
/**
 * @summary Get enemy database
 */
export declare const GetEnemiesQueryParams: any;
export declare const GetEnemiesResponseItem: any;
export declare const GetEnemiesResponse: any;
/**
 * @summary Get all zones with unlock status
 */
export declare const GetZonesResponseItem: any;
export declare const GetZonesResponse: any;
/**
 * @summary Travel to a zone
 */
export declare const TravelToZoneParams: any;
export declare const TravelToZoneResponse: any;
/**
 * @summary Get available crafting recipes
 */
export declare const GetCraftingRecipesResponseItem: any;
export declare const GetCraftingRecipesResponse: any;
/**
 * @summary Craft an item
 */
export declare const CraftItemBody: any;
export declare const CraftItemResponse: any;
/**
 * @summary Get merchant shop inventory
 */
export declare const GetShopItemsQueryParams: any;
export declare const GetShopItemsResponse: any;
/**
 * @summary Purchase an item from the shop
 */
export declare const BuyItemBody: any;
export declare const BuyItemResponse: any;
/**
 * @summary Get all achievements with completion status
 */
export declare const GetAchievementsResponseItem: any;
export declare const GetAchievementsResponse: any;
/**
 * @summary Get achievement completion summary
 */
export declare const GetAchievementsSummaryResponse: any;
/**
 * @summary Get all faction standings
 */
export declare const GetFactionsResponseItem: any;
export declare const GetFactionsResponse: any;
/**
 * @summary Get Alternate Advancement tree with spent points
 */
export declare const GetAATreeResponse: any;
/**
 * @summary Spend an AA point on a node
 */
export declare const SpendAAPointBody: any;
export declare const SpendAAPointResponse: any;
/**
 * @summary Get all collection sets with progress
 */
export declare const GetCollectionsResponseItem: any;
export declare const GetCollectionsResponse: any;
/**
 * @summary Get all mounts (owned and available to purchase)
 */
export declare const GetMountsResponseItem: any;
export declare const GetMountsResponse: any;
/**
 * @summary Equip a mount
 */
export declare const EquipMountParams: any;
export declare const EquipMountResponse: any;
/**
 * @summary Get all ghost/world players
 */
export declare const GetWorldPlayersResponseItem: any;
export declare const GetWorldPlayersResponse: any;
/**
 * @summary Get recent world events (living world feed)
 */
export declare const GetWorldEventsQueryParams: any;
export declare const GetWorldEventsResponseItem: any;
export declare const GetWorldEventsResponse: any;
/**
 * @summary Get player count per zone (ghosts + real player)
 */
export declare const GetWorldZonesResponseItem: any;
export declare const GetWorldZonesResponse: any;
/**
 * @summary Get top 10 by level then kill_count (ghosts + real player)
 */
export declare const GetWorldLeaderboardResponseItem: any;
export declare const GetWorldLeaderboardResponse: any;
/**
 * @summary Get aggregate world statistics
 */
export declare const GetWorldStatsResponse: any;
/**
 * @summary Generate a batch of AI quests for the current character
 */
export declare const GenerateQuestsResponseItem: any;
export declare const GenerateQuestsResponse: any;
/**
 * @summary Get all quests (active and completed)
 */
export declare const GetQuestsResponseItem: any;
export declare const GetQuestsResponse: any;
/**
 * @summary Mark a quest as completed and claim rewards
 */
export declare const CompleteQuestParams: any;
export declare const CompleteQuestResponse: any;
/**
 * @summary Get AI-generated NPC dialogue
 */
export declare const GetNpcDialogueBody: any;
export declare const GetNpcDialogueResponse: any;
/**
 * @summary Get AI-generated lore entry for the character
 */
export declare const GetCharacterLoreResponse: any;
/**
 * @summary Get AI-generated quote for a world/ghost player by ID
 */
export declare const GetWorldPlayerQuoteByIdParams: any;
export declare const GetWorldPlayerQuoteByIdResponse: any;
/**
 * @summary Get AI-generated quote for a world/ghost player by name
 */
export declare const GetWorldPlayerQuoteByNameParams: any;
export declare const GetWorldPlayerQuoteByNameResponse: any;
/**
 * @summary Get AI-generated boss narration (intro or death speech)
 */
export declare const GetBossNarrationParams: any;
export declare const GetBossNarrationQueryParams: any;
export declare const GetBossNarrationResponse: any;
/**
 * @summary Get overall game progress summary
 */
export declare const GetGameSummaryResponse: any;
//# sourceMappingURL=api.d.ts.map