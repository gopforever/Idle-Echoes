import * as React from "react";
import { cn } from "@/lib/utils";

interface SpriteRendererProps {
  id?: string;
  type?: "player" | "enemy";
  className?: string;
  characterClass?: string;
  enemyType?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

function classToColor(characterClass?: string): string {
  const cls = characterClass?.toLowerCase() ?? "";
  if (["guardian", "berserker", "warrior", "monk", "bruiser"].includes(cls)) return "#ef4444";
  if (["wizard", "warlock", "conjuror", "necromancer", "coercer", "illusionist"].includes(cls)) return "#8b5cf6";
  if (["ranger", "assassin", "swashbuckler", "brigand", "troubador", "dirge"].includes(cls)) return "#22c55e";
  if (["paladin", "templar", "inquisitor", "mystic", "defiler", "warden", "fury"].includes(cls)) return "#eab308";
  if (["shadowknight"].includes(cls)) return "#a855f7";
  return "#cbd5e1";
}

export function SpriteRenderer({ id, type = "player", className, characterClass, enemyType, size = "md" }: SpriteRendererProps) {
  const sizeClasses: Record<string, string> = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };

  const renderPlayer = () => {
    const color = classToColor(characterClass);
    return (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <rect x="12" y="4" width="8" height="8" rx="4" fill={color} />
        <rect x="8" y="14" width="16" height="12" rx="2" fill={color} />
        <rect x="10" y="26" width="4" height="6" fill={color} />
        <rect x="18" y="26" width="4" height="6" fill={color} />
      </svg>
    );
  };

  const renderEnemy = () => {
    const et = enemyType?.toLowerCase() ?? "humanoid";
    let color = "#ef4444";

    if (et === "beast") color = "#84cc16";
    else if (et === "undead") color = "#a855f7";
    else if (et === "dragon") color = "#dc2626";
    else if (et === "construct") color = "#94a3b8";
    else if (et === "elemental") color = "#3b82f6";

    if (et === "dragon") {
      return (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
          <path d="M16 2 L28 16 L16 30 L4 16 Z" fill={color} />
          <circle cx="16" cy="16" r="6" fill="#facc15" />
        </svg>
      );
    } else if (et === "beast") {
      return (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          <circle cx="16" cy="16" r="10" fill={color} />
          <path d="M6 10 L12 16 L6 22 Z" fill={color} />
          <path d="M26 10 L20 16 L26 22 Z" fill={color} />
        </svg>
      );
    } else if (et === "undead") {
      return (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-80 drop-shadow-md">
          <rect x="10" y="8" width="12" height="16" rx="2" fill={color} />
          <rect x="12" y="12" width="3" height="3" fill="#1e293b" />
          <rect x="17" y="12" width="3" height="3" fill="#1e293b" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <polygon points="16,4 24,28 8,28" fill={color} />
        <circle cx="16" cy="12" r="4" fill="#1e293b" />
      </svg>
    );
  };

  return (
    <div className={cn("flex items-center justify-center", sizeClasses[size ?? "md"], className)}>
      {type === "player" ? renderPlayer() : renderEnemy()}
    </div>
  );
}
