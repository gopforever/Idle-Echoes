import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInventory,
  useGetSkills,
  getGetInventoryQueryKey,
  getGetSkillsQueryKey,
  getGetCharacterQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";
import { Pin, PinOff, Package } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  itemId: string;
  quantity: number;
}

interface RecipeItem {
  id: string;
  name: string;
  rarity: string;
  level: number;
}

interface CraftingRecipe {
  id: string;
  name: string;
  description?: string;
  tier: "journeyman" | "expert" | "mythic";
  oneOfAKind?: boolean;
  resultItemId: string;
  resultQuantity: number;
  resultItem?: RecipeItem;
  ingredients: Ingredient[];
  requiredSkillLevel: number;
  requiredSkillId: string;
  xpReward: number;
}

interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity?: number;
  quality?: number;
  rarity?: string;
  recipeId?: string;
  recipeTier?: string;
  [key: string]: unknown;
}

interface GatheringBagItem {
  id: number;
  itemId: string;
  quantity: number;
  itemData?: Record<string, unknown>;
}

type ExperimentFocus = "attack" | "defense" | "utility";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_COLORS = {
  journeyman: "text-slate-300 border-slate-600",
  expert: "text-blue-300 border-blue-600",
  mythic: "text-amber-300 border-amber-500",
};

const TIER_BADGE_COLORS = {
  journeyman: "bg-slate-700 text-slate-200",
  expert: "bg-blue-900 text-blue-200",
  mythic: "bg-amber-900/80 text-amber-200",
};

const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-purple-400",
  fabled: "text-orange-400",
  mythical: "text-yellow-300",
};

const FOCUS_LABELS: Record<ExperimentFocus, string> = {
  attack: "Attack",
  defense: "Defense",
  utility: "Utility",
};

const FOCUS_DESCRIPTIONS: Record<ExperimentFocus, string> = {
  attack: "Boosts Attack, Crit, Damage, STR, AGI",
  defense: "Boosts Defense, Mitigation, HP, STA, AVD",
  utility: "Boosts Wisdom, INT, Haste, Power, CHA",
};

function qualityColor(q: number): string {
  if (q >= 80) return "text-green-400";
  if (q >= 50) return "text-yellow-400";
  return "text-red-400";
}

function qualityLabel(q: number): string {
  if (q >= 90) return "Pristine";
  if (q >= 75) return "Excellent";
  if (q >= 55) return "Good";
  if (q >= 35) return "Average";
  return "Poor";
}

// ─── Fetch known recipes via direct API call ──────────────────────────────────

async function fetchKnownRecipes(): Promise<CraftingRecipe[]> {
  const res = await fetch(apiUrl("/api/crafting/known-recipes"));
  if (!res.ok) throw new Error("Failed to fetch recipes");
  return res.json() as Promise<CraftingRecipe[]>;
}

async function fetchPins(): Promise<string[]> {
  const res = await fetch(apiUrl("/api/crafting/pins"));
  if (!res.ok) return [];
  const data = await res.json() as { pinned: string[] };
  return data.pinned ?? [];
}

async function savePins(pinned: string[]): Promise<void> {
  const res = await fetch(apiUrl("/api/crafting/pins"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned }),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error ?? "Failed to save pins");
  }
}

async function fetchGatheringBag(): Promise<GatheringBagItem[]> {
  const res = await fetch(apiUrl("/api/gathering/bag"));
  if (!res.ok) return [];
  const data = await res.json() as { items: GatheringBagItem[] };
  return data.items ?? [];
}

async function learnRecipe(scrollItemId: string) {
  const res = await fetch(apiUrl("/api/crafting/learn-recipe"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scrollItemId }),
  });
  if (!res.ok) throw new Error("Failed to learn recipe");
  return res.json() as Promise<{ success: boolean; message: string; recipeId?: string }>; 
}

async function craftItem(body: {
  recipeId: string;
  experimentFocus: ExperimentFocus;
  experimentPoints: number;
}) {
  const res = await fetch(apiUrl("/api/crafting/craft"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Crafting request failed");
  return res.json() as Promise<{ success: boolean; message: string; resultItem?: Record<string, unknown>; craftedMeta?: Record<string, unknown>; isCritical?: boolean; critChance?: number; resourceQuality?: number; xpGained?: number; }>; 
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QualityBar({ quality }: { quality: number }) {
  const pct = Math.max(0, Math.min(100, quality));
  const color = quality >= 80 ? "bg-green-500" : quality >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${qualityColor(quality)} font-mono w-8 text-right`}>{quality}</span>
    </div>
  );
}

function RecipeScrollCard({
  item,
  onLearn,
  isLoading,
}: {
  item: InventoryItem;
  onLearn: (scrollItemId: string) => void;
  isLoading: boolean;
}) {
  const tierColors = item.recipeTier === "mythic"
    ? "border-amber-500/60 bg-amber-950/20"
    : "border-blue-600/60 bg-blue-950/20";

  return (
    <Card className={`border ${tierColors}`}> 
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-200 leading-tight">{item.name}</div>
            {item.recipeTier === "mythic" && (
              <div className="text-xs text-amber-400 mt-0.5 font-medium">ONE OF A KIND</div>
            )}
            <div className="text-xs text-slate-400 mt-1 leading-tight">{String(item.description || "")}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLearn(item.id)}
            disabled={isLoading}
            className="shrink-0 border-blue-600 text-blue-300 hover:bg-blue-900/40"
          >
            Learn
          </Button>
        </div>
        {(item.quantity ?? 1) > 1 && (
          <div className="text-xs text-slate-500 mt-1">x{item.quantity}</div>
        )}
      </CardContent>
    </Card>
  );
}

function CraftingModal({
  recipe,
  inventory,
  skillLevel,
  onClose,
  onCraft,
  crafting,
}: {
  recipe: CraftingRecipe;
  inventory: InventoryItem[];
  skillLevel: number;
  onClose: () => void;
  onCraft: (focus: ExperimentFocus, points: number) => void;
  crafting: boolean;
}) {
  const [focus, setFocus] = React.useState<ExperimentFocus>("attack");
  const maxPoints = Math.max(1, Math.floor(skillLevel / 10));
  const [points, setPoints] = React.useState(maxPoints);

  const inventoryMap = new Map(inventory.map(i => [i.id, i]));

  const qualityScores: number[] = [];
  for (const ing of recipe.ingredients) {
    const item = inventoryMap.get(ing.itemId);
    const itemData = item as Record<string, unknown> | undefined;
    const rawData = itemData?.itemData as Record<string, unknown> | undefined;
    const quality = (typeof rawData?.quality === "number" ? rawData.quality
      : typeof item?.quality === "number" ? item.quality : 50);
    for (let q = 0; q < ing.quantity; q++) qualityScores.push(quality);
  }
  const avgQuality = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 50;

  const critChance = Math.round(((skillLevel + avgQuality) / 200) * 100);
  const focusBoost = Math.round(points * 15 * (avgQuality / 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-700 shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg text-slate-100">{recipe.name}</CardTitle>
              {recipe.oneOfAKind && (
                <div className="text-amber-400 text-xs font-bold mt-0.5">ONE OF A KIND RECIPE</div>
              )}
              {recipe.description && (
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">{recipe.description}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 ml-4 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ingredients */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Ingredients & Quality</div>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, i) => {
                const item = inventoryMap.get(ing.itemId);
                const itemData = item as Record<string, unknown> | undefined;
                const rawData = itemData?.itemData as Record<string, unknown> | undefined;
                const quality = (typeof rawData?.quality === "number" ? rawData.quality
                  : typeof item?.quality === "number" ? item.quality : 50);
                const have = item?.quantity ?? 0;
                const hasEnough = (have as number) >= ing.quantity;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">{item?.name || ing.itemId}</span>
                      <span className={`text-xs font-mono ${hasEnough ? "text-green-400" : "text-red-400"}`}> 
                        {String(have)}/{ing.quantity}
                      </span>
                    </div>
                    {item && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${qualityColor(quality)}`}>{qualityLabel(quality)}</span>
                        <QualityBar quality={quality} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Average Resource Quality</span>
                <span className={`font-bold ${qualityColor(avgQuality)}`}>{avgQuality}/100 — {qualityLabel(avgQuality)}</span>
              </div>
            </div>
          </div>

          {/* Experiment Focus */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Experimentation Focus</div>
            <div className="grid grid-cols-3 gap-2">
              {(["attack", "defense", "utility"] as ExperimentFocus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFocus(f)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${focus === f
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                >
                  <div className="font-bold">{FOCUS_LABELS[f]}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{FOCUS_DESCRIPTIONS[f]}</div>
                </button>
              ))}
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Experiment Points (Budget: {maxPoints})</span>
                <span className="text-primary font-mono">{points} pts → +{focusBoost}% boost</span>
              </div>
              <input
                type="range"
                min={1}
                max={maxPoints}
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                <span>1</span>
                <span>{maxPoints}</span>
              </div>
            </div>
          </div>

          {/* Crit Chance */}
          <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/40">
            <div className="text-xs text-slate-400">
              Critical Success Chance
              <div className="text-[10px] text-slate-600">Upgrades rarity tier on success</div>
            </div>
            <div className={`text-lg font-bold ${critChance >= 30 ? "text-green-400" : critChance >= 15 ? "text-yellow-400" : "text-slate-300"}`}> 
              {critChance}%
            </div>
          </div>

          <Button
            onClick={() => onCraft(focus, points)}
            disabled={crafting}
            className="w-full"
            size="lg"
          >
            {crafting ? "Crafting..." : `Craft ${recipe.name}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CraftResultModal({
  result,
  onClose,
}: {
  result: {
    resultItem?: Record<string, unknown>;
    craftedMeta?: Record<string, unknown>;
    isCritical?: boolean;
    xpGained?: number;
    message?: string;
  };
  onClose: () => void;
}) {
  const item = result.resultItem as Record<string, unknown> | undefined;
  const meta = result.craftedMeta as Record<string, unknown> | undefined;
  const rarity = (item?.rarity as string) ?? "common";
  const isCrit = result.isCritical;
  const isOneOfAKind = meta?.isOneOfAKind as boolean | undefined;

  const borderClass = isOneOfAKind
    ? "border-amber-400 shadow-amber-400/30"
    : isCrit
      ? "border-purple-500 shadow-purple-500/30"
      : "border-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className={`w-full max-w-md bg-slate-900 border-2 shadow-xl ${borderClass}`}> 
        <CardHeader className="pb-2 text-center">
          {isCrit && (
            <div className="text-yellow-400 font-bold text-lg mb-1">
              {isOneOfAKind ? "ONE OF A KIND CREATED!" : "CRITICAL SUCCESS!"}
            </div>
          )}
          <CardTitle className={`${RARITY_COLORS[rarity] ?? "text-slate-200"} text-xl`}> 
            {String(item?.name ?? "Crafted Item")}
          </CardTitle>
          {isOneOfAKind && (
            <div className="text-xs text-amber-400 font-semibold mt-1">
              Unique in all of Norrath — this item will never be crafted again.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {meta && (
            <div className="bg-slate-800/60 rounded-lg p-3 space-y-1.5 border border-slate-700/50 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Handcrafted by</span>
                <span className="text-slate-200 font-medium">{String(meta.craftedBy ?? "Unknown")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Resource Quality</span>
                <span className={qualityColor(Number(meta.resourceQuality ?? 50))}> 
                  {String(meta.resourceQuality ?? 50)}/100 — {qualityLabel(Number(meta.resourceQuality ?? 50))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Focus Applied</span>
                <span className="text-primary capitalize">{String(meta.experimentFocus ?? "attack")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipe Tier</span>
                <span className={TIER_COLORS[(meta.recipeTier as "journeyman" | "expert" | "mythic") ?? "journeyman"]?.split(" ")[0] ?? ""}> 
                  {String(meta.recipeTier ?? "journeyman").charAt(0).toUpperCase() + String(meta.recipeTier ?? "journeyman").slice(1)}
                </span>
              </div>
              {isCrit && (
                <div className="flex justify-between text-yellow-400 font-bold border-t border-slate-700 pt-1.5 mt-1">
                  <span>Critical Craft</span>
                  <span>Rarity Upgraded!</span>
                </div>
              )} 
            </div>
          )}

          {result.xpGained && (
            <div className="text-center text-sm text-primary">+{result.xpGained} Crafting XP</div>
          )}

          <Button onClick={onClose} className="w-full" variant="outline">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CraftingPage() {
  const queryClient = useQueryClient();
  const { data: inventory, isLoading: invLoading } = useGetInventory();
  const { data: skills, isLoading: skillsLoading } = useGetSkills();

  const [recipes, setRecipes] = React.useState<CraftingRecipe[]>([]);
  const [recipesLoading, setRecipesLoading] = React.useState(true);
  const [selectedRecipe, setSelectedRecipe] = React.useState<CraftingRecipe | null>(null);
  const [craftResult, setCraftResult] = React.useState<null | Record<string, unknown>>(null);
  const [crafting, setCrafting] = React.useState(false);
  const [learningScroll, setLearningScroll] = React.useState(false);
  const [tierFilter, setTierFilter] = React.useState<"all" | "journeyman" | "expert" | "mythic">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCraftableOnly, setShowCraftableOnly] = React.useState(false);

  // Pins state
  const [pinnedIds, setPinnedIds] = React.useState<string[]>([]);
  const [pinsLoading, setPinsLoading] = React.useState(true);

  // Gathering bag state
  const [bagItems, setBagItems] = React.useState<GatheringBagItem[]>([]);

  const loadRecipes = React.useCallback(async () => {
    setRecipesLoading(true);
    try {
      const data = await fetchKnownRecipes();
      setRecipes(data);
    } catch {
      setRecipes([]);
    } finally {
      setRecipesLoading(false);
    }
  }, []);

  const loadPins = React.useCallback(async () => {
    setPinsLoading(true);
    try {
      const pins = await fetchPins();
      setPinnedIds(pins);
    } catch {
      setPinnedIds([]);
    } finally {
      setPinsLoading(false);
    }
  }, []);

  const loadBag = React.useCallback(async () => {
    try {
      const items = await fetchGatheringBag();
      setBagItems(items);
    } catch {
      setBagItems([]);
    }
  }, []);

  React.useEffect(() => { loadRecipes(); }, [loadRecipes]);
  React.useEffect(() => { loadPins(); }, [loadPins]);
  React.useEffect(() => { loadBag(); }, [loadBag]);

  if (invLoading || skillsLoading) return <Skeleton className="h-[600px] w-full" />;
  if (!inventory || !skills) return null;

  const invItems: InventoryItem[] = inventory.items.map(i => ({
    ...(i as Record<string, unknown>),
    id: i.id,
    name: i.name,
    type: i.type ?? "",
    quantity: i.quantity ?? 1,
  }));

  const scrollItems = invItems.filter(i => i.type === "recipe_scroll");
  const invMap = new Map(invItems.map(i => [i.id, i]));
  const bagMap = new Map(bagItems.map(b => [b.itemId, b]));

  // Combined total = inventory + gathering bag
  function totalOwned(itemId: string): number {
    return (invMap.get(itemId)?.quantity as number ?? 0) + (bagMap.get(itemId)?.quantity ?? 0);
  }

  const canCraft = (recipe: CraftingRecipe): boolean => {
    const skill = skills.find(s => s.id === recipe.requiredSkillId);
    if (!skill || (skill.level ?? 0) < recipe.requiredSkillLevel) return false;
    for (const ing of recipe.ingredients) {
      if (totalOwned(ing.itemId) < ing.quantity) return false;
    }
    return true;
  };

  const filteredRecipes = recipes.filter(r => {
    if (tierFilter !== "all" && r.tier !== tierFilter) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (showCraftableOnly && !canCraft(r)) return false;
    return true;
  });

  const handleTogglePin = async (recipeId: string) => {
    const isPinned = pinnedIds.includes(recipeId);
    const previousPins = pinnedIds;
    let newPins: string[];
    if (isPinned) {
      newPins = pinnedIds.filter(id => id !== recipeId);
    } else {
      if (pinnedIds.length >= 10) {
        toast.error("You can only pin up to 10 recipes");
        return;
      }
      newPins = [...pinnedIds, recipeId];
    }
    setPinnedIds(newPins);
    try {
      await savePins(newPins);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to save pins");
      setPinnedIds(previousPins);
    }
  };

  const handleLearnScroll = async (scrollItemId: string) => {
    setLearningScroll(true);
    try {
      const res = await learnRecipe(scrollItemId);
      if (res.success) {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        await loadRecipes();
      } else {
        toast.error(res.message);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to learn recipe");
    } finally {
      setLearningScroll(false);
    }
  };

  const handleCraft = async (focus: ExperimentFocus, points: number) => {
    if (!selectedRecipe) return;
    setCrafting(true);
    try {
      const res = await craftItem({
        recipeId: selectedRecipe.id,
        experimentFocus: focus,
        experimentPoints: points,
      });
      if (res.success) {
        setSelectedRecipe(null);
        setCraftResult(res as Record<string, unknown>);
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSkillsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        await loadRecipes();
        await loadBag();
      } else {
        toast.error(res.message);
        setSelectedRecipe(null);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Crafting failed");
    } finally {
      setCrafting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-serif font-bold text-slate-100">Crafting</h1>
        <p className="text-sm text-slate-400 mt-1">
          Deep crafting — allocate experiment points, choose your focus, and roll for a critical.
        </p>
      </div>

      {/* Recipe Scrolls in Inventory */}
      {scrollItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Recipe Scrolls (use to learn)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scrollItems.map(item => (
              <RecipeScrollCard
                key={item.id}
                item={item}
                onLearn={handleLearnScroll}
                isLoading={learningScroll}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pinned Recipes Section */}
      {!pinsLoading && pinnedIds.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pin className="w-3.5 h-3.5" /> Pinned Recipes
            <Badge variant="outline" className="text-amber-400 border-amber-400/40 text-xs ml-1">{pinnedIds.length}/10</Badge>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {pinnedIds.map(pinId => {
              const recipe = recipes.find(r => r.id === pinId);
              if (!recipe) return null;
              const craftable = canCraft(recipe);
              return (
                <Card key={pinId} className={`border ${craftable ? "border-amber-500/40 bg-amber-950/10" : "border-slate-700 bg-card/30"} backdrop-blur`}> 
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-sm">{recipe.name}</span>
                          {craftable && <Badge className="bg-green-800/60 text-green-300 border-green-600/40 text-[10px]">Ready</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelectedRecipe(recipe)} disabled={!craftable}>
                          Craft
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400 hover:text-amber-300" onClick={() => handleTogglePin(pinId)}>
                          <PinOff className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {recipe.ingredients.map((ing, i) => {
                        const have = totalOwned(ing.itemId);
                        const hasEnough = have >= ing.quantity;
                        const invItem = invMap.get(ing.itemId);
                        const name = invItem?.name as string | undefined ?? ing.itemId.replace(/_/g, " ");
                        const bagQty = bagMap.get(ing.itemId)?.quantity ?? 0;
                        return (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">{name}</span>
                            <div className="flex items-center gap-2">
                              {bagQty > 0 && <span className="text-blue-400 text-[10px]">+{bagQty} bag</span>}
                              <span className={hasEnough ? "text-green-400" : "text-red-400"}>
                                {have}/{ing.quantity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 w-48 focus:outline-none focus:border-slate-500"
        />
        {(["all", "journeyman", "expert", "mythic"] as const).map(tier => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${tierFilter === tier
              ? tier === "mythic"
                ? "bg-amber-900/60 text-amber-300 border-amber-500"
                : tier === "expert"
                  ? "bg-blue-900/60 text-blue-300 border-blue-600"
                  : "bg-slate-700 text-slate-200 border-slate-500"
              : "bg-transparent text-slate-500 border-slate-700 hover:border-slate-500"
              }`}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </button>
        ))}
        <button
          onClick={() => setShowCraftableOnly(v => !v)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${showCraftableOnly
            ? "bg-green-900/60 text-green-300 border-green-600"
            : "bg-transparent text-slate-500 border-slate-700 hover:border-slate-500"
          }`}
        >
          Craftable only
        </button>
        <span className="text-xs text-slate-500 ml-auto">{filteredRecipes.length} recipes known</span>
      </div>

      {/* Recipe Grid */}
      {recipesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          {recipes.length === 0
            ? "You don't know any recipes yet. Learn from recipe scrolls dropped by bosses."
            : "No recipes match your filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecipes.map(recipe => {
            const skill = skills.find(s => s.id === recipe.requiredSkillId);
            const hasSkill = (skill?.level ?? 0) >= recipe.requiredSkillLevel;
            const craftable = canCraft(recipe);
            const isMythic = recipe.tier === "mythic";
            const isExpert = recipe.tier === "expert";
            const resultItem = recipe.resultItem;
            const isPinned = pinnedIds.includes(recipe.id);

            return (
              <Card
                key={recipe.id}
                className={`border transition-all ${isMythic
                  ? "border-amber-500/50 bg-amber-950/10 shadow-amber-900/20"
                  : isExpert
                    ? "border-blue-700/50 bg-blue-950/10"
                    : "border-slate-800 bg-card/40"
                  } backdrop-blur`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-200 text-base leading-tight">{recipe.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIER_BADGE_COLORS[recipe.tier]} border-opacity-50`}> 
                          {recipe.tier.charAt(0).toUpperCase() + recipe.tier.slice(1)}
                        </span>
                        {recipe.oneOfAKind && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 border border-amber-500/50 font-bold"> 
                            ONE OF A KIND
                          </span>
                        )}
                      </div>
                      {resultItem && (
                        <div className={`text-xs mt-0.5 ${RARITY_COLORS[resultItem.rarity] ?? "text-slate-400"}`}> 
                          → {resultItem.name} (lvl {resultItem.level})
                        </div>
                      )}
                      <div className={`text-xs mt-0.5 ${hasSkill ? "text-slate-500" : "text-red-400"}`}> 
                        Requires {recipe.requiredSkillId} {recipe.requiredSkillLevel}
                        {skill && ` (you: ${skill.level})`}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-xs text-primary">+{recipe.xpReward} XP</div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 ${isPinned ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-amber-400"}`}  
                          onClick={() => handleTogglePin(recipe.id)}
                          title={isPinned ? "Unpin recipe" : "Pin recipe"}
                        >
                          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          onClick={() => setSelectedRecipe(recipe)}
                          disabled={!craftable}
                          size="sm"
                          variant={isMythic ? "default" : "default"}  
                          className={`w-16 ${isMythic ? "bg-amber-700 hover:bg-amber-600 text-white" : ""}`}
                        >
                          Craft
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="bg-slate-900/60 p-3 rounded-md border border-slate-800/50 space-y-1">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1.5">Ingredients</div>
                    {recipe.ingredients.map((ing, i) => {
                      const have = totalOwned(ing.itemId);
                      const hasEnough = have >= ing.quantity;
                      const invItem = invMap.get(ing.itemId);
                      const bagQty = bagMap.get(ing.itemId)?.quantity ?? 0;
                      const itemData = invItem as Record<string, unknown> | undefined;
                      const rawData = itemData?.itemData as Record<string, unknown> | undefined;
                      const quality = typeof rawData?.quality === "number" ? rawData.quality
                        : typeof invItem?.quality === "number" ? invItem.quality : null;
                      return (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300">{invItem?.name as string | undefined || ing.itemId.replace(/_/g, " ")}</span>
                            {quality !== null && (
                              <span className={`${qualityColor(quality)} font-mono`}>Q:{quality}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {bagQty > 0 && <span className="text-blue-400 text-[10px] flex items-center gap-0.5">+{bagQty}<Package className="w-2.5 h-2.5 inline" /></span>}
                            <span className={hasEnough ? "text-green-400" : "text-red-400"}>  
                              {have}/{ing.quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Crafting Modal */}
      {selectedRecipe && (
        <CraftingModal
          recipe={selectedRecipe}
          inventory={invItems}
          skillLevel={(skills.find(s => s.id === selectedRecipe.requiredSkillId)?.level ?? 1)}
          onClose={() => setSelectedRecipe(null)}
          onCraft={handleCraft}
          crafting={crafting}
        />
      )}

      {/* Result Modal */}
      {craftResult && (
        <CraftResultModal
          result={craftResult as Parameters<typeof CraftResultModal>[0]["result"]}
          onClose={() => setCraftResult(null)}
        />
      )}
    </div>
  );
}