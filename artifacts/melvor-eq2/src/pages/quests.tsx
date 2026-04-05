import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

interface QuestObjective {
  text: string;
  completed: boolean;
  progress: number;
  total: number;
  type: "kill" | "collect" | "talk" | "explore";
  target?: string;
}

interface Quest {
  id: number;
  title: string;
  description: string;
  objectives: QuestObjective[] | string[];
  rewards: { xp?: number; gold?: number; item?: string };
  zone: string;
  difficulty: string;
  completed: boolean;
  completedAt?: string | null;
  lore?: string | null;
  createdAt: string;
}

function normalizeObjective(obj: QuestObjective | string): QuestObjective {
  if (typeof obj === "string") {
    return { text: obj, completed: false, progress: 0, total: 1, type: "explore" };
  }
  return obj;
}

const DIFF_STYLES: Record<string, string> = {
  easy:   "text-green-400 border-green-800/60 bg-green-950/20",
  normal: "text-blue-400 border-blue-800/60 bg-blue-950/20",
  hard:   "text-amber-400 border-amber-800/60 bg-amber-950/20",
  epic:   "text-purple-400 border-purple-800/60 bg-purple-950/20",
};

const DIFF_ICONS: Record<string, string> = {
  easy: "🌿", normal: "⚔️", hard: "🔥", epic: "💀",
};

function QuestCard({ quest, onComplete }: { quest: Quest; onComplete: (id: number) => void }) {
  const [lorOpen, setLoreOpen] = React.useState(false);
  const diffStyle = DIFF_STYLES[quest.difficulty] ?? "text-slate-400 border-slate-700 bg-slate-900/20";
  const diffIcon = DIFF_ICONS[quest.difficulty] ?? "📜";

  return (
    <Card className={cn(
      "border-slate-800 bg-card/40 backdrop-blur transition-all",
      quest.completed ? "opacity-60" : "hover:border-slate-700"
    )}>
      <CardHeader className="pb-2 border-b border-slate-800/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={cn("text-sm", quest.completed ? "text-slate-500 line-through" : "text-slate-200")}>
              {quest.title}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", diffStyle)}>
                {diffIcon} {quest.difficulty}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500">
                📍 {quest.zone}
              </span>
              {quest.completed && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-800/50 text-green-500 bg-green-950/20">
                  ✓ Complete
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {quest.rewards.xp && <div className="text-xs text-amber-400 font-bold">+{quest.rewards.xp.toLocaleString()} XP</div>}
            {quest.rewards.gold && <div className="text-xs text-yellow-500">+{quest.rewards.gold.toLocaleString()}g</div>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-slate-400">{quest.description}</p>

        {/* Objectives */}
        <div className="space-y-2">
          {quest.objectives.map((rawObj, i) => {
            const obj = normalizeObjective(rawObj as QuestObjective | string);
            const isDone = obj.completed || quest.completed;
            const hasProgress = obj.total > 1;
            const typeIcon = { kill: "⚔️", collect: "📦", talk: "💬", explore: "🗺️", faction: "🤝" }[obj.type as string] ?? "○";

            return (
              <div key={i} className="space-y-0.5">
                <div className="flex items-start gap-2 text-xs">
                  <span className={cn("shrink-0 mt-0.5 text-[10px]", isDone ? "text-green-500" : "text-slate-600")}>
                    {isDone ? "✓" : typeIcon}
                  </span>
                  <span className={cn("flex-1", isDone ? "text-slate-600 line-through" : "text-slate-300")}>
                    {obj.text}
                  </span>
                  {hasProgress && !isDone && (
                    <span className="shrink-0 text-[10px] text-slate-500 tabular-nums">
                      {obj.progress}/{obj.total}
                    </span>
                  )}
                </div>
                {hasProgress && !isDone && (
                  <div className="ml-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-700/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (obj.progress / obj.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lore toggle */}
        {quest.lore && (
          <div>
            <button
              onClick={() => setLoreOpen(p => !p)}
              className="text-[11px] text-amber-600 hover:text-amber-400 transition-colors"
            >
              {lorOpen ? "▾ Hide Lore" : "▸ Show Lore"}
            </button>
            {lorOpen && (
              <div className="mt-2 p-2 rounded border border-amber-900/40 bg-amber-950/10 text-xs text-amber-300/80 italic">
                {quest.lore}
              </div>
            )}
          </div>
        )}

        {/* Complete button — only enabled when all objectives done */}
        {!quest.completed && (() => {
          const objs = quest.objectives.map(normalizeObjective);
          const allDone = objs.length === 0 || objs.every(o => o.completed);
          return (
            <Button
              size="sm"
              disabled={!allDone}
              className={
                allDone
                  ? "w-full bg-amber-700 hover:bg-amber-600 text-white text-xs h-8"
                  : "w-full bg-slate-800 text-slate-600 text-xs h-8 cursor-not-allowed"
              }
              onClick={() => allDone && onComplete(quest.id)}
            >
              {allDone ? "Complete Quest — Claim Rewards" : `${objs.filter(o => !o.completed).length} objective${objs.filter(o => !o.completed).length !== 1 ? "s" : ""} remaining`}
            </Button>
          );
        })()}
        {quest.completed && quest.completedAt && (
          <p className="text-[10px] text-slate-700 text-center">
            Completed {new Date(quest.completedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── NPC Dialogue Panel ──────────────────────────────────────────────────────

const SHOP_NPCS = [
  { name: "Merchant Tolin", role: "merchant", zone: "Commonlands" },
  { name: "Trader Aelwyn", role: "merchant", zone: "Antonica" },
  { name: "Quartermaster Dak", role: "quartermaster", zone: "Thundering Steppes" },
  { name: "Dark Trader Xel", role: "shadowy merchant", zone: "Nektulos Forest" },
  { name: "Frost Merchant Bjorn", role: "nordic merchant", zone: "Everfrost Peaks" },
  { name: "Captain Leothyn", role: "guard captain", zone: "Qeynos" },
  { name: "Lorekeeper Zalith", role: "lore scholar", zone: "Commonlands" },
];

function NpcDialoguePanel() {
  const [selectedNpc, setSelectedNpc] = React.useState(SHOP_NPCS[0]);
  const [message, setMessage] = React.useState("");
  const [history, setHistory] = React.useState<Array<{ speaker: string; text: string }>>([]);
  const [loading, setLoading] = React.useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setMessage("");
    setHistory(h => [...h, { speaker: "You", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/npc/dialogue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npcName: selectedNpc.name, npcRole: selectedNpc.role, playerMessage: userMsg }),
      });
      const data = await res.json();
      setHistory(h => [...h, { speaker: selectedNpc.name, text: data.reply }]);
    } catch {
      setHistory(h => [...h, { speaker: "System", text: "Failed to get response." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-amber-400 font-serif font-bold mb-1">Talk to an NPC</h2>
        <p className="text-slate-500 text-xs">Engage with the inhabitants of Norrath — merchants, guards, scholars, and more.</p>
      </div>

      {/* NPC selector */}
      <div className="flex flex-wrap gap-2">
        {SHOP_NPCS.map(npc => (
          <button
            key={npc.name}
            onClick={() => { setSelectedNpc(npc); setHistory([]); }}
            className={cn(
              "px-3 py-1 rounded-lg text-xs border transition-colors",
              selectedNpc.name === npc.name
                ? "border-amber-600 text-amber-400 bg-amber-900/20"
                : "border-slate-700 text-slate-400 hover:border-slate-600"
            )}
          >
            {npc.name}
          </button>
        ))}
      </div>

      {/* Chat history */}
      <div className="h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-3">
        {history.length === 0 && (
          <div className="text-center text-slate-600 text-xs mt-8">
            Speak with {selectedNpc.name}, a {selectedNpc.role} from {selectedNpc.zone}
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={cn("", msg.speaker === "You" ? "text-right" : "")}>
            <div className={cn("inline-block max-w-[80%] p-2 rounded-lg text-xs",
              msg.speaker === "You"
                ? "bg-slate-800 text-slate-200"
                : msg.speaker === "System"
                ? "bg-red-950/30 text-red-400 border border-red-900"
                : "bg-amber-950/20 border border-amber-900/30 text-amber-200"
            )}>
              <span className={cn("block text-[10px] mb-1 font-bold",
                msg.speaker === "You" ? "text-slate-500" : "text-amber-600"
              )}>{msg.speaker}</span>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="inline-block bg-amber-950/20 border border-amber-900/30 p-2 rounded-lg">
              <div className="flex gap-1 items-center text-amber-600 text-xs">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>●</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
          placeholder={`Say something to ${selectedNpc.name}...`}
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-700"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !message.trim()}
          className="bg-amber-700 hover:bg-amber-600 text-white text-xs px-4"
        >
          {loading ? "..." : "Talk"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const queryClient = useQueryClient();
  const questsQ = useQuery<Quest[]>({
    queryKey: ["quests"],
    queryFn: () => fetch(apiUrl("/api/quests")).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const [generating, setGenerating] = React.useState(false);
  const [genMsg, setGenMsg] = React.useState<string | null>(null);
  const [completing, setCompleting] = React.useState<number | null>(null);
  const [completeMsg, setCompleteMsg] = React.useState<string | null>(null);
  const bootstrapped = React.useRef(false);

  const quests: Quest[] = Array.isArray(questsQ.data) ? questsQ.data : [];
  const active = quests.filter(q => !q.completed);

  // Auto-bootstrap: generate quests on first load if fewer than 3 active
  React.useEffect(() => {
    if (bootstrapped.current) return;
    if (!Array.isArray(questsQ.data)) return;
    bootstrapped.current = true;
    const activeCount = questsQ.data.filter(q => !q.completed).length;
    if (activeCount < 3) {
      setGenerating(true);
      fetch(apiUrl("/api/quests/generate"), { method: "POST" })
        .then(r => r.ok ? r.json() : null)
        .then(() => { queryClient.invalidateQueries({ queryKey: ["quests"] }); })
        .catch(() => {})
        .finally(() => setGenerating(false));
    }
  }, [questsQ.data, queryClient]);

  const completed = quests.filter(q => q.completed);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch(apiUrl("/api/quests/generate"), { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      setGenMsg("New quest added by the Game Master!");
      queryClient.invalidateQueries({ queryKey: ["quests"] });
    } catch {
      setGenMsg("Failed to generate quest. Try again.");
    } finally {
      setGenerating(false);
      setTimeout(() => setGenMsg(null), 4000);
    }
  };

  const handleComplete = async (id: number) => {
    setCompleting(id);
    try {
      const res = await fetch(`/api/quests/${id}/complete`, { method: "PATCH" });
      const data = await res.json();
      setCompleteMsg(data.message ?? "Quest completed!");
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
    } catch {
      setCompleteMsg("Failed to complete quest.");
    } finally {
      setCompleting(null);
      setTimeout(() => setCompleteMsg(null), 4000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-amber-400">📜 Game Master Quests</h1>
          <p className="text-slate-400 text-sm mt-1">AI-generated adventures tailored to your character — lore-rich, reward-filled.</p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-amber-700 hover:bg-amber-600 text-white"
        >
          {generating ? "The GM is writing..." : "✨ Generate Quest"}
        </Button>
      </div>

      {genMsg && (
        <div className={cn("p-3 rounded border text-sm", genMsg.startsWith("Failed") ? "bg-red-900/30 border-red-700 text-red-300" : "bg-green-900/30 border-green-700 text-green-300")}>
          {genMsg}
        </div>
      )}
      {completeMsg && (
        <div className="p-3 rounded border text-sm bg-amber-900/30 border-amber-700 text-amber-300">
          {completeMsg}
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="active" className="data-[state=active]:text-amber-400">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:text-amber-400">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="npc" className="data-[state=active]:text-amber-400">
            Talk to NPC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {questsQ.isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-60" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-4">📜</div>
              <p className="text-lg font-medium text-slate-400">No active quests</p>
              <p className="text-sm mt-1">Click "Generate Quest" to get a new adventure from the Game Master</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {active.map(q => (
                <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completed.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p>No completed quests yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {completed.map(q => (
                <QuestCard key={q.id} quest={q} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="npc" className="mt-4">
          <Card className="border-slate-800 bg-card/40 backdrop-blur">
            <CardContent className="p-6">
              <NpcDialoguePanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
