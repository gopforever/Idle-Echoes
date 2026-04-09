import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface XpBarProps {
  skillName: string;
  level: number;
  xp?: number;
  maxXp?: number;
  className?: string;
}

const skillColors: Record<string, string> = {
  combat: "#ef4444",
  magic: "#3b82f6",
  crafting: "#eab308",
  gathering: "#22c55e",
  fishing: "#06b6d4",
  mining: "#94a3b8",
  woodcutting: "#a3e635",
  cooking: "#f97316",
};

function getSkillColor(skillName: string): string {
  const lower = skillName.toLowerCase();
  for (const [key, color] of Object.entries(skillColors)) {
    if (lower.includes(key)) return color;
  }
  return "#f59e0b";
}

export default function XpBar({ skillName, level, xp = 0, maxXp = 100, className }: XpBarProps) {
  const pct = maxXp > 0 ? Math.min(100, (xp / maxXp) * 100) : 0;
  const color = getSkillColor(skillName);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{skillName}</span>
        <span
          className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
          style={{ color, background: color + "22" }}
        >
          Lv.{level}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
