import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function classColor(classArchetype: string | null | undefined): string {
  const arch = (classArchetype ?? "").toLowerCase();
  if (arch.includes("fighter") || arch.includes("warrior") || arch.includes("guardian") || arch.includes("berserker") || arch.includes("monk") || arch.includes("bruiser")) return "#ef4444";
  if (arch.includes("mage") || arch.includes("wizard") || arch.includes("sorcerer") || arch.includes("necromancer") || arch.includes("warlock") || arch.includes("illusionist") || arch.includes("conjuror")) return "#3b82f6";
  if (arch.includes("scout") || arch.includes("ranger") || arch.includes("assassin") || arch.includes("brigand") || arch.includes("swashbuckler") || arch.includes("dirge") || arch.includes("troubador") || arch.includes("bard")) return "#22c55e";
  if (arch.includes("priest") || arch.includes("cleric") || arch.includes("templar") || arch.includes("inquisitor") || arch.includes("warden") || arch.includes("fury") || arch.includes("mystic") || arch.includes("defiler") || arch.includes("shaman") || arch.includes("druid")) return "#eab308";
  return "#94a3b8";
}

export function rarityColor(rarity: string | null | undefined): string {
  switch ((rarity ?? "").toLowerCase()) {
    case "uncommon": return "#22c55e";
    case "rare": return "#3b82f6";
    case "legendary": return "#a855f7";
    case "fabled": return "#f97316";
    case "mythical": return "#ef4444";
    default: return "#94a3b8";
  }
}
