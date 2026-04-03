import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AATree, Ability, AbilityActivationResult, Achievement, AchievementsSummary, Adornment, AdornmentResult, ApplyAdornmentRequest, BossNarrationResponse, BuyRequest, BuyResult, Character, CharacterLoreResponse, CharacterUpdate, Collection, CombatLogEntry, CombatSettings, CombatState, CombatTickResult, ComputedStats, CraftRequest, CraftResult, CraftingRecipe, CreateCharacterRequest, CreationOptions, Enemy, EquipRequest, Faction, GameSummary, GearSet, GetBossNarrationParams, GetEnemiesParams, GetItemsParams, GetShopItemsParams, GetWorldEventsParams, HealthStatus, HeroicState, HeroicTriggerRequest, HeroicTriggerResult, Inventory, Item, LeaderboardEntry, Mount, MountResult, NpcDialogueRequest, NpcDialogueResponse, PlayerQuoteResponse, Quest, QuestCompleteResult, RegenResult, SellItemRequest, SellResult, Shop, Skill, SkillsSummary, SpendAARequest, StartCombatRequest, TravelResult, UnequipRequest, WorldEvent, WorldPlayer, WorldStats, Zone, ZonePopulation } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get character state
 */
export declare const getGetCharacterUrl: () => string;
export declare const getCharacter: (options?: RequestInit) => Promise<Character>;
export declare const getGetCharacterQueryKey: () => readonly ["/api/character"];
export declare const getGetCharacterQueryOptions: <TData = Awaited<ReturnType<typeof getCharacter>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCharacter>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCharacterQueryResult = NonNullable<Awaited<ReturnType<typeof getCharacter>>>;
export type GetCharacterQueryError = ErrorType<unknown>;
/**
 * @summary Get character state
 */
export declare function useGetCharacter<TData = Awaited<ReturnType<typeof getCharacter>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update character state
 */
export declare const getUpdateCharacterUrl: () => string;
export declare const updateCharacter: (characterUpdate: CharacterUpdate, options?: RequestInit) => Promise<Character>;
export declare const getUpdateCharacterMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCharacter>>, TError, {
        data: BodyType<CharacterUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCharacter>>, TError, {
    data: BodyType<CharacterUpdate>;
}, TContext>;
export type UpdateCharacterMutationResult = NonNullable<Awaited<ReturnType<typeof updateCharacter>>>;
export type UpdateCharacterMutationBody = BodyType<CharacterUpdate>;
export type UpdateCharacterMutationError = ErrorType<unknown>;
/**
 * @summary Update character state
 */
export declare const useUpdateCharacter: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCharacter>>, TError, {
        data: BodyType<CharacterUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCharacter>>, TError, {
    data: BodyType<CharacterUpdate>;
}, TContext>;
/**
 * @summary Get computed character stats (EQ2 formulas)
 */
export declare const getGetCharacterStatsUrl: () => string;
export declare const getCharacterStats: (options?: RequestInit) => Promise<ComputedStats>;
export declare const getGetCharacterStatsQueryKey: () => readonly ["/api/character/stats"];
export declare const getGetCharacterStatsQueryOptions: <TData = Awaited<ReturnType<typeof getCharacterStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacterStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCharacterStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCharacterStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getCharacterStats>>>;
export type GetCharacterStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get computed character stats (EQ2 formulas)
 */
export declare function useGetCharacterStats<TData = Awaited<ReturnType<typeof getCharacterStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacterStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update combat settings (auto-loop, auto-heal)
 */
export declare const getUpdateCombatSettingsUrl: () => string;
export declare const updateCombatSettings: (combatSettings: CombatSettings, options?: RequestInit) => Promise<CombatSettings>;
export declare const getUpdateCombatSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCombatSettings>>, TError, {
        data: BodyType<CombatSettings>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateCombatSettings>>, TError, {
    data: BodyType<CombatSettings>;
}, TContext>;
export type UpdateCombatSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateCombatSettings>>>;
export type UpdateCombatSettingsMutationBody = BodyType<CombatSettings>;
export type UpdateCombatSettingsMutationError = ErrorType<unknown>;
/**
 * @summary Update combat settings (auto-loop, auto-heal)
 */
export declare const useUpdateCombatSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateCombatSettings>>, TError, {
        data: BodyType<CombatSettings>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateCombatSettings>>, TError, {
    data: BodyType<CombatSettings>;
}, TContext>;
export declare const getApplyRegenUrl: () => string;
/**
 * @summary Apply passive and meditation-boosted out-of-combat HP/Power regen
 */
export declare const applyRegen: (options?: RequestInit) => Promise<RegenResult>;
export declare const getApplyRegenMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyRegen>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyRegen>>, TError, void, TContext>;
export type ApplyRegenMutationResult = NonNullable<Awaited<ReturnType<typeof applyRegen>>>;
export type ApplyRegenMutationError = ErrorType<unknown>;
export declare const useApplyRegen: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyRegen>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyRegen>>, TError, void, TContext>;
/**
 * @summary Get available races and classes for character creation
 */
export declare const getGetCreationOptionsUrl: () => string;
export declare const getCreationOptions: (options?: RequestInit) => Promise<CreationOptions>;
export declare const getGetCreationOptionsQueryKey: () => readonly ["/api/creation/options"];
export declare const getGetCreationOptionsQueryOptions: <TData = Awaited<ReturnType<typeof getCreationOptions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCreationOptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCreationOptions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCreationOptionsQueryResult = NonNullable<Awaited<ReturnType<typeof getCreationOptions>>>;
export type GetCreationOptionsQueryError = ErrorType<unknown>;
/**
 * @summary Get available races and classes for character creation
 */
export declare function useGetCreationOptions<TData = Awaited<ReturnType<typeof getCreationOptions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCreationOptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new character (resets game)
 */
export declare const getCreateCharacterUrl: () => string;
export declare const createCharacter: (createCharacterRequest: CreateCharacterRequest, options?: RequestInit) => Promise<Character>;
export declare const getCreateCharacterMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCharacter>>, TError, {
        data: BodyType<CreateCharacterRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCharacter>>, TError, {
    data: BodyType<CreateCharacterRequest>;
}, TContext>;
export type CreateCharacterMutationResult = NonNullable<Awaited<ReturnType<typeof createCharacter>>>;
export type CreateCharacterMutationBody = BodyType<CreateCharacterRequest>;
export type CreateCharacterMutationError = ErrorType<unknown>;
/**
 * @summary Create a new character (resets game)
 */
export declare const useCreateCharacter: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCharacter>>, TError, {
        data: BodyType<CreateCharacterRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCharacter>>, TError, {
    data: BodyType<CreateCharacterRequest>;
}, TContext>;
/**
 * @summary Get current combat state
 */
export declare const getGetCombatStateUrl: () => string;
export declare const getCombatState: (options?: RequestInit) => Promise<CombatState>;
export declare const getGetCombatStateQueryKey: () => readonly ["/api/combat/state"];
export declare const getGetCombatStateQueryOptions: <TData = Awaited<ReturnType<typeof getCombatState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCombatState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCombatState>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCombatStateQueryResult = NonNullable<Awaited<ReturnType<typeof getCombatState>>>;
export type GetCombatStateQueryError = ErrorType<unknown>;
/**
 * @summary Get current combat state
 */
export declare function useGetCombatState<TData = Awaited<ReturnType<typeof getCombatState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCombatState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Start combat with enemy
 */
export declare const getStartCombatUrl: () => string;
export declare const startCombat: (startCombatRequest: StartCombatRequest, options?: RequestInit) => Promise<CombatState>;
export declare const getStartCombatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startCombat>>, TError, {
        data: BodyType<StartCombatRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof startCombat>>, TError, {
    data: BodyType<StartCombatRequest>;
}, TContext>;
export type StartCombatMutationResult = NonNullable<Awaited<ReturnType<typeof startCombat>>>;
export type StartCombatMutationBody = BodyType<StartCombatRequest>;
export type StartCombatMutationError = ErrorType<unknown>;
/**
 * @summary Start combat with enemy
 */
export declare const useStartCombat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof startCombat>>, TError, {
        data: BodyType<StartCombatRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof startCombat>>, TError, {
    data: BodyType<StartCombatRequest>;
}, TContext>;
/**
 * @summary Stop combat
 */
export declare const getStopCombatUrl: () => string;
export declare const stopCombat: (options?: RequestInit) => Promise<CombatState>;
export declare const getStopCombatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopCombat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof stopCombat>>, TError, void, TContext>;
export type StopCombatMutationResult = NonNullable<Awaited<ReturnType<typeof stopCombat>>>;
export type StopCombatMutationError = ErrorType<unknown>;
/**
 * @summary Stop combat
 */
export declare const useStopCombat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stopCombat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof stopCombat>>, TError, void, TContext>;
/**
 * @summary Advance combat by one tick and get result
 */
export declare const getTickCombatUrl: () => string;
export declare const tickCombat: (options?: RequestInit) => Promise<CombatTickResult>;
export declare const getTickCombatMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tickCombat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof tickCombat>>, TError, void, TContext>;
export type TickCombatMutationResult = NonNullable<Awaited<ReturnType<typeof tickCombat>>>;
export type TickCombatMutationError = ErrorType<unknown>;
/**
 * @summary Advance combat by one tick and get result
 */
export declare const useTickCombat: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof tickCombat>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof tickCombat>>, TError, void, TContext>;
/**
 * @summary Get recent combat log entries
 */
export declare const getGetCombatLogUrl: () => string;
export declare const getCombatLog: (options?: RequestInit) => Promise<CombatLogEntry[]>;
export declare const getGetCombatLogQueryKey: () => readonly ["/api/combat/log"];
export declare const getGetCombatLogQueryOptions: <TData = Awaited<ReturnType<typeof getCombatLog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCombatLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCombatLog>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCombatLogQueryResult = NonNullable<Awaited<ReturnType<typeof getCombatLog>>>;
export type GetCombatLogQueryError = ErrorType<unknown>;
/**
 * @summary Get recent combat log entries
 */
export declare function useGetCombatLog<TData = Awaited<ReturnType<typeof getCombatLog>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCombatLog>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get character's class abilities with cooldown status
 */
export declare const getGetAbilitiesUrl: () => string;
export declare const getAbilities: (options?: RequestInit) => Promise<Ability[]>;
export declare const getGetAbilitiesQueryKey: () => readonly ["/api/abilities"];
export declare const getGetAbilitiesQueryOptions: <TData = Awaited<ReturnType<typeof getAbilities>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAbilities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAbilities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAbilitiesQueryResult = NonNullable<Awaited<ReturnType<typeof getAbilities>>>;
export type GetAbilitiesQueryError = ErrorType<unknown>;
/**
 * @summary Get character's class abilities with cooldown status
 */
export declare function useGetAbilities<TData = Awaited<ReturnType<typeof getAbilities>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAbilities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Manually activate an ability (if off cooldown)
 */
export declare const getActivateAbilityUrl: (abilityId: string) => string;
export declare const activateAbility: (abilityId: string, options?: RequestInit) => Promise<AbilityActivationResult>;
export declare const getActivateAbilityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof activateAbility>>, TError, {
        abilityId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof activateAbility>>, TError, {
    abilityId: string;
}, TContext>;
export type ActivateAbilityMutationResult = NonNullable<Awaited<ReturnType<typeof activateAbility>>>;
export type ActivateAbilityMutationError = ErrorType<unknown>;
/**
 * @summary Manually activate an ability (if off cooldown)
 */
export declare const useActivateAbility: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof activateAbility>>, TError, {
        abilityId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof activateAbility>>, TError, {
    abilityId: string;
}, TContext>;
/**
 * @summary Get current Heroic Opportunity chain state
 */
export declare const getGetHeroicStateUrl: () => string;
export declare const getHeroicState: (options?: RequestInit) => Promise<HeroicState>;
export declare const getGetHeroicStateQueryKey: () => readonly ["/api/heroic/state"];
export declare const getGetHeroicStateQueryOptions: <TData = Awaited<ReturnType<typeof getHeroicState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHeroicState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getHeroicState>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetHeroicStateQueryResult = NonNullable<Awaited<ReturnType<typeof getHeroicState>>>;
export type GetHeroicStateQueryError = ErrorType<unknown>;
/**
 * @summary Get current Heroic Opportunity chain state
 */
export declare function useGetHeroicState<TData = Awaited<ReturnType<typeof getHeroicState>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getHeroicState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Trigger a heroic opportunity step
 */
export declare const getTriggerHeroicUrl: () => string;
export declare const triggerHeroic: (heroicTriggerRequest: HeroicTriggerRequest, options?: RequestInit) => Promise<HeroicTriggerResult>;
export declare const getTriggerHeroicMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerHeroic>>, TError, {
        data: BodyType<HeroicTriggerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerHeroic>>, TError, {
    data: BodyType<HeroicTriggerRequest>;
}, TContext>;
export type TriggerHeroicMutationResult = NonNullable<Awaited<ReturnType<typeof triggerHeroic>>>;
export type TriggerHeroicMutationBody = BodyType<HeroicTriggerRequest>;
export type TriggerHeroicMutationError = ErrorType<unknown>;
/**
 * @summary Trigger a heroic opportunity step
 */
export declare const useTriggerHeroic: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerHeroic>>, TError, {
        data: BodyType<HeroicTriggerRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerHeroic>>, TError, {
    data: BodyType<HeroicTriggerRequest>;
}, TContext>;
/**
 * @summary Get player inventory
 */
export declare const getGetInventoryUrl: () => string;
export declare const getInventory: (options?: RequestInit) => Promise<Inventory>;
export declare const getGetInventoryQueryKey: () => readonly ["/api/inventory"];
export declare const getGetInventoryQueryOptions: <TData = Awaited<ReturnType<typeof getInventory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInventory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getInventory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetInventoryQueryResult = NonNullable<Awaited<ReturnType<typeof getInventory>>>;
export type GetInventoryQueryError = ErrorType<unknown>;
/**
 * @summary Get player inventory
 */
export declare function useGetInventory<TData = Awaited<ReturnType<typeof getInventory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInventory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Equip an item to a gear slot
 */
export declare const getEquipItemUrl: () => string;
export declare const equipItem: (equipRequest: EquipRequest, options?: RequestInit) => Promise<GearSet>;
export declare const getEquipItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
        data: BodyType<EquipRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
    data: BodyType<EquipRequest>;
}, TContext>;
export type EquipItemMutationResult = NonNullable<Awaited<ReturnType<typeof equipItem>>>;
export type EquipItemMutationBody = BodyType<EquipRequest>;
export type EquipItemMutationError = ErrorType<unknown>;
/**
 * @summary Equip an item to a gear slot
 */
export declare const useEquipItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipItem>>, TError, {
        data: BodyType<EquipRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof equipItem>>, TError, {
    data: BodyType<EquipRequest>;
}, TContext>;
/**
 * @summary Unequip an item from a gear slot
 */
export declare const getUnequipItemUrl: () => string;
export declare const unequipItem: (unequipRequest: UnequipRequest, options?: RequestInit) => Promise<GearSet>;
export declare const getUnequipItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unequipItem>>, TError, {
        data: BodyType<UnequipRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof unequipItem>>, TError, {
    data: BodyType<UnequipRequest>;
}, TContext>;
export type UnequipItemMutationResult = NonNullable<Awaited<ReturnType<typeof unequipItem>>>;
export type UnequipItemMutationBody = BodyType<UnequipRequest>;
export type UnequipItemMutationError = ErrorType<unknown>;
/**
 * @summary Unequip an item from a gear slot
 */
export declare const useUnequipItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unequipItem>>, TError, {
        data: BodyType<UnequipRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof unequipItem>>, TError, {
    data: BodyType<UnequipRequest>;
}, TContext>;
/**
 * @summary Sell an item for gold
 */
export declare const getSellItemUrl: () => string;
export declare const sellItem: (sellItemRequest: SellItemRequest, options?: RequestInit) => Promise<SellResult>;
export declare const getSellItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sellItem>>, TError, {
        data: BodyType<SellItemRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sellItem>>, TError, {
    data: BodyType<SellItemRequest>;
}, TContext>;
export type SellItemMutationResult = NonNullable<Awaited<ReturnType<typeof sellItem>>>;
export type SellItemMutationBody = BodyType<SellItemRequest>;
export type SellItemMutationError = ErrorType<unknown>;
/**
 * @summary Sell an item for gold
 */
export declare const useSellItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sellItem>>, TError, {
        data: BodyType<SellItemRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sellItem>>, TError, {
    data: BodyType<SellItemRequest>;
}, TContext>;
/**
 * @summary Get available adornments in inventory
 */
export declare const getGetAdornmentsUrl: () => string;
export declare const getAdornments: (options?: RequestInit) => Promise<Adornment[]>;
export declare const getGetAdornmentsQueryKey: () => readonly ["/api/adornments"];
export declare const getGetAdornmentsQueryOptions: <TData = Awaited<ReturnType<typeof getAdornments>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdornments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAdornments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAdornmentsQueryResult = NonNullable<Awaited<ReturnType<typeof getAdornments>>>;
export type GetAdornmentsQueryError = ErrorType<unknown>;
/**
 * @summary Get available adornments in inventory
 */
export declare function useGetAdornments<TData = Awaited<ReturnType<typeof getAdornments>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAdornments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Apply an adornment to a gear slot
 */
export declare const getApplyAdornmentUrl: () => string;
export declare const applyAdornment: (applyAdornmentRequest: ApplyAdornmentRequest, options?: RequestInit) => Promise<AdornmentResult>;
export declare const getApplyAdornmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyAdornment>>, TError, {
        data: BodyType<ApplyAdornmentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyAdornment>>, TError, {
    data: BodyType<ApplyAdornmentRequest>;
}, TContext>;
export type ApplyAdornmentMutationResult = NonNullable<Awaited<ReturnType<typeof applyAdornment>>>;
export type ApplyAdornmentMutationBody = BodyType<ApplyAdornmentRequest>;
export type ApplyAdornmentMutationError = ErrorType<unknown>;
/**
 * @summary Apply an adornment to a gear slot
 */
export declare const useApplyAdornment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyAdornment>>, TError, {
        data: BodyType<ApplyAdornmentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyAdornment>>, TError, {
    data: BodyType<ApplyAdornmentRequest>;
}, TContext>;
/**
 * @summary Get all character skills
 */
export declare const getGetSkillsUrl: () => string;
export declare const getSkills: (options?: RequestInit) => Promise<Skill[]>;
export declare const getGetSkillsQueryKey: () => readonly ["/api/skills"];
export declare const getGetSkillsQueryOptions: <TData = Awaited<ReturnType<typeof getSkills>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSkills>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSkillsQueryResult = NonNullable<Awaited<ReturnType<typeof getSkills>>>;
export type GetSkillsQueryError = ErrorType<unknown>;
/**
 * @summary Get all character skills
 */
export declare function useGetSkills<TData = Awaited<ReturnType<typeof getSkills>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Toggle idle training for a skill
 */
export declare const getToggleSkillTrainingUrl: (skillId: string) => string;
export declare const toggleSkillTraining: (skillId: string, options?: RequestInit) => Promise<Skill>;
export declare const getToggleSkillTrainingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleSkillTraining>>, TError, {
        skillId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof toggleSkillTraining>>, TError, {
    skillId: string;
}, TContext>;
export type ToggleSkillTrainingMutationResult = NonNullable<Awaited<ReturnType<typeof toggleSkillTraining>>>;
export type ToggleSkillTrainingMutationError = ErrorType<unknown>;
/**
 * @summary Toggle idle training for a skill
 */
export declare const useToggleSkillTraining: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleSkillTraining>>, TError, {
        skillId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof toggleSkillTraining>>, TError, {
    skillId: string;
}, TContext>;
/**
 * @summary Get skill summary
 */
export declare const getGetSkillsSummaryUrl: () => string;
export declare const getSkillsSummary: (options?: RequestInit) => Promise<SkillsSummary>;
export declare const getGetSkillsSummaryQueryKey: () => readonly ["/api/skills/summary"];
export declare const getGetSkillsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getSkillsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSkillsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSkillsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSkillsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getSkillsSummary>>>;
export type GetSkillsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get skill summary
 */
export declare function useGetSkillsSummary<TData = Awaited<ReturnType<typeof getSkillsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSkillsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get item database
 */
export declare const getGetItemsUrl: (params?: GetItemsParams) => string;
export declare const getItems: (params?: GetItemsParams, options?: RequestInit) => Promise<Item[]>;
export declare const getGetItemsQueryKey: (params?: GetItemsParams) => readonly ["/api/items", ...GetItemsParams[]];
export declare const getGetItemsQueryOptions: <TData = Awaited<ReturnType<typeof getItems>>, TError = ErrorType<unknown>>(params?: GetItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetItemsQueryResult = NonNullable<Awaited<ReturnType<typeof getItems>>>;
export type GetItemsQueryError = ErrorType<unknown>;
/**
 * @summary Get item database
 */
export declare function useGetItems<TData = Awaited<ReturnType<typeof getItems>>, TError = ErrorType<unknown>>(params?: GetItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get a specific item
 */
export declare const getGetItemUrl: (itemId: string) => string;
export declare const getItem: (itemId: string, options?: RequestInit) => Promise<Item>;
export declare const getGetItemQueryKey: (itemId: string) => readonly [`/api/items/${string}`];
export declare const getGetItemQueryOptions: <TData = Awaited<ReturnType<typeof getItem>>, TError = ErrorType<unknown>>(itemId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItem>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getItem>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetItemQueryResult = NonNullable<Awaited<ReturnType<typeof getItem>>>;
export type GetItemQueryError = ErrorType<unknown>;
/**
 * @summary Get a specific item
 */
export declare function useGetItem<TData = Awaited<ReturnType<typeof getItem>>, TError = ErrorType<unknown>>(itemId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getItem>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get enemy database
 */
export declare const getGetEnemiesUrl: (params?: GetEnemiesParams) => string;
export declare const getEnemies: (params?: GetEnemiesParams, options?: RequestInit) => Promise<Enemy[]>;
export declare const getGetEnemiesQueryKey: (params?: GetEnemiesParams) => readonly ["/api/enemies", ...GetEnemiesParams[]];
export declare const getGetEnemiesQueryOptions: <TData = Awaited<ReturnType<typeof getEnemies>>, TError = ErrorType<unknown>>(params?: GetEnemiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEnemies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getEnemies>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetEnemiesQueryResult = NonNullable<Awaited<ReturnType<typeof getEnemies>>>;
export type GetEnemiesQueryError = ErrorType<unknown>;
/**
 * @summary Get enemy database
 */
export declare function useGetEnemies<TData = Awaited<ReturnType<typeof getEnemies>>, TError = ErrorType<unknown>>(params?: GetEnemiesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEnemies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get all zones with unlock status
 */
export declare const getGetZonesUrl: () => string;
export declare const getZones: (options?: RequestInit) => Promise<Zone[]>;
export declare const getGetZonesQueryKey: () => readonly ["/api/zones"];
export declare const getGetZonesQueryOptions: <TData = Awaited<ReturnType<typeof getZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getZones>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetZonesQueryResult = NonNullable<Awaited<ReturnType<typeof getZones>>>;
export type GetZonesQueryError = ErrorType<unknown>;
/**
 * @summary Get all zones with unlock status
 */
export declare function useGetZones<TData = Awaited<ReturnType<typeof getZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Travel to a zone
 */
export declare const getTravelToZoneUrl: (zoneId: string) => string;
export declare const travelToZone: (zoneId: string, options?: RequestInit) => Promise<TravelResult>;
export declare const getTravelToZoneMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof travelToZone>>, TError, {
        zoneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof travelToZone>>, TError, {
    zoneId: string;
}, TContext>;
export type TravelToZoneMutationResult = NonNullable<Awaited<ReturnType<typeof travelToZone>>>;
export type TravelToZoneMutationError = ErrorType<unknown>;
/**
 * @summary Travel to a zone
 */
export declare const useTravelToZone: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof travelToZone>>, TError, {
        zoneId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof travelToZone>>, TError, {
    zoneId: string;
}, TContext>;
/**
 * @summary Get available crafting recipes
 */
export declare const getGetCraftingRecipesUrl: () => string;
export declare const getCraftingRecipes: (options?: RequestInit) => Promise<CraftingRecipe[]>;
export declare const getGetCraftingRecipesQueryKey: () => readonly ["/api/crafting/recipes"];
export declare const getGetCraftingRecipesQueryOptions: <TData = Awaited<ReturnType<typeof getCraftingRecipes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCraftingRecipes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCraftingRecipes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCraftingRecipesQueryResult = NonNullable<Awaited<ReturnType<typeof getCraftingRecipes>>>;
export type GetCraftingRecipesQueryError = ErrorType<unknown>;
/**
 * @summary Get available crafting recipes
 */
export declare function useGetCraftingRecipes<TData = Awaited<ReturnType<typeof getCraftingRecipes>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCraftingRecipes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Craft an item
 */
export declare const getCraftItemUrl: () => string;
export declare const craftItem: (craftRequest: CraftRequest, options?: RequestInit) => Promise<CraftResult>;
export declare const getCraftItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof craftItem>>, TError, {
        data: BodyType<CraftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof craftItem>>, TError, {
    data: BodyType<CraftRequest>;
}, TContext>;
export type CraftItemMutationResult = NonNullable<Awaited<ReturnType<typeof craftItem>>>;
export type CraftItemMutationBody = BodyType<CraftRequest>;
export type CraftItemMutationError = ErrorType<unknown>;
/**
 * @summary Craft an item
 */
export declare const useCraftItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof craftItem>>, TError, {
        data: BodyType<CraftRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof craftItem>>, TError, {
    data: BodyType<CraftRequest>;
}, TContext>;
/**
 * @summary Get merchant shop inventory
 */
export declare const getGetShopItemsUrl: (params?: GetShopItemsParams) => string;
export declare const getShopItems: (params?: GetShopItemsParams, options?: RequestInit) => Promise<Shop>;
export declare const getGetShopItemsQueryKey: (params?: GetShopItemsParams) => readonly ["/api/shop", ...GetShopItemsParams[]];
export declare const getGetShopItemsQueryOptions: <TData = Awaited<ReturnType<typeof getShopItems>>, TError = ErrorType<unknown>>(params?: GetShopItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getShopItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getShopItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetShopItemsQueryResult = NonNullable<Awaited<ReturnType<typeof getShopItems>>>;
export type GetShopItemsQueryError = ErrorType<unknown>;
/**
 * @summary Get merchant shop inventory
 */
export declare function useGetShopItems<TData = Awaited<ReturnType<typeof getShopItems>>, TError = ErrorType<unknown>>(params?: GetShopItemsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getShopItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Purchase an item from the shop
 */
export declare const getBuyItemUrl: () => string;
export declare const buyItem: (buyRequest: BuyRequest, options?: RequestInit) => Promise<BuyResult>;
export declare const getBuyItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof buyItem>>, TError, {
        data: BodyType<BuyRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof buyItem>>, TError, {
    data: BodyType<BuyRequest>;
}, TContext>;
export type BuyItemMutationResult = NonNullable<Awaited<ReturnType<typeof buyItem>>>;
export type BuyItemMutationBody = BodyType<BuyRequest>;
export type BuyItemMutationError = ErrorType<unknown>;
/**
 * @summary Purchase an item from the shop
 */
export declare const useBuyItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof buyItem>>, TError, {
        data: BodyType<BuyRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof buyItem>>, TError, {
    data: BodyType<BuyRequest>;
}, TContext>;
/**
 * @summary Get all achievements with completion status
 */
export declare const getGetAchievementsUrl: () => string;
export declare const getAchievements: (options?: RequestInit) => Promise<Achievement[]>;
export declare const getGetAchievementsQueryKey: () => readonly ["/api/achievements"];
export declare const getGetAchievementsQueryOptions: <TData = Awaited<ReturnType<typeof getAchievements>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAchievements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAchievements>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAchievementsQueryResult = NonNullable<Awaited<ReturnType<typeof getAchievements>>>;
export type GetAchievementsQueryError = ErrorType<unknown>;
/**
 * @summary Get all achievements with completion status
 */
export declare function useGetAchievements<TData = Awaited<ReturnType<typeof getAchievements>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAchievements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get achievement completion summary
 */
export declare const getGetAchievementsSummaryUrl: () => string;
export declare const getAchievementsSummary: (options?: RequestInit) => Promise<AchievementsSummary>;
export declare const getGetAchievementsSummaryQueryKey: () => readonly ["/api/achievements/summary"];
export declare const getGetAchievementsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getAchievementsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAchievementsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAchievementsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAchievementsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getAchievementsSummary>>>;
export type GetAchievementsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get achievement completion summary
 */
export declare function useGetAchievementsSummary<TData = Awaited<ReturnType<typeof getAchievementsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAchievementsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get all faction standings
 */
export declare const getGetFactionsUrl: () => string;
export declare const getFactions: (options?: RequestInit) => Promise<Faction[]>;
export declare const getGetFactionsQueryKey: () => readonly ["/api/factions"];
export declare const getGetFactionsQueryOptions: <TData = Awaited<ReturnType<typeof getFactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFactions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFactionsQueryResult = NonNullable<Awaited<ReturnType<typeof getFactions>>>;
export type GetFactionsQueryError = ErrorType<unknown>;
/**
 * @summary Get all faction standings
 */
export declare function useGetFactions<TData = Awaited<ReturnType<typeof getFactions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get Alternate Advancement tree with spent points
 */
export declare const getGetAATreeUrl: () => string;
export declare const getAATree: (options?: RequestInit) => Promise<AATree>;
export declare const getGetAATreeQueryKey: () => readonly ["/api/aa/tree"];
export declare const getGetAATreeQueryOptions: <TData = Awaited<ReturnType<typeof getAATree>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAATree>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAATree>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAATreeQueryResult = NonNullable<Awaited<ReturnType<typeof getAATree>>>;
export type GetAATreeQueryError = ErrorType<unknown>;
/**
 * @summary Get Alternate Advancement tree with spent points
 */
export declare function useGetAATree<TData = Awaited<ReturnType<typeof getAATree>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAATree>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Spend an AA point on a node
 */
export declare const getSpendAAPointUrl: () => string;
export declare const spendAAPoint: (spendAARequest: SpendAARequest, options?: RequestInit) => Promise<AATree>;
export declare const getSpendAAPointMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof spendAAPoint>>, TError, {
        data: BodyType<SpendAARequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof spendAAPoint>>, TError, {
    data: BodyType<SpendAARequest>;
}, TContext>;
export type SpendAAPointMutationResult = NonNullable<Awaited<ReturnType<typeof spendAAPoint>>>;
export type SpendAAPointMutationBody = BodyType<SpendAARequest>;
export type SpendAAPointMutationError = ErrorType<unknown>;
/**
 * @summary Spend an AA point on a node
 */
export declare const useSpendAAPoint: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof spendAAPoint>>, TError, {
        data: BodyType<SpendAARequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof spendAAPoint>>, TError, {
    data: BodyType<SpendAARequest>;
}, TContext>;
/**
 * @summary Get all collection sets with progress
 */
export declare const getGetCollectionsUrl: () => string;
export declare const getCollections: (options?: RequestInit) => Promise<Collection[]>;
export declare const getGetCollectionsQueryKey: () => readonly ["/api/collections"];
export declare const getGetCollectionsQueryOptions: <TData = Awaited<ReturnType<typeof getCollections>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCollectionsQueryResult = NonNullable<Awaited<ReturnType<typeof getCollections>>>;
export type GetCollectionsQueryError = ErrorType<unknown>;
/**
 * @summary Get all collection sets with progress
 */
export declare function useGetCollections<TData = Awaited<ReturnType<typeof getCollections>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCollections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get all mounts (owned and available to purchase)
 */
export declare const getGetMountsUrl: () => string;
export declare const getMounts: (options?: RequestInit) => Promise<Mount[]>;
export declare const getGetMountsQueryKey: () => readonly ["/api/mounts"];
export declare const getGetMountsQueryOptions: <TData = Awaited<ReturnType<typeof getMounts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMounts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMountsQueryResult = NonNullable<Awaited<ReturnType<typeof getMounts>>>;
export type GetMountsQueryError = ErrorType<unknown>;
/**
 * @summary Get all mounts (owned and available to purchase)
 */
export declare function useGetMounts<TData = Awaited<ReturnType<typeof getMounts>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMounts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Equip a mount
 */
export declare const getEquipMountUrl: (mountId: string) => string;
export declare const equipMount: (mountId: string, options?: RequestInit) => Promise<MountResult>;
export declare const getEquipMountMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipMount>>, TError, {
        mountId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof equipMount>>, TError, {
    mountId: string;
}, TContext>;
export type EquipMountMutationResult = NonNullable<Awaited<ReturnType<typeof equipMount>>>;
export type EquipMountMutationError = ErrorType<unknown>;
/**
 * @summary Equip a mount
 */
export declare const useEquipMount: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof equipMount>>, TError, {
        mountId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof equipMount>>, TError, {
    mountId: string;
}, TContext>;
/**
 * @summary Get all ghost/world players
 */
export declare const getGetWorldPlayersUrl: () => string;
export declare const getWorldPlayers: (options?: RequestInit) => Promise<WorldPlayer[]>;
export declare const getGetWorldPlayersQueryKey: () => readonly ["/api/world/players"];
export declare const getGetWorldPlayersQueryOptions: <TData = Awaited<ReturnType<typeof getWorldPlayers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldPlayersQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldPlayers>>>;
export type GetWorldPlayersQueryError = ErrorType<unknown>;
/**
 * @summary Get all ghost/world players
 */
export declare function useGetWorldPlayers<TData = Awaited<ReturnType<typeof getWorldPlayers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get recent world events (living world feed)
 */
export declare const getGetWorldEventsUrl: (params?: GetWorldEventsParams) => string;
export declare const getWorldEvents: (params?: GetWorldEventsParams, options?: RequestInit) => Promise<WorldEvent[]>;
export declare const getGetWorldEventsQueryKey: (params?: GetWorldEventsParams) => readonly ["/api/world/events", ...GetWorldEventsParams[]];
export declare const getGetWorldEventsQueryOptions: <TData = Awaited<ReturnType<typeof getWorldEvents>>, TError = ErrorType<unknown>>(params?: GetWorldEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldEventsQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldEvents>>>;
export type GetWorldEventsQueryError = ErrorType<unknown>;
/**
 * @summary Get recent world events (living world feed)
 */
export declare function useGetWorldEvents<TData = Awaited<ReturnType<typeof getWorldEvents>>, TError = ErrorType<unknown>>(params?: GetWorldEventsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get player count per zone (ghosts + real player)
 */
export declare const getGetWorldZonesUrl: () => string;
export declare const getWorldZones: (options?: RequestInit) => Promise<ZonePopulation[]>;
export declare const getGetWorldZonesQueryKey: () => readonly ["/api/world/zones"];
export declare const getGetWorldZonesQueryOptions: <TData = Awaited<ReturnType<typeof getWorldZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldZones>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldZonesQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldZones>>>;
export type GetWorldZonesQueryError = ErrorType<unknown>;
/**
 * @summary Get player count per zone (ghosts + real player)
 */
export declare function useGetWorldZones<TData = Awaited<ReturnType<typeof getWorldZones>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldZones>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get top 10 by level then kill_count (ghosts + real player)
 */
export declare const getGetWorldLeaderboardUrl: () => string;
export declare const getWorldLeaderboard: (options?: RequestInit) => Promise<LeaderboardEntry[]>;
export declare const getGetWorldLeaderboardQueryKey: () => readonly ["/api/world/leaderboard"];
export declare const getGetWorldLeaderboardQueryOptions: <TData = Awaited<ReturnType<typeof getWorldLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldLeaderboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldLeaderboardQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldLeaderboard>>>;
export type GetWorldLeaderboardQueryError = ErrorType<unknown>;
/**
 * @summary Get top 10 by level then kill_count (ghosts + real player)
 */
export declare function useGetWorldLeaderboard<TData = Awaited<ReturnType<typeof getWorldLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get aggregate world statistics
 */
export declare const getGetWorldStatsUrl: () => string;
export declare const getWorldStats: (options?: RequestInit) => Promise<WorldStats>;
export declare const getGetWorldStatsQueryKey: () => readonly ["/api/world/stats"];
export declare const getGetWorldStatsQueryOptions: <TData = Awaited<ReturnType<typeof getWorldStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldStats>>>;
export type GetWorldStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get aggregate world statistics
 */
export declare function useGetWorldStats<TData = Awaited<ReturnType<typeof getWorldStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Generate a batch of AI quests for the current character
 */
export declare const getGenerateQuestsUrl: () => string;
export declare const generateQuests: (options?: RequestInit) => Promise<Quest[]>;
export declare const getGenerateQuestsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateQuests>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateQuests>>, TError, void, TContext>;
export type GenerateQuestsMutationResult = NonNullable<Awaited<ReturnType<typeof generateQuests>>>;
export type GenerateQuestsMutationError = ErrorType<unknown>;
/**
 * @summary Generate a batch of AI quests for the current character
 */
export declare const useGenerateQuests: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateQuests>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateQuests>>, TError, void, TContext>;
/**
 * @summary Get all quests (active and completed)
 */
export declare const getGetQuestsUrl: () => string;
export declare const getQuests: (options?: RequestInit) => Promise<Quest[]>;
export declare const getGetQuestsQueryKey: () => readonly ["/api/quests"];
export declare const getGetQuestsQueryOptions: <TData = Awaited<ReturnType<typeof getQuests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuestsQueryResult = NonNullable<Awaited<ReturnType<typeof getQuests>>>;
export type GetQuestsQueryError = ErrorType<unknown>;
/**
 * @summary Get all quests (active and completed)
 */
export declare function useGetQuests<TData = Awaited<ReturnType<typeof getQuests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Mark a quest as completed and claim rewards
 */
export declare const getCompleteQuestUrl: (id: number) => string;
export declare const completeQuest: (id: number, options?: RequestInit) => Promise<QuestCompleteResult>;
export declare const getCompleteQuestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeQuest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeQuest>>, TError, {
    id: number;
}, TContext>;
export type CompleteQuestMutationResult = NonNullable<Awaited<ReturnType<typeof completeQuest>>>;
export type CompleteQuestMutationError = ErrorType<unknown>;
/**
 * @summary Mark a quest as completed and claim rewards
 */
export declare const useCompleteQuest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeQuest>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeQuest>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get AI-generated NPC dialogue
 */
export declare const getGetNpcDialogueUrl: () => string;
export declare const getNpcDialogue: (npcDialogueRequest: NpcDialogueRequest, options?: RequestInit) => Promise<NpcDialogueResponse>;
export declare const getGetNpcDialogueMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getNpcDialogue>>, TError, {
        data: BodyType<NpcDialogueRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof getNpcDialogue>>, TError, {
    data: BodyType<NpcDialogueRequest>;
}, TContext>;
export type GetNpcDialogueMutationResult = NonNullable<Awaited<ReturnType<typeof getNpcDialogue>>>;
export type GetNpcDialogueMutationBody = BodyType<NpcDialogueRequest>;
export type GetNpcDialogueMutationError = ErrorType<unknown>;
/**
 * @summary Get AI-generated NPC dialogue
 */
export declare const useGetNpcDialogue: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getNpcDialogue>>, TError, {
        data: BodyType<NpcDialogueRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof getNpcDialogue>>, TError, {
    data: BodyType<NpcDialogueRequest>;
}, TContext>;
/**
 * @summary Get AI-generated lore entry for the character
 */
export declare const getGetCharacterLoreUrl: () => string;
export declare const getCharacterLore: (options?: RequestInit) => Promise<CharacterLoreResponse>;
export declare const getGetCharacterLoreQueryKey: () => readonly ["/api/character/lore"];
export declare const getGetCharacterLoreQueryOptions: <TData = Awaited<ReturnType<typeof getCharacterLore>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacterLore>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCharacterLore>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCharacterLoreQueryResult = NonNullable<Awaited<ReturnType<typeof getCharacterLore>>>;
export type GetCharacterLoreQueryError = ErrorType<unknown>;
/**
 * @summary Get AI-generated lore entry for the character
 */
export declare function useGetCharacterLore<TData = Awaited<ReturnType<typeof getCharacterLore>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCharacterLore>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get AI-generated quote for a world/ghost player by ID
 */
export declare const getGetWorldPlayerQuoteByIdUrl: (id: string) => string;
export declare const getWorldPlayerQuoteById: (id: string, options?: RequestInit) => Promise<PlayerQuoteResponse>;
export declare const getGetWorldPlayerQuoteByIdQueryKey: (id: string) => readonly [`/api/world/player/${string}/quote`];
export declare const getGetWorldPlayerQuoteByIdQueryOptions: <TData = Awaited<ReturnType<typeof getWorldPlayerQuoteById>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteById>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldPlayerQuoteByIdQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldPlayerQuoteById>>>;
export type GetWorldPlayerQuoteByIdQueryError = ErrorType<unknown>;
/**
 * @summary Get AI-generated quote for a world/ghost player by ID
 */
export declare function useGetWorldPlayerQuoteById<TData = Awaited<ReturnType<typeof getWorldPlayerQuoteById>>, TError = ErrorType<unknown>>(id: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteById>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get AI-generated quote for a world/ghost player by name
 */
export declare const getGetWorldPlayerQuoteByNameUrl: (name: string) => string;
export declare const getWorldPlayerQuoteByName: (name: string, options?: RequestInit) => Promise<PlayerQuoteResponse>;
export declare const getGetWorldPlayerQuoteByNameQueryKey: (name: string) => readonly [`/api/world/player/by-name/${string}/quote`];
export declare const getGetWorldPlayerQuoteByNameQueryOptions: <TData = Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>, TError = ErrorType<unknown>>(name: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWorldPlayerQuoteByNameQueryResult = NonNullable<Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>>;
export type GetWorldPlayerQuoteByNameQueryError = ErrorType<unknown>;
/**
 * @summary Get AI-generated quote for a world/ghost player by name
 */
export declare function useGetWorldPlayerQuoteByName<TData = Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>, TError = ErrorType<unknown>>(name: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWorldPlayerQuoteByName>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get AI-generated boss narration (intro or death speech)
 */
export declare const getGetBossNarrationUrl: (bossId: string, params?: GetBossNarrationParams) => string;
export declare const getBossNarration: (bossId: string, params?: GetBossNarrationParams, options?: RequestInit) => Promise<BossNarrationResponse>;
export declare const getGetBossNarrationQueryKey: (bossId: string, params?: GetBossNarrationParams) => readonly [`/api/combat/boss-narration/${string}`, ...GetBossNarrationParams[]];
export declare const getGetBossNarrationQueryOptions: <TData = Awaited<ReturnType<typeof getBossNarration>>, TError = ErrorType<unknown>>(bossId: string, params?: GetBossNarrationParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBossNarration>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBossNarration>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBossNarrationQueryResult = NonNullable<Awaited<ReturnType<typeof getBossNarration>>>;
export type GetBossNarrationQueryError = ErrorType<unknown>;
/**
 * @summary Get AI-generated boss narration (intro or death speech)
 */
export declare function useGetBossNarration<TData = Awaited<ReturnType<typeof getBossNarration>>, TError = ErrorType<unknown>>(bossId: string, params?: GetBossNarrationParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBossNarration>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get overall game progress summary
 */
export declare const getGetGameSummaryUrl: () => string;
export declare const getGameSummary: (options?: RequestInit) => Promise<GameSummary>;
export declare const getGetGameSummaryQueryKey: () => readonly ["/api/game/summary"];
export declare const getGetGameSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getGameSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGameSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGameSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getGameSummary>>>;
export type GetGameSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get overall game progress summary
 */
export declare function useGetGameSummary<TData = Awaited<ReturnType<typeof getGameSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGameSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map