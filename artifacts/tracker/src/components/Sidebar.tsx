import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, Ghost, Users, Trophy, Activity, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ghosts", icon: Ghost, label: "Ghost Players" },
  { href: "/humans", icon: Users, label: "Human Players" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/events", icon: Activity, label: "World Events" },
  { href: "/economy", icon: Coins, label: "Economy" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside
      className="fixed top-0 left-0 h-full w-60 flex flex-col z-30"
      style={{ background: "#0d0d14", borderRight: "1px solid #1f2937" }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "#1f2937" }}>
        <h1
          className="text-lg font-bold tracking-widest text-amber-400"
          style={{ fontFamily: "Cinzel, serif" }}
        >
          ⚔ MELVOR EQ2
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Tracker Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
            >
              <Link href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-amber-500/15 text-amber-400 glow-gold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: isActive ? "#f59e0b" : undefined }}
                  />
                  {item.label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer clock set in Layout */}
    </aside>
  );
}
