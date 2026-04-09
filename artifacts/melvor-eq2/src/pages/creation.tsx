import * as React from "react";
import { useLocation } from "wouter";
import { useGetCreationOptions, useCreateCharacter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ARCHETYPE_COLORS: Record<string, string> = {
  Fighter: "border-red-700/60 bg-red-900/20 hover:border-red-500",
  Scout: "border-green-700/60 bg-green-900/20 hover:border-green-500",
  Mage: "border-blue-700/60 bg-blue-900/20 hover:border-blue-500",
  Priest: "border-amber-700/60 bg-amber-900/20 hover:border-amber-500",
};

const ARCHETYPE_SELECTED: Record<string, string> = {
  Fighter: "border-red-500 bg-red-900/40 ring-2 ring-red-500/30",
  Scout: "border-green-500 bg-green-900/40 ring-2 ring-green-500/30",
  Mage: "border-blue-500 bg-blue-900/40 ring-2 ring-blue-500/30",
  Priest: "border-amber-500 bg-amber-900/40 ring-2 ring-amber-500/30",
};

const ARCHETYPE_ICONS: Record<string, string> = {
  Fighter: "⚔️", Scout: "🏹", Mage: "🔮", Priest: "✨",
};

const ALIGNMENT_COLORS: Record<string, string> = {
  Qeynos: "border-sky-600 bg-sky-900/30 text-sky-300",
  Freeport: "border-red-700 bg-red-900/30 text-red-300",
  Neutral: "border-slate-600 bg-slate-800/30 text-slate-300",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-400", uncommon: "text-green-400", rare: "text-blue-400",
  legendary: "text-purple-400", fabled: "text-orange-400", mythical: "text-red-400",
};

export default function CharacterCreation() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { data: options, isLoading } = useGetCreationOptions();
  const createCharacter = useCreateCharacter();

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = React.useState("");
  const [selectedRace, setSelectedRace] = React.useState<string | null>(null);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  const [selectedAlignment, setSelectedAlignment] = React.useState<string>("Neutral");
  const [filterArchetype, setFilterArchetype] = React.useState<string | null>(null);

  const race = options?.races?.find((r: any) => r.id === selectedRace);
  const cls = options?.classes?.find((c: any) => c.id === selectedClass);

  const filteredClasses = options?.classes?.filter((c: any) => !filterArchetype || c.archetype === filterArchetype) ?? [];

  const archetypes = [...new Set((options?.classes ?? []).map((c: any) => c.archetype))];

  const canProceed = step === 1 ? name.trim().length >= 2
    : step === 2 ? !!selectedRace
    : step === 3 ? !!selectedClass
    : !!selectedAlignment;

  const handleCreate = async () => {
    if (!name || !selectedRace || !selectedClass || !selectedAlignment) return;
    try {
      await createCharacter.mutateAsync({
        data: { name: name.trim(), raceId: selectedRace, classId: selectedClass, alignment: selectedAlignment }
      });
      queryClient.invalidateQueries();
      await refreshUser();
      navigate("/");
    } catch (e) {
      console.error("Creation failed", e);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Skeleton className="w-96 h-64" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-serif font-bold text-amber-400 tracking-wider drop-shadow-lg">Create Your Hero</h1>
        <p className="text-slate-400 mt-1">Norrath awaits, adventurer</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[["1", "Name"], ["2", "Race"], ["3", "Class"], ["4", "Alignment"]].map(([s, label], i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
              step === i + 1 ? "border-amber-500 bg-amber-900/50 text-amber-400" :
              i + 1 < step ? "border-green-600 bg-green-900/30 text-green-400" :
              "border-slate-700 text-slate-600"
            )}>{s}</div>
            <span className="text-xs text-slate-500 hidden sm:block">{label}</span>
            {i < 3 && <div className="w-4 h-px bg-slate-700 mx-1" />}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-4xl bg-slate-900/80 border-slate-800 backdrop-blur">
        <AnimatePresence mode="wait">
          {/* Step 1: Name */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CardHeader><CardTitle className="text-amber-400">Choose Your Name</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4 py-8">
                <p className="text-slate-400 text-sm">Your name will be known throughout Norrath. Choose wisely.</p>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="bg-slate-950 border-slate-700 text-slate-200 text-lg max-w-sm focus:border-amber-500"
                  maxLength={32}
                  onKeyDown={e => e.key === "Enter" && canProceed && setStep(2)}
                  autoFocus
                />
                {name.length > 0 && name.length < 2 && <p className="text-red-400 text-xs">Name must be at least 2 characters</p>}
              </CardContent>
            </motion.div>
          )}

          {/* Step 2: Race */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CardHeader><CardTitle className="text-amber-400">Choose Your Race</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                  {options?.races?.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRace(r.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        selectedRace === r.id
                          ? "border-amber-500 bg-amber-900/30 ring-2 ring-amber-500/30"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      )}
                    >
                      <div className="font-semibold text-sm text-slate-200">{r.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</div>
                      <div className="mt-2 text-xs text-amber-400/80">{r.racialAbility}</div>
                    </button>
                  ))}
                </div>
                {race && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-amber-500/30">
                    <p className="text-xs text-slate-400">{race.lore}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(race.bonuses as unknown as Record<string, number>).filter(([, v]) => v !== 0).map(([k, v]) => (
                        <span key={k} className={cn("text-xs px-1.5 py-0.5 rounded", v > 0 ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400")}>
                          {k}: {v > 0 ? "+" : ""}{v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}

          {/* Step 3: Class */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CardHeader>
                <CardTitle className="text-amber-400">Choose Your Class</CardTitle>
                <div className="flex gap-2 flex-wrap mt-2">
                  <button onClick={() => setFilterArchetype(null)} className={cn("px-3 py-1 rounded text-xs font-medium border transition-colors", !filterArchetype ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400")}>All</button>
                  {archetypes.map(a => (
                    <button key={a} onClick={() => setFilterArchetype(filterArchetype === a ? null : a as string)}
                      className={cn("px-3 py-1 rounded text-xs font-medium border transition-colors",
                        filterArchetype === a ? `${ARCHETYPE_SELECTED[a as string]}` : `border-slate-700 text-slate-400 ${ARCHETYPE_COLORS[a as string]}`
                      )}>
                      {ARCHETYPE_ICONS[a as string]} {a as string}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredClasses.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClass(c.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        selectedClass === c.id
                          ? ARCHETYPE_SELECTED[c.archetype]
                          : `border-slate-700 bg-slate-800/50 hover:border-slate-600 ${ARCHETYPE_COLORS[c.archetype]}`
                      )}
                    >
                      <div className="font-semibold text-sm text-slate-200">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.archetype} • {c.role}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</div>
                    </button>
                  ))}
                </div>
                {cls && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-amber-500/30">
                    <p className="text-xs text-slate-400">{cls.lore}</p>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}

          {/* Step 4: Alignment */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CardHeader><CardTitle className="text-amber-400">Choose Your Allegiance</CardTitle></CardHeader>
              <CardContent className="py-6">
                <div className="grid grid-cols-3 gap-4">
                  {(options?.alignments || ["Qeynos", "Freeport", "Neutral"]).map((alignment: string) => (
                    <button
                      key={alignment}
                      onClick={() => setSelectedAlignment(alignment)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        selectedAlignment === alignment
                          ? `${ALIGNMENT_COLORS[alignment]} ring-2 ring-offset-1 ring-offset-slate-900 ring-current`
                          : "border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600"
                      )}
                    >
                      <div className="text-3xl mb-2">{alignment === "Qeynos" ? "🛡️" : alignment === "Freeport" ? "⚔️" : "⚖️"}</div>
                      <div className="font-bold">{alignment}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {alignment === "Qeynos" ? "City of good, home of paladins and rangers" :
                         alignment === "Freeport" ? "City of power, home of shadowknights and assassins" :
                         "Walk your own path, neither good nor evil"}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-900/10">
                  <h3 className="text-amber-400 font-semibold mb-2">Character Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Name:</span> <span className="text-slate-200">{name}</span></div>
                    <div><span className="text-slate-500">Race:</span> <span className="text-slate-200 capitalize">{race?.name}</span></div>
                    <div><span className="text-slate-500">Class:</span> <span className="text-slate-200">{cls?.name}</span></div>
                    <div><span className="text-slate-500">Archetype:</span> <span className="text-slate-200">{cls?.archetype}</span></div>
                    <div><span className="text-slate-500">Alignment:</span> <span className="text-slate-200">{selectedAlignment}</span></div>
                    <div><span className="text-slate-500">Role:</span> <span className="text-slate-200 capitalize">{cls?.role}</span></div>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between p-6 pt-0">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1}
            className="border-slate-700"
          >
            ← Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4)}
              disabled={!canProceed}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold"
            >
              Continue →
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceed || createCharacter.isPending}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold px-8"
            >
              {createCharacter.isPending ? "Creating..." : "🗡️ Enter Norrath"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
