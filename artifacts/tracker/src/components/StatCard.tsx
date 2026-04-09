import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: number;
  glowColor?: string;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, subtitle, trend, glowColor = "#f59e0b", className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border p-5 flex flex-col gap-2 hover:glow-gold transition-all duration-200",
        className
      )}
      style={{
        background: "#111827",
        borderColor: "#1f2937",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: glowColor + "22" }}
        >
          <Icon className="h-4 w-4" style={{ color: glowColor }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl font-bold text-foreground"
        >
          {value}
        </motion.span>
        {trend !== undefined && (
          <span className={cn("text-xs mb-0.5", trend >= 0 ? "text-emerald-400" : "text-red-400")}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}
