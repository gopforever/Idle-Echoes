import * as React from "react";
import { Link, useLocation } from "wouter";
import {
  Shield, Sword, Backpack, GraduationCap, Hammer, Anvil, LayoutDashboard,
  Map, Users, Star, Layers, Zap, Award, ShoppingBag, Gem, Globe2, ScrollText, Castle, Landmark, Pickaxe,
  BookOpen, Settings, LogOut, UserRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetCharacter, useGetCombatState } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/combat", label: "Combat", icon: Sword },
  { href: "/character", label: "Character", icon: Shield },
  { href: "/inventory", label: "Inventory", icon: Backpack },
  { href: "/bank", label: "Bank", icon: Landmark },
  { href: "/skills", label: "Skills", icon: GraduationCap },
  { href: "/gathering", label: "Gathering", icon: Pickaxe },
  { href: "/crafting", label: "Crafting", icon: Hammer },
  { href: "/tradeskills", label: "Tradeskills", icon: Anvil },
];

const NAV_EQ2 = [
  { href: "/dungeons", label: "Dungeons", icon: Castle },
  { href: "/zones", label: "Zones", icon: Map },
  { href: "/shop", label: "Auction Hall", icon: ShoppingBag },
  { href: "/factions", label: "Factions", icon: Users },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/aa", label: "Adv. Abilities", icon: Zap },
  { href: "/adornments", label: "Adornments", icon: Gem },
  { href: "/collections", label: "Collections", icon: Layers },
  { href: "/mounts", label: "Mounts", icon: Star },
  { href: "/world", label: "Living World", icon: Globe2 },
  { href: "/guild", label: "Guild", icon: Users },
  { href: "/quests", label: "Quests (GM)", icon: ScrollText },
  { href: "/bestiary", label: "Bestiary", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ href, label, icon: Icon, active, eq2 }: {
  href: string; label: string; icon: React.ElementType; active: boolean; eq2?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? eq2
            ? "bg-amber-900/20 text-amber-400 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.3)]"
            : "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
          : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", active ? (eq2 ? "text-amber-400" : "text-primary") : "text-slate-600")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { data: character } = useGetCharacter();
  const { data: combatState } = useGetCombatState();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const hpPct = character ? Math.min(100, (character.health / character.maxHealth) * 100) : 0;
  const powerPct = character ? Math.min(100, (character.power / character.maxPower) * 100) : 0;
  const xpPct = character ? Math.min(100, ((character.xp ?? 0) / Math.max(1, character.xpToNextLevel ?? 1)) * 100) : 0;
  return (
    <div className="w-56 bg-slate-950 border-r border-slate-800/60 flex flex-col h-full shrink-0 overflow-y-auto">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800/40">
        <div className="text-lg font-black font-serif tracking-wider">
          <span className="text-slate-100">MELVOR</span>{" "}
          <span className="text-amber-500">EQ2</span>
        </div>
        <div className="text-[10px] text-slate-700 mt-0.5 tracking-widest uppercase">Norrath awaits</div>
      </div>

      {/* Character minisheet */}
      {character && (
        <div className="px-4 py-3 border-b border-slate-800/40 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate leading-tight">{character.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-tight capitalize">
                {character.race?.replace(/_/g, " ")} {character.class}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-amber-500">Lv {character.level}</span>
                {character.alignment && (
                  <span className="text-[10px] text-slate-600">
                    · {character.alignment === "Qeynos" ? "🛡️" : character.alignment === "Freeport" ? "⚔️" : "⚖️"} {character.alignment}
                  </span>
                )}
              </div>
            </div>
            {combatState?.active && (
              <div className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1" title="In combat" />
            )}
          </div>

          {/* Vitals */}
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                <span className="text-red-500">HP</span>
                <span className="tabular-nums">{character.health}/{character.maxHealth}</span>
              </div>
              <Progress value={hpPct} className="h-1.5 bg-slate-900 rounded-full" indicatorClassName={cn("rounded-full", hpPct < 25 ? "bg-red-600 animate-pulse" : hpPct < 50 ? "bg-orange-500" : "bg-red-500")} />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                <span className="text-blue-500">Power</span>
                <span className="tabular-nums">{character.power}/{character.maxPower}</span>
              </div>
              <Progress value={powerPct} className="h-1.5 bg-slate-900 rounded-full" indicatorClassName="bg-blue-600 rounded-full" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-600 mb-0.5">
                <span className="text-amber-600">XP</span>
                <span className="tabular-nums">{xpPct.toFixed(1)}%</span>
              </div>
              <Progress value={xpPct} className="h-1 bg-slate-900 rounded-full" indicatorClassName="bg-amber-600 rounded-full" />
            </div>
          </div>

          {character.gold > 0 && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-600">Gold</span>
              <span className="text-amber-500 font-bold tabular-nums">💰 {(character.gold ?? 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={location === item.href} />
        ))}

        <div className="pt-3 pb-1.5 px-2">
          <div className="h-px bg-slate-800/60 mb-2" />
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-700 font-bold">EverQuest II</p>
        </div>

        {NAV_EQ2.map((item) => (
          <NavLink key={item.href} {...item} active={location === item.href} eq2 />
        ))}
      </nav>

      {user && (
        <div className="px-3 py-2 border-t border-slate-800/40 space-y-1">
          <button
            onClick={() => navigate("/character-select")}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all text-[11px]"
            title="Switch Character"
          >
            <UserRound className="w-3 h-3 shrink-0" />
            <span className="truncate">{user.username}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-slate-800/60 transition-all text-[11px]"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
      <div className="px-4 py-2 border-t border-slate-800/40 text-[10px] text-slate-800 text-center font-mono">
        v0.2.0 EQ2 Edition
      </div>
    </div>
  );
}
