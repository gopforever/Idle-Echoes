import { Sword, Crown, ArrowUp, MapPin, Package, Activity } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { WorldEvent } from "@/lib/api";

const eventConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  kill: { icon: Sword, color: "#ef4444", label: "Kill" },
  boss_kill: { icon: Crown, color: "#f59e0b", label: "Boss Kill" },
  level_up: { icon: ArrowUp, color: "#22c55e", label: "Level Up" },
  zone_travel: { icon: MapPin, color: "#3b82f6", label: "Travel" },
  loot: { icon: Package, color: "#a855f7", label: "Loot" },
};

interface EventCardProps {
  event: WorldEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const config = eventConfig[event.eventType] ?? { icon: Activity, color: "#94a3b8", label: event.eventType };
  const Icon = config.icon;
  const ts = event.timestamp ?? event.createdAt;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors hover:bg-secondary/30"
      style={{ background: "#111827", borderColor: "#1f2937" }}
    >
      <div
        className="mt-0.5 h-7 w-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: config.color + "22" }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-1">
          {event.description ?? `${event.playerName ?? "Unknown"} — ${config.label}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {event.zone && (
            <span className="text-[10px] text-muted-foreground">{event.zone}</span>
          )}
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(ts)}</span>
        </div>
      </div>
    </div>
  );
}
