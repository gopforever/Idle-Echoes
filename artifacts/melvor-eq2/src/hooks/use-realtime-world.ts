import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, isRealtimeEnabled } from "@/lib/supabase";

/**
 * Subscribes to Supabase Realtime inserts on the `world_events` table AND
 * updates to the `world_players` table so every World-page panel stays live.
 *
 * When a change arrives, ALL world-related queries are invalidated immediately:
 *   - /api/world/events  (new event rows)
 *   - /api/world/stats   (aggregate counters)
 *   - /api/world/leaderboard (ranking changes)
 *   - /api/world/players (player positions / stats)
 *   - /api/world/zones   (zone population counts)
 *
 * Falls back to the polling interval already set in TanStack Query options
 * when Supabase is not configured (VITE_SUPABASE_URL not set).
 *
 * Returns true when Realtime is active so callers can disable polling.
 */
export function useRealtimeWorldEvents(): boolean {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isRealtimeEnabled || !supabase) return;

    const invalidateAll = () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/world/events"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/world/stats"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/world/leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/world/players"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/world/zones"] });
    };

    const channel = supabase
      .channel("world_realtime")
      // New ghost activity events → refresh events + derived stats
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "world_events" },
        invalidateAll,
      )
      // Ghost level-ups, zone changes, kill counts → refresh player lists
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "world_players" },
        invalidateAll,
      )
      // New ghost spawns → refresh player lists and zone counts
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "world_players" },
        invalidateAll,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return isRealtimeEnabled;
}

/**
 * Subscribes to Supabase Realtime inserts on the `combat_log` table.
 * Falls back to polling when Supabase is not configured.
 *
 * When a new log entry arrives, it invalidates the combat log query so
 * TanStack re-fetches immediately without waiting for the poll interval.
 */
export function useRealtimeCombatLog(): boolean {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isRealtimeEnabled || !supabase) return;

    const channel = supabase
      .channel("combat_log_inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "combat_log" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/combat/log"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return isRealtimeEnabled;
}
