import * as React from "react";
import { useGetShopItems, useBuyItem, useGetCharacter, useGetInventory, getGetCharacterQueryKey, getGetInventoryQueryKey, type Item, type Character, type Shop, type ShopItem, type BuyResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NpcDialogueModal } from "@/components/game/npc-dialogue-modal";
import { apiUrl } from "@/lib/api";
import { SpriteImage, ItemTooltipContent, computeItemGS, isGearType, type ItemTooltipData } from "@/components/game/item-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";
import { ExamineDialog, type ExamineItem } from "@/components/game/examine-dialog";

const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-400", uncommon: "text-green-400", rare: "text-blue-400",
  legendary: "text-purple-400", fabled: "text-orange-400", mythical: "text-red-400 font-bold",
};

const RARITY_ICON_FRAME: Record<string, string> = {
  common:    "border-slate-700/60",
  uncommon:  "border-green-700 shadow-[0_0_8px_rgba(34,197,94,0.2)]",
  rare:      "border-blue-700 shadow-[0_0_10px_rgba(59,130,246,0.25)]",
  legendary: "border-purple-600 shadow-[0_0_12px_rgba(168,85,247,0.3)]",
  fabled:    "border-orange-600 shadow-[0_0_14px_rgba(234,88,12,0.35)]",
  mythical:  "border-red-600 shadow-[0_0_16px_rgba(220,38,38,0.4)]",
};

const CATEGORY_ICONS: Record<string, string> = {
  consumables: "🧪", weapons: "⚔️", armor: "🛡️", mounts: "🐴",
  materials: "📦", adornments: "💎", accessories: "💍", misc: "🎒",
};

const AUCTION_CATEGORIES = ["all", "weapons", "armor", "consumables", "materials", "adornments", "misc"];

const PERSONALITY_EMOJI: Record<string, string> = {
  Greedy: "🪙", Aggressive: "⚔️", Scholarly: "📚",
  Devout: "🙏", Explorer: "🗺️", Cautious: "🛡️",
};

const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, legendary: 3, fabled: 4, mythical: 5,
};

// ─── Market Data types ────────────────────────────────────────────────────────

interface MarketEntry {
  category: string; demandScore: number; trend: "high" | "normal" | "low"; multiplier: number;
}

const ALL_MARKET_CATEGORIES = ["consumables", "weapons", "armor", "mounts", "materials", "adornments", "accessories"];

// ─── Auction Listing types ────────────────────────────────────────────────────

interface RecentSale {
  id: number;
  itemName: string;
  itemId: string;
  itemData: Record<string, unknown>;
  buyoutPrice: number;
  sellerName: string;
  quantity: number;
  soldAt: string | null;
}

interface CraftedMeta {
  craftedBy?: string;
  resourceQuality?: number;
  experimentFocus?: string;
  isCritical?: boolean;
  recipeTier?: string;
  isOneOfAKind?: boolean;
}

interface AuctionListing {
  id: number;
  sellerId: string;
  sellerName: string;
  sellerPersonality?: string | null;
  itemId: string;
  itemName: string;
  itemData: Record<string, unknown>;
  quantity: number;
  buyoutPrice: number;
  category: string;
  postedAt: string;
  expiresAt: string;
  isPlayerListing?: boolean;
  craftedMeta?: CraftedMeta;
  isGhostCrafter?: boolean;
}

interface MyListing {
  id: number;
  itemId: string;
  itemName: string;
  itemData: Record<string, unknown>;
  quantity: number;
  buyoutPrice: number;
  category: string;
  postedAt: string;
  expiresAt: string;
}

// ─── Sales Ticker ─────────────────────────────────────────────────────────────

function SalesTicker() {
  const [sales, setSales] = React.useState<RecentSale[]>([]);

  React.useEffect(() => {
    const doFetch = () => {
      fetch(apiUrl("/api/auction/recent-sales"))
        .then(r => r.json())
        .then((data: RecentSale[]) => Array.isArray(data) && setSales(data))
        .catch(() => {});
    };
    doFetch();
    const t = setInterval(doFetch, 15_000);
    return () => clearInterval(t);
  }, []);

  if (sales.length === 0) return null;

  return (
    <div className="overflow-hidden border border-slate-800 rounded-lg bg-slate-950/60 py-1.5 px-3">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
      `}</style>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest shrink-0">SOLD</span>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-6 animate-marquee whitespace-nowrap">
            {[...sales, ...sales].map((s, i) => {
              const rarity = (s.itemData?.rarity as string) ?? "common";
              return (
                <span key={i} className="text-[11px] shrink-0">
                  <span className={RARITY_COLORS[rarity] ?? "text-slate-400"}>{s.itemName}</span>
                  <span className="text-amber-400 ml-1">{s.buyoutPrice.toLocaleString()}g</span>
                  <span className="text-slate-600 ml-1">· {s.sellerName}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market Demand Heatmap ────────────────────────────────────────────────────

function MarketDemandHeatmap() {
  const [data, setData] = React.useState<MarketEntry[]>([]);

  React.useEffect(() => {
    let alive = true;
    const doFetch = () => {
      fetch(apiUrl("/api/shop/market-pulse"))
        .then(r => r.json())
        .then((rows: MarketEntry[]) => {
          if (!alive) return;
          const indexed: Record<string, MarketEntry> = {};
          for (const row of rows) indexed[row.category] = row;
          const full: MarketEntry[] = ALL_MARKET_CATEGORIES.map(cat =>
            indexed[cat] ?? { category: cat, demandScore: 0, trend: "low", multiplier: 0.9 }
          );
          setData(full);
        })
        .catch(() => {});
    };
    doFetch();
    const interval = setInterval(doFetch, 30_000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  if (data.length === 0) return null;

  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-2">Ghost Demand</label>
      <div className="grid grid-cols-2 gap-1.5">
        {data.map(entry => {
          const pct = entry.demandScore / 100;
          const bg = pct > 0.7 ? "bg-red-950/60 border-red-800/50"
            : pct > 0.4 ? "bg-amber-950/50 border-amber-800/40"
            : "bg-slate-900 border-slate-800";
          const textColor = pct > 0.7 ? "text-red-400" : pct > 0.4 ? "text-amber-400" : "text-slate-500";
          const priceDelta = Math.round((entry.multiplier - 1) * 100);
          return (
            <div key={entry.category} className={cn("rounded-lg border px-2 py-1.5", bg)}>
              <div className="flex items-center gap-1">
                <span className="text-base leading-none">{CATEGORY_ICONS[entry.category] ?? "📦"}</span>
                <div>
                  <div className={cn("text-[10px] font-semibold capitalize leading-none", textColor)}>{entry.category}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">
                    {priceDelta > 0 ? `+${priceDelta}%` : `${priceDelta}%`}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", pct > 0.7 ? "bg-red-500" : pct > 0.4 ? "bg-amber-500" : "bg-slate-600")}
                  style={{ width: `${entry.demandScore}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ghost Seller Badge ───────────────────────────────────────────────────────

function GhostSellerBadge({ sellerName, isGhost, personality }: { sellerName: string; isGhost: boolean; personality?: string | null }) {
  if (!isGhost) {
    return <span className="text-slate-400 text-[11px]">⭐ {sellerName}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="flex items-center gap-1 text-left hover:text-slate-200 transition-colors">
          <span className="text-[10px]">👻</span>
          <span className="text-slate-400 text-[11px]">{sellerName}</span>
          {personality && <span className="text-[10px]">{PERSONALITY_EMOJI[personality] ?? ""}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-slate-900 border-slate-700 text-xs max-w-[160px]">
        <div className="font-semibold text-slate-200">{sellerName}</div>
        {personality && (
          <div className="text-slate-400 mt-0.5">
            {PERSONALITY_EMOJI[personality]} {personality} adventurer
          </div>
        )}
        <div className="text-slate-600 text-[10px] mt-1">Ghost seller — gold goes to their estate</div>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Your Stats panel ─────────────────────────────────────────────────────────

function YourStats({ gold, listingsCount }: { gold: number; listingsCount: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Your Account</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Balance</span>
        <span className="font-bold text-amber-400 text-sm">💰 {gold.toLocaleString()}g</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Active listings</span>
        <span className="font-semibold text-slate-300 text-sm">{listingsCount}/20</span>
      </div>
    </div>
  );
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

interface FilterProps {
  category: string; setCategory: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  rarityFilter: string; setRarityFilter: (v: string) => void;
  craftedOnly: boolean; setCraftedOnly: (v: boolean) => void;
  sortBy: string; setSortBy: (v: string) => void;
  gold: number; listingsCount: number;
}

function FilterSidebar({ category, setCategory, search, setSearch, rarityFilter, setRarityFilter, craftedOnly, setCraftedOnly, sortBy, setSortBy, gold, listingsCount }: FilterProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Search</label>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Item name or seller…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/30"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Category</label>
        <div className="flex flex-col gap-1">
          {AUCTION_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left transition-colors",
                category === cat
                  ? "bg-amber-900/30 text-amber-400 border border-amber-700/50"
                  : "text-slate-400 hover:bg-slate-800/60 border border-transparent"
              )}
            >
              {cat === "all" ? "🏛" : (CATEGORY_ICONS[cat] ?? "")}
              <span className="capitalize">{cat === "all" ? "All Items" : cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Min Rarity</label>
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-600">
          <option value="any">Any</option>
          <option value="uncommon">Uncommon+</option>
          <option value="rare">Rare+</option>
          <option value="legendary">Legendary+</option>
          <option value="fabled">Fabled+</option>
          <option value="mythical">Mythical only</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Sort By</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-amber-600">
          <option value="recent">Most Recent</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="rarity">Rarity</option>
          <option value="expiry">Expiring Soon</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block">Filters</label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={craftedOnly} onChange={e => setCraftedOnly(e.target.checked)}
            className="rounded border-slate-600" />
          <span className="text-sm text-slate-400">✦ Handcrafted only</span>
        </label>
      </div>

      <MarketDemandHeatmap />
      <YourStats gold={gold} listingsCount={listingsCount} />
    </div>
  );
}

// ─── Auction Browse Tab ───────────────────────────────────────────────────────

function AuctionBrowse({ gold, onGoldChange, listingsCount }: { gold: number; onGoldChange: () => void; listingsCount: number }) {
  const queryClient = useQueryClient();
  const [listings, setListings] = React.useState<AuctionListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [craftedOnly, setCraftedOnly] = React.useState(false);
  const [rarityFilter, setRarityFilter] = React.useState("any");
  const [sortBy, setSortBy] = React.useState("recent");
  const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null);
  const [buying, setBuying] = React.useState<number | null>(null);
  const [examineItem, setExamineItem] = React.useState<ExamineItem | null>(null);

  const fetchListings = React.useCallback(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (craftedOnly) params.set("craftedOnly", "true");
    const qs = params.toString();
    const url = apiUrl(`/api/auction${qs ? `?${qs}` : ""}`);
    fetch(url)
      .then(r => r.json())
      .then((data: AuctionListing[]) => { setListings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category, craftedOnly]);

  React.useEffect(() => {
    setLoading(true);
    fetchListings();
    const interval = setInterval(fetchListings, 30_000);
    return () => clearInterval(interval);
  }, [fetchListings]);

  const handleBuy = async (listing: AuctionListing) => {
    setBuying(listing.id);
    try {
      const res = await fetch(apiUrl(`/api/auction/buy/${listing.id}`), { method: "POST" });
      const data = await res.json();
      setMessage({ text: data.message ?? (data.success ? "Purchased!" : "Failed"), ok: !!data.success });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        onGoldChange();
        fetchListings();
      }
    } catch {
      setMessage({ text: "Request failed.", ok: false });
    } finally {
      setBuying(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const filteredListings = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = listings.filter(l => {
      if (q && !l.itemName.toLowerCase().includes(q) && !l.sellerName.toLowerCase().includes(q)) return false;
      if (rarityFilter !== "any") {
        const rarity = (l.itemData?.rarity as string) ?? "common";
        const order = RARITY_ORDER[rarity] ?? 0;
        if (rarityFilter === "mythical" && rarity !== "mythical") return false;
        else if (rarityFilter !== "mythical" && order < (RARITY_ORDER[rarityFilter] ?? 0)) return false;
      }
      return true;
    });

    switch (sortBy) {
      case "price_asc": result = [...result].sort((a, b) => a.buyoutPrice - b.buyoutPrice); break;
      case "price_desc": result = [...result].sort((a, b) => b.buyoutPrice - a.buyoutPrice); break;
      case "rarity": result = [...result].sort((a, b) => (RARITY_ORDER[(b.itemData?.rarity as string) ?? "common"] ?? 0) - (RARITY_ORDER[(a.itemData?.rarity as string) ?? "common"] ?? 0)); break;
      case "expiry": result = [...result].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()); break;
      default: result = [...result].sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }
    return result;
  }, [listings, search, rarityFilter, sortBy]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-slate-800/60 overflow-y-auto p-4 hidden lg:block">
        <FilterSidebar
          category={category} setCategory={setCategory}
          search={search} setSearch={setSearch}
          rarityFilter={rarityFilter} setRarityFilter={setRarityFilter}
          craftedOnly={craftedOnly} setCraftedOnly={setCraftedOnly}
          sortBy={sortBy} setSortBy={setSortBy}
          gold={gold} listingsCount={listingsCount}
        />
      </div>

      {/* Main listing area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Mobile filters strip */}
        <div className="flex gap-2 flex-wrap items-center lg:hidden">
          {AUCTION_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn("px-3 py-1 rounded text-xs border transition-colors",
                category === cat ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400 hover:border-slate-600"
              )}>
              {cat !== "all" && (CATEGORY_ICONS[cat] ?? "")} {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        {message && (
          <div className={cn("p-2 rounded border text-sm", message.ok ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300")}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {listings.length === 0 ? "No listings in this category." : "No listings match your filters."}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-600 border-b border-slate-800 bg-slate-900/40">
                    <th className="text-left py-2 px-3">Item</th>
                    <th className="text-left py-2 px-3">Seller</th>
                    <th className="text-center py-2 px-3">Qty</th>
                    <th className="text-right py-2 px-3">Price</th>
                    <th className="text-right py-2 px-3">Expires</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredListings.map(listing => {
                    const item = listing.itemData;
                    const rarity = (item?.rarity as string) ?? "common";
                    const canAfford = gold >= listing.buyoutPrice;
                    const isOwn = listing.isPlayerListing;
                    const isGhost = !isOwn && !listing.isPlayerListing;
                    const meta = listing.craftedMeta;
                    const isOneOfAKind = meta?.isOneOfAKind;
                    const isCritCraft = meta?.isCritical;
                    const tooltipItem: ItemTooltipData = {
                      name: listing.itemName, rarity,
                      slot: item?.slot as string, type: item?.type as string,
                      level: item?.level as number, description: item?.description as string,
                      stats: item?.stats as Record<string, number>,
                      sellPrice: item?.sellPrice as number,
                      spriteId: item?.spriteId as string,
                    };
                    return (
                      <tr key={listing.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <ContextMenu>
                              <ContextMenuTrigger>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "w-8 h-8 shrink-0 rounded border flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-default relative",
                                      isOneOfAKind ? "border-amber-400/70" : RARITY_ICON_FRAME[rarity] ?? RARITY_ICON_FRAME.common
                                    )}>
                                      <SpriteImage spriteId={item?.spriteId as string} slot={item?.slot as string} type={item?.type as string} size={24} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
                                    <ItemTooltipContent item={tooltipItem} />
                                  </TooltipContent>
                                </Tooltip>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
                                <ContextMenuItem onSelect={() => setExamineItem({ ...tooltipItem, rarity, name: listing.itemName })}>Examine</ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className={cn("font-medium text-xs", RARITY_COLORS[rarity] ?? "text-slate-400")}>{listing.itemName}</span>
                                {isGearType(item?.type as string) && computeItemGS(item?.level as number, rarity, item?.slot as string) > 0 && (
                                  <span className="text-[8px] px-1 py-0 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                                    GS{computeItemGS(item?.level as number, rarity, item?.slot as string)}
                                  </span>
                                )}
                                {isOneOfAKind && <span className="text-[8px] px-1 py-0 rounded bg-amber-900/70 text-amber-300 border border-amber-500/50 font-bold">UNIQUE</span>}
                                {isCritCraft && !isOneOfAKind && <span className="text-[8px] px-1 py-0 rounded bg-purple-900/60 text-purple-300 border border-purple-600/50">CRIT</span>}
                                {meta && <span className="text-[8px] px-1 py-0 rounded bg-slate-800 text-slate-500 border border-slate-700">✦HC</span>}
                              </div>
                              <div className="text-[10px] text-slate-600">{CATEGORY_ICONS[listing.category] ?? ""} {listing.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {isOwn ? (
                            <span className="text-[11px] text-amber-600 italic">Your listing</span>
                          ) : (
                            <GhostSellerBadge sellerName={listing.sellerName} isGhost={isGhost} personality={listing.sellerPersonality} />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-xs text-slate-400">{listing.quantity}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={cn("font-bold text-sm", canAfford ? "text-amber-400" : "text-slate-500")}>
                            {listing.buyoutPrice.toLocaleString()}g
                          </span>
                          {listing.quantity > 1 && (
                            <div className="text-[10px] text-slate-600">{Math.ceil(listing.buyoutPrice / listing.quantity).toLocaleString()}g ea</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-[10px] text-slate-600">⏳ {timeLeft(listing.expiresAt)}</td>
                        <td className="py-2 px-3 text-right">
                          {isOwn ? null : (
                            <Button size="sm"
                              onClick={() => handleBuy(listing)}
                              disabled={!canAfford || buying === listing.id}
                              className={cn("text-xs h-7 px-3", canAfford ? "bg-amber-700 hover:bg-amber-600 text-white" : "opacity-40")}
                            >
                              {buying === listing.id ? "…" : canAfford ? "Buy" : "—"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredListings.map(listing => {
                const item = listing.itemData;
                const rarity = (item?.rarity as string) ?? "common";
                const canAfford = gold >= listing.buyoutPrice;
                const isOwn = listing.isPlayerListing;
                const isGhost = !isOwn && !listing.isPlayerListing;
                const meta = listing.craftedMeta;
                const isOneOfAKind = meta?.isOneOfAKind;
                const isCritCraft = meta?.isCritical;
                const tooltipItem: ItemTooltipData = {
                  name: listing.itemName, rarity,
                  slot: item?.slot as string, type: item?.type as string,
                  level: item?.level as number, description: item?.description as string,
                  stats: item?.stats as Record<string, number>,
                  sellPrice: item?.sellPrice as number,
                  spriteId: item?.spriteId as string,
                };
                const cardBorder = isOneOfAKind
                  ? "border-amber-400/60 bg-amber-950/15 shadow-amber-800/20 shadow-sm"
                  : isCritCraft ? "border-purple-600/50 bg-purple-950/10"
                  : isOwn ? "border-amber-700/50 bg-amber-950/10"
                  : "border-slate-800";
                return (
                  <Card key={listing.id} className={cn("border bg-card/40 backdrop-blur", cardBorder)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "w-11 h-11 shrink-0 rounded border-2 flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-default relative",
                                  isOneOfAKind ? "border-amber-400/70" : RARITY_ICON_FRAME[rarity] ?? RARITY_ICON_FRAME.common
                                )}>
                                  <SpriteImage spriteId={item?.spriteId as string} slot={item?.slot as string} type={item?.type as string} size={32} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
                                <ItemTooltipContent item={tooltipItem} />
                              </TooltipContent>
                            </Tooltip>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <ContextMenuItem onSelect={() => setExamineItem({ ...tooltipItem, rarity, name: listing.itemName })}>Examine</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={cn("font-semibold text-sm", RARITY_COLORS[rarity] ?? "text-slate-400")}>{listing.itemName}</span>
                            {isOneOfAKind && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/70 text-amber-300 border border-amber-500/50 font-bold">UNIQUE</span>}
                            {isCritCraft && !isOneOfAKind && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-600/50 font-semibold">CRIT</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {isOwn ? "⭐ Your listing" : <GhostSellerBadge sellerName={listing.sellerName} isGhost={isGhost} personality={listing.sellerPersonality} />}
                            {" · "}{CATEGORY_ICONS[listing.category] ?? ""} {listing.category}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">⏳ {timeLeft(listing.expiresAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                        <span className={cn("font-bold text-sm", canAfford ? "text-amber-400" : "text-slate-500")}>
                          💰 {listing.buyoutPrice.toLocaleString()}g
                          {listing.quantity > 1 && <span className="ml-1 text-[10px] text-slate-500">({Math.ceil(listing.buyoutPrice / listing.quantity).toLocaleString()}g ea)</span>}
                        </span>
                        {isOwn ? (
                          <span className="text-[10px] text-amber-600 italic">Listed by you</span>
                        ) : (
                          <Button size="sm"
                            onClick={() => handleBuy(listing)}
                            disabled={!canAfford || buying === listing.id}
                            className={cn("text-xs h-7", canAfford ? "bg-amber-700 hover:bg-amber-600 text-white" : "opacity-40")}
                          >
                            {buying === listing.id ? "…" : canAfford ? "Buy" : "Can't afford"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        <ExamineDialog item={examineItem} open={!!examineItem} onClose={() => setExamineItem(null)} />
      </div>
    </div>
  );
}

// ─── My Listings Tab ──────────────────────────────────────────────────────────

function MyListings({ defaultItemId, onListingCountChange }: { defaultItemId?: string; onListingCountChange?: (count: number) => void }) {
  const queryClient = useQueryClient();
  const { data: inventoryData } = useGetInventory();
  const [listings, setListings] = React.useState<MyListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null);
  const [cancelling, setCancelling] = React.useState<number | null>(null);
  const [soldToast, setSoldToast] = React.useState<string | null>(null);
  const prevListingIds = React.useRef<Set<number>>(new Set());

  // List form state
  const [showForm, setShowForm] = React.useState(!!defaultItemId);
  const [selectedItemId, setSelectedItemId] = React.useState(defaultItemId ?? "");
  const [listQty, setListQty] = React.useState(1);
  const [listPrice, setListPrice] = React.useState(10);
  const [listCategory, setListCategory] = React.useState("materials");
  const [submitting, setSubmitting] = React.useState(false);
  const [priceSuggestion, setPriceSuggestion] = React.useState<number | null>(null);
  const [suggestionBasis, setSuggestionBasis] = React.useState<string>("");

  const allInventory: Item[] = inventoryData?.items ?? [];
  const inventory = allInventory;

  const fetchMyListings = React.useCallback(() => {
    fetch(apiUrl("/api/auction/my-listings"))
      .then(r => r.json())
      .then((data: MyListing[]) => {
        setListings(data);
        setLoading(false);
        onListingCountChange?.(data.length);
      })
      .catch(() => setLoading(false));
  }, [onListingCountChange]);

  React.useEffect(() => {
    fetchMyListings();
    const interval = setInterval(fetchMyListings, 20_000);
    return () => clearInterval(interval);
  }, [fetchMyListings]);

  // Detect sold listings
  React.useEffect(() => {
    const currentIds = new Set(listings.map(l => l.id));
    if (prevListingIds.current.size > 0) {
      const sold = [...prevListingIds.current].filter(id => !currentIds.has(id));
      if (sold.length > 0) {
        setSoldToast(`💰 Item${sold.length > 1 ? "s" : ""} sold! Check your gold.`);
        setTimeout(() => setSoldToast(null), 5000);
      }
    }
    prevListingIds.current = currentIds;
  }, [listings]);

  // Fetch price suggestion when item is selected
  React.useEffect(() => {
    if (!selectedItemId) { setPriceSuggestion(null); setSuggestionBasis(""); return; }
    fetch(apiUrl(`/api/auction/price-suggestion?itemId=${encodeURIComponent(selectedItemId)}`))
      .then(r => r.json())
      .then((d: { suggestion?: number; basis?: string }) => {
        if (d.suggestion) {
          setPriceSuggestion(d.suggestion);
          setSuggestionBasis(d.basis ?? "");
          setListPrice(d.suggestion);
        } else {
          setPriceSuggestion(null);
          setSuggestionBasis("");
        }
      })
      .catch(() => { setPriceSuggestion(null); });
  }, [selectedItemId]);

  const handleCancel = async (listingId: number, _itemName: string) => {
    setCancelling(listingId);
    try {
      const res = await fetch(apiUrl(`/api/auction/${listingId}`), { method: "DELETE" });
      const data = await res.json();
      setMessage({ text: data.message ?? (data.success ? "Cancelled." : "Failed"), ok: !!data.success });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        fetchMyListings();
      }
    } catch {
      setMessage({ text: "Request failed.", ok: false });
    } finally {
      setCancelling(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleList = async () => {
    if (!selectedItemId || listPrice <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auction/list"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selectedItemId, quantity: listQty, buyoutPrice: listPrice, category: listCategory }),
      });
      const data = await res.json();
      setMessage({ text: data.message ?? (data.success ? "Listed!" : "Failed"), ok: !!data.success });
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        fetchMyListings();
        setShowForm(false);
        setSelectedItemId("");
        setListQty(1);
        setListPrice(10);
        setPriceSuggestion(null);
      }
    } catch {
      setMessage({ text: "Request failed.", ok: false });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const selectedInvItem = inventory.find(i => i.id === selectedItemId);
  const maxQty = selectedInvItem?.quantity ?? 1;

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4 p-4">
      {soldToast && (
        <div className="fixed top-4 right-4 z-50 bg-amber-900/90 border border-amber-600 text-amber-200 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium animate-in slide-in-from-top-2">
          {soldToast}
        </div>
      )}

      {message && (
        <div className={cn("p-2 rounded border text-sm", message.ok ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300")}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{listings.length}/20 active listings</div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}
          className="text-xs h-7 bg-amber-700 hover:bg-amber-600 text-white"
          disabled={listings.length >= 20}
        >
          {showForm ? "✕ Cancel" : "+ List Item"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-amber-800/40 bg-amber-950/10">
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-semibold text-amber-400">Post an Item</div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Item</label>
              <select
                value={selectedItemId}
                onChange={e => { setSelectedItemId(e.target.value); setListQty(1); }}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
              >
                <option value="">— Select from inventory —</option>
                {inventory.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name ?? inv.id} ×{inv.quantity ?? 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Quantity (max {maxQty})</label>
                <input type="number" min={1} max={maxQty} value={listQty}
                  onChange={e => setListQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Buyout Price (g)</label>
                <input type="number" min={1} value={listPrice}
                  onChange={e => setListPrice(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
                />
                {priceSuggestion && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    💡 Suggested: {priceSuggestion.toLocaleString()}g
                    <span className="ml-1 text-slate-600">
                      ({suggestionBasis === "recent_sales" ? "based on recent sales" : "based on active listings"})
                    </span>
                    <button onClick={() => setListPrice(priceSuggestion)}
                      className="ml-2 text-amber-500 hover:text-amber-400 underline">
                      Use
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Category</label>
              <select value={listCategory} onChange={e => setListCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-600"
              >
                {["weapons", "armor", "consumables", "materials", "adornments", "misc"].map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                ))}
              </select>
            </div>

            <Button onClick={handleList} disabled={!selectedItemId || submitting}
              className="w-full text-sm bg-amber-700 hover:bg-amber-600 text-white h-9"
            >
              {submitting ? "Posting…" : `Post for ${listPrice.toLocaleString()}g`}
            </Button>
          </CardContent>
        </Card>
      )}

      {listings.length === 0 ? (
        <div className="text-center text-slate-500 py-10">You have no active listings. Post an item above!</div>
      ) : (
        <div className="space-y-2">
          {listings.map(listing => (
            <Card key={listing.id} className="border-slate-800 bg-card/40">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-200">
                    {listing.itemName}
                    {listing.quantity > 1 && <span className="text-slate-500 font-normal ml-1">×{listing.quantity}</span>}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {CATEGORY_ICONS[listing.category] ?? ""} {listing.category} · ⏳ {timeLeft(listing.expiresAt)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-amber-400 text-sm">💰 {listing.buyoutPrice.toLocaleString()}g</div>
                  <Button size="sm" variant="ghost"
                    onClick={() => handleCancel(listing.id, listing.itemName)}
                    disabled={cancelling === listing.id}
                    className="text-[10px] h-6 text-red-500 hover:text-red-300 mt-0.5 px-2"
                  >
                    {cancelling === listing.id ? "…" : "Cancel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vendor Tab (existing NPC shop) ──────────────────────────────────────────

// The API appends travelingMerchant to the Shop response; extend locally since
// it is not part of the generated schema contract yet.
type ShopExtended = Shop & { travelingMerchant?: { name: string; items: ShopItem[] } };

function VendorTab({ character }: { character: Character | undefined }) {
  const queryClient = useQueryClient();
  const { data: shopData, isLoading } = useGetShopItems({ zone: character?.zone });
  const shop = shopData as ShopExtended | undefined;
  const buyItem = useBuyItem();
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [buyMessage, setBuyMessage] = React.useState<string | null>(null);
  const [examineItem, setExamineItem] = React.useState<ExamineItem | null>(null);

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  const items: ShopItem[] = shop?.items ?? [];
  const categories = shop?.categories ?? [];
  const travelingMerchant = shop?.travelingMerchant;

  const handleBuy = (itemId: string, name: string, price: number, merchantStockIndex?: number) => {
    const payload: Record<string, unknown> = merchantStockIndex !== undefined
      ? { merchantStockIndex, quantity: 1 }
      : { itemId, quantity: 1 };
    buyItem.mutate({ data: payload as any }, {
      onSuccess: (data: BuyResult) => {
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
        setBuyMessage(data?.success ? `Purchased ${name}! -${price}g` : data?.message ?? "Failed");
        setTimeout(() => setBuyMessage(null), 3000);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <NpcDialogueModal
          npcName={shop?.merchantName ?? "Merchant"}
          npcRole="merchant"
          context={`Selling goods in ${character?.zone}`}
        />
        <span className="text-slate-500 text-sm">{shop?.merchantName ?? "Merchant"} — {character?.zone}</span>
      </div>

      {buyMessage && (
        <div className={cn("p-2 rounded border text-sm", buyMessage.startsWith("Purchased") ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300")}>
          {buyMessage}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedCategory("all")}
          className={cn("px-3 py-1 rounded text-xs border transition-colors", selectedCategory === "all" ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400")}>
          All
        </button>
        {categories.map((cat: string) => (
          <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? "all" : cat)}
            className={cn("px-3 py-1 rounded text-xs border transition-colors", selectedCategory === cat ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400")}>
            {CATEGORY_ICONS[cat] ?? ""} {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((entry: ShopItem) => {
          const item = entry.item;
          if (!item) return null;
          if (selectedCategory !== "all") {
            const catItems = items.filter((e: ShopItem) => e.item?.type === selectedCategory);
            if (catItems.length > 0 && !catItems.includes(entry)) return null;
          }
          const canAfford = (character?.gold ?? 0) >= entry.buyPrice;
          const rarityColor = RARITY_COLORS[item.rarity] ?? "text-slate-400";
          const isPricedUp = entry.buyPrice > (entry as any).basePrice;
          const isPricedDown = entry.buyPrice < (entry as any).basePrice;

          return (
            <Card key={item.id} className="border-slate-800 bg-card/40 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "w-12 h-12 shrink-0 rounded-md border-2 flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-default relative",
                            RARITY_ICON_FRAME[item.rarity] ?? RARITY_ICON_FRAME.common
                          )}>
                            <SpriteImage spriteId={item.spriteId} slot={item.slot} type={item.type} size={36} />
                            {isGearType(item.type ?? "") && computeItemGS(item.level ?? 0, item.rarity, item.slot) > 0 && (
                              <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
                                GS {computeItemGS(item.level ?? 0, item.rarity, item.slot)}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
                          <ItemTooltipContent item={item as unknown as ItemTooltipData} />
                        </TooltipContent>
                      </Tooltip>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
                      <ContextMenuItem onSelect={() => setExamineItem(item as ExamineItem)}>
                        Examine
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("font-semibold text-sm truncate", rarityColor)}>{item.name}</span>
                      {isGearType(item.type ?? "") && computeItemGS(item.level ?? 0, item.rarity, item.slot) > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                          GS {computeItemGS(item.level ?? 0, item.rarity, item.slot)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{item.type} · {item.rarity}</div>
                    {item.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</div>}
                    {item.stats && Object.keys(item.stats).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(item.stats as Record<string, number>).filter(([, v]) => v).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-1 py-0.5 bg-slate-800 rounded text-slate-400">{k}: +{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                  <div>
                    <span className={cn("font-semibold text-sm", isPricedUp ? "text-red-400" : isPricedDown ? "text-green-400" : "text-amber-400")}>
                      💰 {entry.buyPrice.toLocaleString()}g
                    </span>
                    {(isPricedUp || isPricedDown) && (
                      <span className={cn("ml-1 text-[10px]", isPricedUp ? "text-red-600" : "text-green-600")}>
                        ({isPricedUp ? "+" : ""}{Math.round((entry.buyPrice / (entry as any).basePrice - 1) * 100)}%)
                      </span>
                    )}
                  </div>
                  <Button size="sm" onClick={() => handleBuy(item.id, item.name, entry.buyPrice)}
                    disabled={!canAfford || buyItem.isPending}
                    className={cn("text-xs h-7", canAfford ? "bg-amber-700 hover:bg-amber-600 text-white" : "opacity-40")}
                  >
                    {canAfford ? "Buy" : "Can't afford"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8">No items available in {character?.zone}</div>
        )}
      </div>

      {travelingMerchant && travelingMerchant.items.length > 0 && (
        <div className="space-y-3">
          <Card className="border-amber-800/40 bg-amber-950/10">
            <CardHeader className="py-2 px-4 border-b border-amber-800/30">
              <CardTitle className="text-sm font-bold text-amber-400 flex items-center gap-2">
                🧳 {travelingMerchant.name}
                <span className="text-xs font-normal text-amber-600 ml-1">— Rare wares from across Norrath (limited stock)</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {travelingMerchant.items.map((entry: ShopItem) => {
              const item = entry.item;
              if (!item) return null;
              const canAfford = (character?.gold ?? 0) >= entry.buyPrice;
              const rarityColor = RARITY_COLORS[item.rarity] ?? "text-slate-400";
              return (
                <Card key={item.id} className={cn("border-2 bg-card/40 backdrop-blur", RARITY_ICON_FRAME[item.rarity] ?? "border-slate-700")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "w-12 h-12 shrink-0 rounded-md border-2 flex items-center justify-center bg-gradient-to-b from-amber-900/30 to-slate-900/80 cursor-default relative",
                                RARITY_ICON_FRAME[item.rarity] ?? RARITY_ICON_FRAME.common
                              )}>
                                <SpriteImage spriteId={item.spriteId} slot={item.slot} type={item.type} size={36} />
                                {isGearType(item.type ?? "") && computeItemGS(item.level ?? 0, item.rarity, item.slot) > 0 && (
                                  <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
                                    GS {computeItemGS(item.level ?? 0, item.rarity, item.slot)}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
                              <ItemTooltipContent item={item as unknown as ItemTooltipData} />
                            </TooltipContent>
                          </Tooltip>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
                          <ContextMenuItem onSelect={() => setExamineItem(item as ExamineItem)}>
                            Examine
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("font-semibold text-sm truncate", rarityColor)}>{item.name}</span>
                          {isGearType(item.type ?? "") && computeItemGS(item.level ?? 0, item.rarity, item.slot) > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                              GS {computeItemGS(item.level ?? 0, item.rarity, item.slot)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">{item.type} · {item.rarity} · Lv {item.level}</div>
                        {item.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2 italic">{item.description}</div>}
                        {item.stats && Object.keys(item.stats).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(item.stats as Record<string, number>).filter(([, v]) => v).map(([k, v]) => (
                              <span key={k} className="text-[10px] px-1 py-0.5 bg-slate-800 rounded text-amber-500/80">{k}: +{v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-amber-400">💰 {entry.buyPrice.toLocaleString()}g</span>
                        <span className="text-[10px] text-slate-600">Limited stock</span>
                      </div>
                      <Button size="sm"
                        onClick={() => handleBuy(item.id, item.name, entry.buyPrice, (entry as any).stockIndex)}
                        disabled={!canAfford || buyItem.isPending}
                        className={cn("text-xs h-7", canAfford ? "bg-amber-700 hover:bg-amber-600 text-white" : "opacity-40")}
                      >
                        {canAfford ? "Buy" : "Can't afford"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      <ExamineDialog item={examineItem} open={!!examineItem} onClose={() => setExamineItem(null)} />
    </div>
  );
}

// ─── Auction Hall Page ────────────────────────────────────────────────────────

type TabId = "auction" | "my-listings" | "vendor";

export default function ShopPage() {
  const { data: character } = useGetCharacter();
  const [tab, setTab] = React.useState<TabId>("auction");
  const [gold, setGold] = React.useState(character?.gold ?? 0);
  const [listingsCount, setListingsCount] = React.useState(0);
  const [location] = useLocation();

  React.useEffect(() => {
    if (character?.gold !== undefined) setGold(character.gold);
  }, [character?.gold]);

  // Handle quicklist param from inventory
  const quicklistItemId = React.useMemo(() => {
    const qs = location.split("?")[1] ?? "";
    return new URLSearchParams(qs).get("quicklist") ?? undefined;
  }, [location]);

  React.useEffect(() => {
    if (quicklistItemId) {
      setTab("my-listings");
    }
  }, [quicklistItemId]);

  const refreshGold = React.useCallback(() => {
    fetch(apiUrl("/api/character"))
      .then(r => r.json())
      .then((d: Character) => { if (d?.gold !== undefined) setGold(d.gold); })
      .catch(() => {});
  }, []);

  const tabs: { id: TabId; label: string }[] = [
    { id: "auction", label: "🏛 Auction" },
    { id: "my-listings", label: "📋 My Listings" },
    { id: "vendor", label: "🛍 Vendor" },
  ];

  return (
    <div className="h-full flex flex-col gap-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif font-bold text-amber-400">🏛 Auction Hall</h1>
            <p className="text-xs text-slate-500 mt-0.5">Live player & ghost economy</p>
          </div>
          <div className="flex items-center gap-3">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium transition-colors rounded-lg border",
                  tab === t.id
                    ? "border-amber-600/50 text-amber-400 bg-amber-900/20"
                    : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ticker (auction tab only) */}
      {tab === "auction" && (
        <div className="px-4 py-2 border-b border-slate-800/40 shrink-0">
          <SalesTicker />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {tab === "auction" && (
          <AuctionBrowse
            gold={gold}
            onGoldChange={refreshGold}
            listingsCount={listingsCount}
          />
        )}
        {tab === "my-listings" && (
          <div className="flex-1 overflow-y-auto">
            <MyListings
              defaultItemId={quicklistItemId}
              onListingCountChange={setListingsCount}
            />
          </div>
        )}
        {tab === "vendor" && (
          <div className="flex-1 overflow-y-auto p-4">
            <VendorTab character={character} />
          </div>
        )}
      </div>
    </div>
  );
}
