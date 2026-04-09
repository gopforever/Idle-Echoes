import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: number;
  className?: string;
}

const rankConfig = {
  1: { color: "#FFD700", bg: "#FFD70020", label: "1st" },
  2: { color: "#C0C0C0", bg: "#C0C0C020", label: "2nd" },
  3: { color: "#CD7F32", bg: "#CD7F3220", label: "3rd" },
};

export default function RankBadge({ rank, className }: RankBadgeProps) {
  const config = rankConfig[rank as keyof typeof rankConfig];

  if (!config) {
    return (
      <span className={cn("text-muted-foreground text-sm font-mono w-6 text-center", className)}>
        {rank}
      </span>
    );
  }

  return (
    <motion.div
      className={cn("relative inline-flex items-center justify-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold", className)}
      style={{ color: config.color, background: config.bg }}
      animate={rank === 1 ? { boxShadow: ["0 0 0px #FFD70000", "0 0 8px #FFD70080", "0 0 0px #FFD70000"] } : {}}
      transition={rank === 1 ? { duration: 2, repeat: Infinity } : {}}
    >
      {rank === 1 && <Crown className="h-3 w-3" />}
      {config.label}
    </motion.div>
  );
}
