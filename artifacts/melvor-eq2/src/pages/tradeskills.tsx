import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { Hammer, Shield, Scissors, Gem, FlaskConical, Clock, Package, ShoppingBag, BookOpen, Loader2, RotateCcw, Sparkles, Star, Leaf, PlayCircle, StopCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradeskillLevel {
  xp: number;
  level: number;
}

interface TradeskillStatus {
  tradeskillClass: string | null;
  tradeskills: Record<string, TradeskillLevel>;
  queueCount: number;
}

interface TradeskillMaterial {
  id: string;
  name: string;
  description: string;
  spriteId: string;
  vendorCost: number;
  usedBy: string[];
}

interface RecipeIngredient {
  itemId: string;
  quantity: number;
  have?: number;
  canCraft?: boolean;
}

interface RecipeOutput {
  name: string;
  description: string;
  type: string;
  slot: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  stats: Record<string, number>;
  sellPrice: number;
  armorType?: string;
  quantity: number;
  xpGained: number;
  spriteId?: string;
  stackable?: boolean;
  effect?: { type: string; value: number };
}

interface Recipe {
  id: number;
  name: string;
  tradeskillClass: string;
  tier: string;
  minSkill: number;
  minLevel: number;
  craftTimeSeconds: number;
  ingredients: RecipeIngredient[];
  output: RecipeOutput;
  vendorCost: number | null;
  canCraft?: boolean;
  isOoak?: boolean;
  claimedBy?: string | null;
}

interface QueueEntry {
  id: number;
  recipeId: number;
  quantity: number;
  quantityCompleted: number;
  startedAt: string;
  nextCompletesAt: string;
  status: string;
  recipeName: string;
  craftTimeSeconds: number;
  quality?: QualityLabel;
  isMasterwork?: boolean;
  suffix?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_INFO: Record<string, { label: string; description: string; icon: React.ElementType; makes: string }> = {
  weaponsmith: {
    label: "Weaponsmith",
    description: "Forge weapons of war from raw metal.",
    icon: Hammer,
    makes: "Swords, axes, hammers, staves",
  },
  armorer: {
    label: "Armorer",
    description: "Craft sturdy plate and chain armor.",
    icon: Shield,
    makes: "Helms, chestplates, greaves",
  },
  tailor: {
    label: "Tailor",
    description: "Weave cloth and leather into protective garments.",
    icon: Scissors,
    makes: "Robes, vests, hoods, leggings",
  },
  jeweler: {
    label: "Jeweler",
    description: "Cut gems and shape metal into fine accessories.",
    icon: Gem,
    makes: "Rings, earrings, pendants, chokers",
  },
  alchemist: {
    label: "Alchemist",
    description: "Brew powerful potions and elixirs.",
    icon: FlaskConical,
    makes: "Health potions, elixirs, flasks",
  },
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-amber-400",
};

const RARITY_BADGE_VARIANTS: Record<string, "secondary" | "outline"> = {
  common: "secondary",
  uncommon: "outline",
  rare: "outline",
  legendary: "outline",
};

type QualityLabel = "poor" | "normal" | "fine" | "excellent";
const QUALITY_COLORS: Record<QualityLabel, string> = {
  poor: "text-gray-400",
  normal: "text-slate-200",
  fine: "text-green-400",
  excellent: "text-blue-400",
};

function rarityClass(rarity: string): string {
  return RARITY_COLORS[rarity] ?? "text-gray-300";
}

function formatSeconds(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function xpToNextLevel(currentXp: number, currentLevel: number): number {
  // level = floor(sqrt(xp/25)), so xp for level N = N*N*25
  const nextLevelXp = (currentLevel + 1) * (currentLevel + 1) * 25;
  return Math.max(0, nextLevelXp - currentXp);
}

function xpThisLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 25;
}

function xpNextLevelTotal(currentLevel: number): number {
  return (currentLevel + 1) * (currentLevel + 1) * 25;
}

function levelProgress(xp: number, level: number): number {
  if (level >= 100) return 100;
  const base = xpThisLevel(level);
  const next = xpNextLevelTotal(level);
  return Math.min(100, ((xp - base) / (next - base)) * 100);
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

async function deleteJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Gathering types ──────────────────────────────────────────────────────────

interface GatheringNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  skillId: string;
  requiredLevel: number;
  xpPerGather: number;
  gatherTimeSeconds: number;
  unlocked: boolean;
  skillLevel: number;
  nextTickIn: number;
  zone?: string;
  yields: Array<{ itemId: string; baseQuantity: number; weight: number }>;
}

interface GatheringSession {
  skillId: string;
  nodeId: string;
  nodeName: string;
  nodeIcon: string;
  gatherTimeSeconds: number;
  skillLevel: number;
  nextTickIn: number;
  totalGathered: number;
}

interface GatheringStatus {
  sessions: GatheringSession[];
  yields: Array<{ skillId: string; nodeId: string; items: Array<{ itemId: string; quantity: number }>; rareItemIds: string[] }>;
}

const TRADESKILL_HARVEST_NODE_IDS = new Set([
  "shadowroot_tree", "emberstone_outcrop", "frostbloom_meadow", "manaweave_grove",
  "venom_nest", "astral_vein", "corrupted_hunting_ground", "glimmerdust_hollow",
  "deepmoss_cave", "thornvine_thicket",
]);

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClassPicker({ onPick }: { onPick: (cls: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-amber-400">Choose Your Tradeskill</h2>
        <p className="text-slate-400 text-sm mt-1">This choice is permanent. Pick the craft that suits your playstyle.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(CLASS_INFO).map(([key, info]) => {
          const Icon = info.icon;
          return (
            <Card
              key={key}
              className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-colors cursor-pointer"
              onClick={() => onPick(key)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-amber-400" />
                  <CardTitle className="text-amber-300 text-base">{info.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-slate-300 text-sm">{info.description}</p>
                <p className="text-slate-400 text-xs">Makes: {info.makes}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SkillHeader({
  status,
  onReset,
  resetting,
}: {
  status: TradeskillStatus;
  onReset: () => void;
  resetting: boolean;
}) {
  const cls = status.tradeskillClass!;
  const info = CLASS_INFO[cls];
  const Icon = info?.icon ?? Hammer;
  const tsLevel = status.tradeskills[cls];
  const level = tsLevel?.level ?? 0;
  const xp = tsLevel?.xp ?? 0;
  const progress = levelProgress(xp, level);
  const xpNeeded = xpToNextLevel(xp, level);

  return (
    <div className="bg-slate-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 text-amber-400" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-semibold text-lg">{info?.label ?? cls}</span>
            <Badge variant="outline" className="text-amber-400 border-amber-400">
              Level {level}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-slate-400 text-xs whitespace-nowrap">
              {level < 100 ? `${xpNeeded.toLocaleString()} XP to next` : "Max Level"}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-red-700 text-red-400 hover:bg-red-900/30 text-xs"
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Class
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function MaterialCard({
  material,
  onBuy,
  buying,
}: {
  material: TradeskillMaterial;
  onBuy: (id: string, qty: number) => void;
  buying: boolean;
}) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-slate-200 font-medium text-sm truncate">{material.name}</div>
          <div className="text-slate-400 text-xs truncate">{material.description}</div>
          <div className="text-amber-400 text-xs mt-0.5">{material.vendorCost}g each</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-600 text-amber-400 hover:bg-amber-900/30"
          onClick={() => onBuy(material.id, 10)}
          disabled={buying}
        >
          {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buy 10"}
        </Button>
      </CardContent>
    </Card>
  );
}

function VendorRecipeCard({
  recipe,
  onBuy,
  buying,
}: {
  recipe: Recipe;
  onBuy: (id: number) => void;
  buying: boolean;
}) {
  const output = recipe.output;
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-200 font-medium text-sm">{recipe.name}</span>
              <Badge
                variant={RARITY_BADGE_VARIANTS[output.rarity] ?? "secondary"}
                className={rarityClass(output.rarity)}
              >
                {output.rarity}
              </Badge>
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              Requires skill {recipe.minSkill} · Level {recipe.minLevel}
            </div>
            <div className="text-slate-400 text-xs">
              Craft time: {formatSeconds(recipe.craftTimeSeconds)} · {output.xpGained} XP
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-600 text-amber-400 hover:bg-amber-900/30"
            onClick={() => onBuy(recipe.id)}
            disabled={buying}
          >
            {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : `${recipe.vendorCost}g`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KnownRecipeCard({
  recipe,
  onCraft,
  crafting,
  queueFull,
}: {
  recipe: Recipe;
  onCraft: (id: number) => void;
  crafting: boolean;
  queueFull: boolean;
}) {
  const output = recipe.output;
  const canCraft = recipe.canCraft ?? false;
  const isOoak = recipe.isOoak === true;
  const isMaster = recipe.tier === "master";

  const cardBorder = isOoak
    ? "border-yellow-500 bg-yellow-950/20 shadow-[0_0_12px_2px_rgba(234,179,8,0.25)]"
    : isMaster
    ? "border-purple-600 bg-purple-950/20"
    : "border-slate-700 bg-slate-800";

  return (
    <Card className={`${cardBorder}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isOoak && <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />}
              <span className={`font-medium text-sm ${isOoak ? "text-yellow-300" : isMaster ? "text-purple-300" : "text-slate-200"}`}>
                {output.name}
              </span>
              <Badge
                variant={RARITY_BADGE_VARIANTS[output.rarity] ?? "secondary"}
                className={rarityClass(output.rarity)}
              >
                {output.rarity}
              </Badge>
              {isOoak && (
                <Badge className="bg-yellow-700/60 text-yellow-200 border-yellow-600 text-xs">
                  ✦ Legendary
                </Badge>
              )}
              {isMaster && !isOoak && (
                <Badge className="bg-purple-800/60 text-purple-200 border-purple-600 text-xs">
                  Master
                </Badge>
              )}
            </div>
            <div className="text-slate-400 text-xs">{output.description}</div>
          </div>
          <Button
            size="sm"
            className={`shrink-0 ${isOoak ? "bg-yellow-600 hover:bg-yellow-700 text-black" : "bg-amber-600 hover:bg-amber-700 text-white"}`}
            onClick={() => onCraft(recipe.id)}
            disabled={!canCraft || crafting || queueFull}
            title={queueFull ? "Queue full (max 5)" : !canCraft ? "Missing materials" : ""}
          >
            {crafting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Craft 1"}
          </Button>
        </div>

        {/* Ingredients */}
        <div className="space-y-1">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wide">Ingredients</div>
          <div className="flex flex-wrap gap-2">
            {recipe.ingredients.map(ing => (
              <span
                key={ing.itemId}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  (ing.have ?? 0) >= ing.quantity
                    ? "border-green-600 text-green-400 bg-green-950/30"
                    : "border-red-700 text-red-400 bg-red-950/30"
                }`}
              >
                {ing.itemId.replace(/^ts_/, "").replace(/_/g, " ")} {ing.have ?? 0}/{ing.quantity}
              </span>
            ))}
          </div>
        </div>

        {/* Stats preview */}
        {Object.keys(output.stats).length > 0 && (
          <div className="text-slate-400 text-xs flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(output.stats).map(([k, v]) => (
              <span key={k}>
                <span className="text-slate-300">{v > 0 ? "+" : ""}{v}</span> {k.replace(/([A-Z])/g, " $1").trim()}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatSeconds(recipe.craftTimeSeconds)}
          </span>
          <span>{output.xpGained} XP</span>
          <span>{output.sellPrice}g sell</span>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  entry,
  onCancel,
  cancelling,
}: {
  entry: QueueEntry;
  onCancel: (id: number) => void;
  cancelling: boolean;
}) {
  const now = Date.now();
  const nextMs = new Date(entry.nextCompletesAt).getTime();
  const secLeft = Math.max(0, Math.ceil((nextMs - now) / 1000));
  const progress = entry.quantity > 0
    ? Math.round((entry.quantityCompleted / entry.quantity) * 100)
    : 0;

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    if (secLeft <= 0) return;
    const t = setInterval(forceUpdate, 1000);
    return () => clearInterval(t);
  }, [secLeft]);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-200 font-medium text-sm">
              {entry.recipeName}
              {entry.isMasterwork && (
                <span className="ml-1 text-amber-400 text-xs font-bold">✦ Masterwork</span>
              )}
            </div>
            {entry.quality && entry.quality !== "normal" && (
              <div className={`text-xs ${QUALITY_COLORS[entry.quality] ?? "text-slate-400"}`}>
                {entry.quality.charAt(0).toUpperCase() + entry.quality.slice(1)} quality
              </div>
            )}
            <div className="text-slate-400 text-xs">
              {entry.quantityCompleted}/{entry.quantity} complete
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-700 text-red-400 hover:bg-red-950/30"
            onClick={() => onCancel(entry.id)}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel"}
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {secLeft > 0 ? `Next in ${formatSeconds(secLeft)}` : "Completing..."}
        </div>
      </CardContent>
    </Card>
  );
}

function HarvestNodeCard({
  node,
  session,
  isActive,
  onStart,
  onStop,
}: {
  node: GatheringNode;
  session?: GatheringSession;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  // Track when the session data was received so we can compute elapsed time
  const fetchedAtRef = React.useRef<number>(Date.now());
  const prevNextTickIn = React.useRef<number | undefined>(undefined);

  // Reset fetchedAt whenever nextTickIn changes (new data arrived)
  if (session?.nextTickIn !== prevNextTickIn.current) {
    fetchedAtRef.current = Date.now();
    prevNextTickIn.current = session?.nextTickIn;
  }

  React.useEffect(() => {
    if (!isActive) return;
    const t = setInterval(forceUpdate, 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const secLeft = session
    ? Math.max(0, Math.round(session.nextTickIn - (Date.now() - fetchedAtRef.current) / 1000))
    : 0;

  return (
    <Card className={`${isActive ? "border-green-600 bg-green-950/20" : "border-slate-700 bg-slate-800"}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{node.icon}</span>
              <span className="text-slate-200 font-medium text-sm">{node.name}</span>
              {node.zone && (
                <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs capitalize">
                  {node.zone}
                </Badge>
              )}
              {isActive && (
                <Badge className="bg-green-700/60 text-green-200 border-green-600 text-xs">
                  Gathering
                </Badge>
              )}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">{node.description}</div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>Skill req: {node.requiredLevel}</span>
              <span>{node.xpPerGather} XP</span>
              <span>
                <Clock className="w-3 h-3 inline mr-0.5" />
                {formatSeconds(node.gatherTimeSeconds)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Yields: {node.yields.map(y => y.itemId.replace(/_/g, " ")).join(", ")}
            </div>
            {isActive && session && (
              <div className="mt-1 text-xs text-green-400">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {secLeft > 0 ? `Next gather in ${formatSeconds(secLeft)}` : "Gathering..."}
                {" · "}Total: {session.totalGathered}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className={isActive
              ? "shrink-0 border-red-700 text-red-400 hover:bg-red-950/30"
              : "shrink-0 border-green-700 text-green-400 hover:bg-green-950/30"
            }
            onClick={isActive ? onStop : onStart}
            disabled={!node.unlocked && !isActive}
            title={!node.unlocked && !isActive ? `Requires skill level ${node.requiredLevel}` : ""}
          >
            {isActive
              ? <><StopCircle className="w-3 h-3 mr-1" />Stop</>
              : <><PlayCircle className="w-3 h-3 mr-1" />Gather</>
            }
          </Button>
        </div>
        {!node.unlocked && (
          <div className="text-xs text-red-400">🔒 Requires {node.skillId.replace(/_/g, " ")} level {node.requiredLevel}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradeskillsPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<TradeskillStatus>({
    queryKey: ["tradeskills", "status"],
    queryFn: () => fetchJson(apiUrl("/api/tradeskills/status")),
    refetchInterval: 15_000,
  });

  const { data: materials = [] } = useQuery<TradeskillMaterial[]>({
    queryKey: ["tradeskills", "vendor", "materials"],
    queryFn: () => fetchJson(apiUrl("/api/tradeskills/vendor/materials")),
    enabled: !!status?.tradeskillClass,
  });

  const { data: vendorRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ["tradeskills", "vendor", "recipes"],
    queryFn: () => fetchJson(apiUrl("/api/tradeskills/vendor/recipes")),
    enabled: !!status?.tradeskillClass,
  });

  const { data: knownRecipes = [] } = useQuery<Recipe[]>({
    queryKey: ["tradeskills", "recipes"],
    queryFn: () => fetchJson(apiUrl("/api/tradeskills/recipes")),
    enabled: !!status?.tradeskillClass,
    refetchInterval: 10_000,
  });

  const { data: queue = [] } = useQuery<QueueEntry[]>({
    queryKey: ["tradeskills", "queue"],
    queryFn: () => fetchJson(apiUrl("/api/tradeskills/queue")),
    enabled: !!status?.tradeskillClass,
    refetchInterval: 5_000,
  });

  // Track which items are currently being purchased/crafted/cancelled
  const [activeTab, setActiveTab] = React.useState("vendor");
  const [buyingMaterial, setBuyingMaterial] = React.useState<string | null>(null);
  const [buyingRecipe, setBuyingRecipe] = React.useState<number | null>(null);
  const [craftingRecipe, setCraftingRecipe] = React.useState<number | null>(null);
  const [cancellingId, setCancellingId] = React.useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tradeskills"] });
  };

  const chooseClassMutation = useMutation({
    mutationFn: (cls: string) => postJson(apiUrl("/api/tradeskills/class"), { tradeskillClass: cls }),
    onSuccess: () => {
      toast.success("Tradeskill class chosen!");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const buyMaterialMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      postJson(apiUrl("/api/tradeskills/vendor/materials/purchase"), { itemId, quantity }),
    onSuccess: (_data, vars) => {
      toast.success(`Purchased ${vars.quantity} ${vars.itemId.replace(/^ts_/, "").replace(/_/g, " ")}`);
      invalidate();
      setBuyingMaterial(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setBuyingMaterial(null);
    },
  });

  const buyRecipeMutation = useMutation({
    mutationFn: (recipeId: number) =>
      postJson(apiUrl("/api/tradeskills/vendor/recipes/purchase"), { recipeId }),
    onSuccess: () => {
      toast.success("Recipe learned!");
      invalidate();
      setBuyingRecipe(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setBuyingRecipe(null);
    },
  });

  const craftMutation = useMutation({
    mutationFn: (recipeId: number) =>
      postJson(apiUrl("/api/tradeskills/queue"), { recipeId, quantity: 1 }),
    onSuccess: () => {
      toast.success("Craft started!");
      invalidate();
      setCraftingRecipe(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setCraftingRecipe(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (queueId: number) =>
      deleteJson(apiUrl(`/api/tradeskills/queue/${queueId}`)),
    onSuccess: () => {
      toast.success("Craft cancelled. Materials refunded.");
      invalidate();
      setCancellingId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setCancellingId(null);
    },
  });

  const { data: gatheringNodes = [] } = useQuery<GatheringNode[]>({
    queryKey: ["gathering", "nodes"],
    queryFn: () => fetchJson(apiUrl("/api/gathering/nodes")),
    enabled: !!status?.tradeskillClass,
    refetchInterval: 10_000,
  });

  const { data: gatheringStatus } = useQuery<GatheringStatus>({
    queryKey: ["gathering", "status"],
    queryFn: () => fetchJson(apiUrl("/api/gathering/status")),
    enabled: !!status?.tradeskillClass,
    refetchInterval: 5_000,
  });

  const startGatherMutation = useMutation({
    mutationFn: ({ skillId, nodeId }: { skillId: string; nodeId: string }) =>
      postJson(apiUrl("/api/gathering/start"), { skillId, nodeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gathering"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stopGatherMutation = useMutation({
    mutationFn: (skillId: string) =>
      postJson(apiUrl("/api/gathering/stop"), { skillId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gathering"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetClassMutation = useMutation({
    mutationFn: () => deleteJson(apiUrl("/api/tradeskills/class")),
    onSuccess: () => {
      toast.success("Tradeskill reset! Choose a new class.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!status) return null;

  if (!status.tradeskillClass) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <ClassPicker
          onPick={cls => chooseClassMutation.mutate(cls)}
        />
      </div>
    );
  }

  const queueFull = (status.queueCount ?? queue.length) >= 5;

  const harvestNodes = gatheringNodes.filter(n => TRADESKILL_HARVEST_NODE_IDS.has(n.id));
  const activeSessionMap = new Map<string, GatheringSession>(
    (gatheringStatus?.sessions ?? []).map(s => [s.nodeId, s]),
  );

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <SkillHeader
        status={status}
        onReset={() => {
          if (window.confirm("Reset your tradeskill? This will erase all XP, learned recipes, and cancel your craft queue. This cannot be undone.")) {
            resetClassMutation.mutate();
          }
        }}
        resetting={resetClassMutation.isPending}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="vendor" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
            <ShoppingBag className="w-4 h-4 mr-1" /> Vendor
          </TabsTrigger>
          <TabsTrigger value="recipes" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
            <BookOpen className="w-4 h-4 mr-1" /> Recipes
            {knownRecipes.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{knownRecipes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="queue" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-1" /> Queue
            {queue.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{queue.length}/5</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="skills" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
            <Star className="w-4 h-4 mr-1" /> Skills
          </TabsTrigger>
          <TabsTrigger value="harvest" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
            <Leaf className="w-4 h-4 mr-1" /> Harvest
          </TabsTrigger>
        </TabsList>

        {/* ── Vendor Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="vendor" className="mt-4 space-y-6">
          {/* Materials section */}
          <div>
            <h3 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Materials
            </h3>
            {materials.length === 0 ? (
              <p className="text-slate-500 text-sm">No materials available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {materials.map(mat => (
                  <MaterialCard
                    key={mat.id}
                    material={mat}
                    buying={buyingMaterial === mat.id}
                    onBuy={(id, qty) => {
                      setBuyingMaterial(id);
                      buyMaterialMutation.mutate({ itemId: id, quantity: qty });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Learn Recipes section */}
          <div>
            <h3 className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Learn Recipes
            </h3>
            {vendorRecipes.length === 0 ? (
              <p className="text-slate-500 text-sm">All available recipes learned.</p>
            ) : (
              <div className="space-y-2">
                {vendorRecipes.map(recipe => (
                  <VendorRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    buying={buyingRecipe === recipe.id}
                    onBuy={id => {
                      setBuyingRecipe(id);
                      buyRecipeMutation.mutate(id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Recipe Browser Tab ─────────────────────────────────────────── */}
        <TabsContent value="recipes" className="mt-4 space-y-2">
          {knownRecipes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No recipes learned yet. Visit the Vendor tab to buy recipes, or discover them in the world.</p>
            </div>
          ) : (
            <>
              {queueFull && (
                <div className="bg-amber-900/30 border border-amber-600 text-amber-300 text-sm rounded-lg p-3">
                  Craft queue is full (5/5). Wait for a craft to complete or cancel one.
                </div>
              )}
              {(["apprentice", "journeyman", "adept", "master", "ooak"] as const).map(tier => {
                const tierRecipes = knownRecipes.filter(r =>
                  tier === "ooak" ? r.isOoak : !r.isOoak && r.tier === tier,
                );
                if (tierRecipes.length === 0) return null;
                const tierLabel = tier === "ooak" ? "✦ Legendary (One-of-a-Kind)" : tier.charAt(0).toUpperCase() + tier.slice(1);
                return (
                  <div key={tier} className="space-y-2">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-3 mb-1">{tierLabel}</div>
                    {tierRecipes.map(recipe => (
                      <KnownRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        crafting={craftingRecipe === recipe.id}
                        queueFull={queueFull}
                        onCraft={id => {
                          setCraftingRecipe(id);
                          craftMutation.mutate(id);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* ── Queue Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="queue" className="mt-4 space-y-2">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Hammer className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No crafts in progress. Start crafting from the Recipes tab.</p>
            </div>
          ) : (
            queue.map(entry => (
              <QueueCard
                key={entry.id}
                entry={entry}
                cancelling={cancellingId === entry.id}
                onCancel={id => {
                  setCancellingId(id);
                  cancelMutation.mutate(id);
                }}
              />
            ))
          )}
        </TabsContent>

        {/* ── Skills Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="skills" className="mt-4 space-y-3">
          {Object.entries(CLASS_INFO).map(([key, info]) => {
            const Icon = info.icon;
            const tsLevel = status.tradeskills[key];
            const level = tsLevel?.level ?? 0;
            const xp = tsLevel?.xp ?? 0;
            const isActive = status.tradeskillClass === key;
            const progress = levelProgress(xp, level);
            return (
              <Card key={key} className={`${isActive ? "border-amber-600 bg-amber-950/20" : "border-slate-700 bg-slate-800"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isActive ? "text-amber-300" : "text-slate-300"}`}>{info.label}</span>
                        {isActive && <Badge variant="outline" className="text-amber-400 border-amber-500 text-xs">Active</Badge>}
                        <span className="text-slate-400 text-sm ml-auto">Level {level}</span>
                      </div>
                      <Progress value={progress} className="h-1.5 mt-1" />
                      <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                        <span>{xp.toLocaleString(undefined, { maximumFractionDigits: 0 })} XP</span>
                        {level < 100 && <span>{xpToNextLevel(xp, level).toLocaleString(undefined, { maximumFractionDigits: 0 })} to next</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Harvest Tab ────────────────────────────────────────────────── */}
        <TabsContent value="harvest" className="mt-4 space-y-3">
          {harvestNodes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No harvesting nodes available yet. Explore the world to find them.</p>
            </div>
          ) : (
            harvestNodes.map(node => {
              const session = activeSessionMap.get(node.id);
              const isActive = !!session;
              return (
                <HarvestNodeCard
                  key={node.id}
                  node={node}
                  session={session}
                  isActive={isActive}
                  onStart={() => startGatherMutation.mutate({ skillId: node.skillId, nodeId: node.id })}
                  onStop={() => stopGatherMutation.mutate(node.skillId)}
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
