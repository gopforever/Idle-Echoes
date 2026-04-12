import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EpicQuestStep {
  step: number;
  title: string;
  description: string;
  lore: string;
  done: boolean;
  requirement: string;
  progress: string;
  progressPct: number;
}

interface EpicWeaponDef {
  classId: string;
  className: string;
  archetype: string;
  fablesItemId: string;
  mythicalItemId: string;
  weaponLore: string;
  questGiver: string;
  questHook: string;
}

interface EpicQuestState {
  started: boolean;
  completed?: boolean;
  mythicalAwarded?: boolean;
  fabledWeaponId?: string;
  mythicalWeaponId?: string;
  classId?: string;
  currentStep?: number;
  epicDef?: EpicWeaponDef | null;
  steps?: EpicQuestStep[];
  eligible?: boolean;
  characterLevel?: number;
  characterClass?: string;
  upgradeRequirements?: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rarityStyle(tier: "fabled" | "mythical") {
  if (tier === "mythical") return "text-orange-300 border-orange-600/60 bg-orange-950/20";
  return "text-purple-300 border-purple-600/60 bg-purple-950/20";
}

function rarityGlow(tier: "fabled" | "mythical") {
  if (tier === "mythical") return "shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500/40";
  return "shadow-[0_0_16px_rgba(168,85,247,0.25)] border-purple-500/30";
}

const UPGRADE_MATERIAL_NAMES: Record<string, string> = {
  prismatic_dragon_scale: "Prismatic Dragon Scale",
  plague_dragon_spine: "Plague Dragon's Spine",
  vampire_lord_fang: "Vampire Lord's Fang",
};

const UPGRADE_MATERIAL_ICONS: Record<string, string> = {
  prismatic_dragon_scale: "🐉",
  plague_dragon_spine: "☠️",
  vampire_lord_fang: "🧛",
};

function epicWeaponDisplayName(itemId: string): string {
  return itemId
    .replace(/^epic_/, "")
    .replace(/_fabled$|_mythical$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, isCurrent }: { step: EpicQuestStep; isCurrent: boolean }) {
  const [loreOpen, setLoreOpen] = React.useState(false);

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      step.done
        ? "border-green-700/40 bg-green-950/10 opacity-75"
        : isCurrent
        ? "border-amber-500/50 bg-amber-950/10 shadow-[0_0_12px_rgba(217,119,6,0.2)]"
        : "border-slate-700/40 bg-slate-900/20 opacity-50"
    )}>
      <div className="flex items-start gap-3">
        {/* Step indicator */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5",
          step.done
            ? "bg-green-700 text-green-100"
            : isCurrent
            ? "bg-amber-700 text-amber-100 animate-pulse"
            : "bg-slate-800 text-slate-500"
        )}>
          {step.done ? "✓" : step.step}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn(
              "text-sm font-bold",
              step.done ? "text-green-400" : isCurrent ? "text-amber-400" : "text-slate-500"
            )}>
              {step.title}
            </h3>
            {step.done && <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-700/50 text-green-500 bg-green-950/30">COMPLETE</span>}
            {isCurrent && !step.done && <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-600/50 text-amber-400 bg-amber-950/30 animate-pulse">IN PROGRESS</span>}
          </div>

          <p className="text-xs text-slate-400 mt-1">{step.description}</p>

          {/* Requirement / progress */}
          {(isCurrent || step.done) && (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] text-slate-500 font-medium">{step.requirement}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", step.done ? "bg-green-600" : "bg-amber-600")}
                    style={{ width: `${step.progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums shrink-0">{step.progress}</span>
              </div>
            </div>
          )}

          {/* Lore toggle */}
          {(isCurrent || step.done) && (
            <div className="mt-2">
              <button
                onClick={() => setLoreOpen(p => !p)}
                className="text-[11px] text-amber-700 hover:text-amber-500 transition-colors"
              >
                {loreOpen ? "▾ Hide Lore" : "▸ Show Lore"}
              </button>
              {loreOpen && (
                <div className="mt-1.5 p-2 rounded border border-amber-900/30 bg-amber-950/10 text-xs text-amber-300/80 italic">
                  {step.lore}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Weapon Showcase ──────────────────────────────────────────────────────────

function WeaponShowcase({
  epicDef,
  tier,
}: {
  epicDef: EpicWeaponDef;
  tier: "fabled" | "mythical";
}) {
  const itemId = tier === "mythical" ? epicDef.mythicalItemId : epicDef.fablesItemId;
  const label = tier === "mythical" ? "Mythical" : "Fabled";
  const icon = tier === "mythical" ? "⚡" : "✨";

  return (
    <div className={cn("rounded-xl border p-5 space-y-3", rarityGlow(tier))}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className={cn("text-xs px-2 py-0.5 rounded border inline-block mb-1", rarityStyle(tier))}>
            {label} Epic Weapon
          </div>
          <div className={cn("font-serif font-bold text-base leading-tight", tier === "mythical" ? "text-orange-300" : "text-purple-300")}>
            {epicWeaponDisplayName(itemId)}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 italic">{epicDef.weaponLore}</p>
    </div>
  );
}

// ─── Upgrade Panel ────────────────────────────────────────────────────────────

function UpgradePanel({
  upgradeRequirements,
  onUpgrade,
  isUpgrading,
}: {
  upgradeRequirements: Record<string, number>;
  onUpgrade: () => void;
  isUpgrading: boolean;
}) {
  return (
    <div className="rounded-xl border border-orange-700/40 bg-orange-950/10 p-5 space-y-4">
      <div>
        <h3 className="text-orange-400 font-bold text-sm">⚡ Upgrade to Mythical</h3>
        <p className="text-xs text-slate-400 mt-1">
          Consume the required raid materials to awaken your weapon's true mythical power.
          Your fabled weapon will be consumed in the process.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Required Materials</div>
        {Object.entries(upgradeRequirements).map(([itemId, qty]) => (
          <div key={itemId} className="flex items-center gap-2 text-xs">
            <span className="text-base">{UPGRADE_MATERIAL_ICONS[itemId] ?? "📦"}</span>
            <span className="text-slate-300">{UPGRADE_MATERIAL_NAMES[itemId] ?? itemId}</span>
            <span className="ml-auto text-amber-400 font-bold">×{qty}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-base">✨</span>
          <span className="text-slate-300">Your Fabled Epic Weapon</span>
          <span className="ml-auto text-amber-400 font-bold">×1 (consumed)</span>
        </div>
      </div>

      <Button
        onClick={onUpgrade}
        disabled={isUpgrading}
        className="w-full bg-orange-700 hover:bg-orange-600 text-white font-bold"
      >
        {isUpgrading ? "Forging..." : "⚡ Forge Mythical Weapon"}
      </Button>
    </div>
  );
}

// ─── Not Started Panel ────────────────────────────────────────────────────────

function NotStartedPanel({
  eligible,
  characterLevel,
  characterClass,
  epicDef,
  onStart,
  isStarting,
}: {
  eligible: boolean;
  characterLevel: number;
  characterClass: string;
  epicDef: EpicWeaponDef | null;
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-purple-700/40 bg-purple-950/10 p-6 text-center space-y-3">
        <div className="text-5xl">⚔️</div>
        <h2 className="text-xl font-serif font-bold text-purple-300">The Epic Weapon Awaits</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          The greatest quest in Norrath lies before you — a legendary weapon forged in the fires of three god-tier raids,
          tempered in the essence of dragon, plague, and vampire. One per class. One of a kind. Yours to claim.
        </p>
        {!eligible && (
          <div className="inline-block px-4 py-2 rounded-lg border border-red-700/40 bg-red-950/20 text-sm text-red-400">
            ⚠️ Requires Level 70 — You are Level {characterLevel}
          </div>
        )}
      </div>

      {/* Epic weapon preview */}
      {epicDef && (
        <div className="grid sm:grid-cols-2 gap-4">
          <WeaponShowcase epicDef={epicDef} tier="fabled" />
          <WeaponShowcase epicDef={epicDef} tier="mythical" />
        </div>
      )}

      {/* Quest hook */}
      {epicDef && (
        <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 p-5 space-y-3">
          <div className="text-xs text-amber-600 font-bold uppercase tracking-wide">📜 Quest Hook</div>
          <p className="text-sm text-amber-200/80 italic">"{epicDef.questHook}"</p>
          <div className="text-xs text-slate-500">— {epicDef.questGiver}</div>
        </div>
      )}

      {/* Quest chain summary */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-5 space-y-3">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">The 5-Step Chain</div>
        <ol className="space-y-2">
          {["Reach Level 70", "Defeat 200 Boss Enemies", "Obtain Prismatic Dragon Scale (Harla Dar)", "Obtain Plague Dragon's Spine (Trakanon)", "Obtain Vampire Lord's Fang (Mayong Mistmoore)"].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {eligible && (
        <Button
          onClick={onStart}
          disabled={isStarting}
          className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm py-3"
        >
          {isStarting ? "Beginning the Legend..." : "⚔️ Begin Epic Quest Chain"}
        </Button>
      )}
    </div>
  );
}

// ─── In-Progress Panel ────────────────────────────────────────────────────────

function InProgressPanel({
  state,
  onAdvance,
  onUpgrade,
  isAdvancing,
  isUpgrading,
}: {
  state: EpicQuestState;
  onAdvance: () => void;
  onUpgrade: () => void;
  isAdvancing: boolean;
  isUpgrading: boolean;
}) {
  const { epicDef, steps, currentStep, completed, mythicalAwarded, upgradeRequirements } = state;
  const completedSteps = steps?.filter(s => s.done).length ?? 0;
  const totalSteps = steps?.length ?? 5;
  const overallPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* Overall progress banner */}
      <div className={cn(
        "rounded-xl border p-5",
        completed && mythicalAwarded
          ? "border-orange-500/50 bg-orange-950/10"
          : completed
          ? "border-purple-500/50 bg-purple-950/10"
          : "border-amber-700/40 bg-amber-950/10"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">Epic Quest Progress</div>
            <div className={cn(
              "text-lg font-serif font-bold mt-0.5",
              completed && mythicalAwarded ? "text-orange-300" : completed ? "text-purple-300" : "text-amber-400"
            )}>
              {completed && mythicalAwarded ? "⚡ MYTHICAL ACHIEVED" : completed ? "✨ FABLED COMPLETE" : `Step ${currentStep} of 5`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">{overallPct}%</div>
            <div className="text-[10px] text-slate-600">{completedSteps}/{totalSteps} steps</div>
          </div>
        </div>

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500",
              completed && mythicalAwarded ? "bg-orange-500" : completed ? "bg-purple-600" : "bg-amber-600"
            )}
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Weapon previews */}
      {epicDef && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className={cn("relative", !completed && "opacity-90")}>
            <WeaponShowcase epicDef={epicDef} tier="fabled" />
            {completed && (
              <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded border border-green-600/50 text-green-400 bg-green-950/50">
                AWARDED
              </div>
            )}
          </div>
          <div className={cn("relative", !mythicalAwarded && "opacity-50")}>
            <WeaponShowcase epicDef={epicDef} tier="mythical" />
            {mythicalAwarded && (
              <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded border border-orange-600/50 text-orange-400 bg-orange-950/50">
                FORGED
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quest steps */}
      <div className="space-y-3">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">Quest Chain</div>
        {steps?.map(step => (
          <StepCard
            key={step.step}
            step={step}
            isCurrent={step.step === currentStep && !step.done}
          />
        ))}
      </div>

      {/* Quest hook */}
      {epicDef && (
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 space-y-2">
          <div className="text-xs text-amber-700 font-bold">📜 {epicDef.questGiver}</div>
          <p className="text-xs text-amber-300/70 italic">"{epicDef.questHook}"</p>
        </div>
      )}

      {/* Action buttons */}
      {!completed && (
        <Button
          onClick={onAdvance}
          disabled={isAdvancing}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold"
        >
          {isAdvancing ? "Checking progress..." : "🔍 Check Quest Progress"}
        </Button>
      )}

      {/* Upgrade section */}
      {completed && !mythicalAwarded && upgradeRequirements && (
        <UpgradePanel
          upgradeRequirements={upgradeRequirements}
          onUpgrade={onUpgrade}
          isUpgrading={isUpgrading}
        />
      )}

      {completed && mythicalAwarded && (
        <div className="rounded-xl border border-orange-500/40 bg-orange-950/10 p-5 text-center space-y-2">
          <div className="text-3xl">⚡</div>
          <div className="text-orange-300 font-serif font-bold">Your Epic Weapon Journey is Complete</div>
          <p className="text-xs text-slate-400">You wield the mightiest weapon in all of Norrath. The gods themselves take notice.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EpicQuestPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const { data: state, isLoading } = useQuery<EpicQuestState>({
    queryKey: ["epic-quest"],
    queryFn: () => fetch(apiUrl("/api/epic-quest"), { credentials: "include" }).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const showMsg = (text: string, type: "success" | "error" | "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  };

  const startMut = useMutation({
    mutationFn: () =>
      fetch(apiUrl("/api/epic-quest/start"), { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) return showMsg(data.error, "error");
      showMsg(data.message ?? "Epic quest started!", "success");
      queryClient.invalidateQueries({ queryKey: ["epic-quest"] });
    },
    onError: () => showMsg("Failed to start epic quest.", "error"),
  });

  const advanceMut = useMutation({
    mutationFn: () =>
      fetch(apiUrl("/api/epic-quest/advance"), { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) return showMsg(data.error, "error");
      showMsg(data.message ?? "Progress checked.", data.newlyCompleted ? "success" : "info");
      queryClient.invalidateQueries({ queryKey: ["epic-quest"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: () => showMsg("Failed to check progress.", "error"),
  });

  const upgradeMut = useMutation({
    mutationFn: () =>
      fetch(apiUrl("/api/epic-quest/upgrade"), { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) return showMsg(data.error, "error");
      showMsg(data.message ?? "Mythical weapon forged!", "success");
      queryClient.invalidateQueries({ queryKey: ["epic-quest"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: () => showMsg("Failed to upgrade weapon.", "error"),
  });

  const msgColors = {
    success: "bg-green-950/30 border-green-700/50 text-green-300",
    error: "bg-red-950/30 border-red-700/50 text-red-300",
    info: "bg-amber-950/30 border-amber-700/50 text-amber-300",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">⚔️ Epic Weapon Quest</h1>
        <p className="text-slate-400 text-sm mt-1">
          The ultimate endgame — forge a legendary weapon worthy of the greatest champion in Norrath.
          Level 70 required. Three raids. One epic weapon. Upgradeable to Mythical.
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div className={cn("p-4 rounded-lg border text-sm", msgColors[message.type])}>
          {message.text}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : !state ? (
        <Card className="border-slate-800 bg-card/40">
          <CardContent className="p-8 text-center text-slate-500">
            Failed to load epic quest data. Try refreshing.
          </CardContent>
        </Card>
      ) : !state.started ? (
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardContent className="p-6">
            <NotStartedPanel
              eligible={state.eligible ?? false}
              characterLevel={state.characterLevel ?? 1}
              characterClass={state.characterClass ?? ""}
              epicDef={state.epicDef ?? null}
              onStart={() => startMut.mutate()}
              isStarting={startMut.isPending}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-card/40 backdrop-blur">
          <CardContent className="p-6">
            <InProgressPanel
              state={state}
              onAdvance={() => advanceMut.mutate()}
              onUpgrade={() => upgradeMut.mutate()}
              isAdvancing={advanceMut.isPending}
              isUpgrading={upgradeMut.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Lore footer */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-5 text-center space-y-2">
        <div className="text-xs text-slate-600 uppercase tracking-widest font-bold">The Epic Weapons of Norrath</div>
        <p className="text-xs text-slate-700 max-w-lg mx-auto">
          Inspired by the legendary EQ2 Epic 1.0 weapons — weapons forged through sacrifice, skill, and the defeat of
          Norrath's mightiest raid bosses. There is no greater achievement for a champion of your class.
        </p>
      </div>
    </div>
  );
}
