import { Badge } from "@/components/ui/badge";
import { classColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PlayerBadgeProps {
  playerType?: string | boolean;
  className?: string;
  level?: number;
  classArchetype?: string;
}

export default function PlayerBadge({ playerType, className, level, classArchetype }: PlayerBadgeProps) {
  const isGhost = playerType === "ghost" || playerType === true || playerType === "Ghost";
  const color = classColor(classArchetype);

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {isGhost ? (
        <Badge variant="ghost" className="text-[10px]">GHOST</Badge>
      ) : (
        <Badge variant="human" className="text-[10px]">HUMAN</Badge>
      )}
      {classArchetype && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ color, background: color + "22" }}
        >
          {classArchetype}
        </span>
      )}
      {level !== undefined && (
        <span className="text-[10px] text-muted-foreground">Lv.{level}</span>
      )}
    </div>
  );
}
