import * as React from "react";
import { useGetShopItems, useBuyItem, useGetCharacter, useGetInventory, getGetCharacterQueryKey, getGetInventoryQueryKey, type Item, type Character, type Shop, type ShopItem, type BuyResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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

// ─── Market Pulse Strip ───────────────────────────────────────────────────────

interface MarketEntry {
  category: string; demandScore: number; trend: "high" | "normal" | "low"; multiplier: number;
}

const ALL_MARKET_CATEGORIES = ["consumables", "weapons", "armor", "mounts", "materials", "adornments", "accessories"];
const TREND_LABEL: Record<string, string> = { high: "High", normal: "Normal", low: "Low" };

function MarketPulse() {
  const [data, setData] = React.useState<MarketEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

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
          setLoading(false);
        })
        .catch(() => { if (alive) setLoading(false); });
    };
    doFetch();
    const interval = setInterval(doFetch, 30_000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 flex-wrap">
        {ALL_MARKET_CATEGORIES.map((_, i) => <Skeleton key={i} className="h-6 w-24 rounded-full" />)}
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold shrink-0">Ghost Demand:</span>
      {data.map(entry => {
        const icon = CATEGORY_ICONS[entry.category] ?? "📦";
        const priceDelta = Math.round((entry.multiplier - 1) * 100);
        const isHigh = entry.trend === "high";
        const isMid = entry.trend === "normal";
        return (
          <span key={entry.category}
            title={`${entry.category}: demand ${entry.demandScore}/100 — prices ${priceDelta > 0 ? "+" : ""}${priceDelta}%`}
            className={cn(
              "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
              isHigh ? "bg-red-950/30 border-red-700/50 text-red-400"
                : isMid ? "bg-amber-950/30 border-amber-700/50 text-amber-400"
                : "bg-slate-900 border-slate-700 text-slate-500"
            )}
          >
            {icon} {entry.category}
            <span className="text-[9px] opacity-70">{TREND_LABEL[entry.trend]}</span>
            {priceDelta !== 0 && (
              <span className={cn("tabular-nums", priceDelta > 0 ? (isHigh ? "text-red-300" : "text-amber-300") : "text-green-400")}>
                {priceDelta > 0 ? "+" : ""}{priceDelta}%
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Auction Listing types ────────────────────────────────────────────────────

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

// ─── Auction Browse Tab ───────────────────────────────────────────────────────

function AuctionBrowse({ gold, onGoldChange }: { gold: number; onGoldChange: () => void }) {
  const queryClient = useQueryClient();
  const [listings, setListings] = React.useState<AuctionListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [craftedOnly, setCraftedOnly] = React.useState(false);
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

  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>;

  return (
    <div className="space-y-4">
      {message && (
        <div className={cn("p-2 rounded border text-sm", message.ok ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300")}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {AUCTION_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={cn("px-3 py-1 rounded text-xs border transition-colors",
              category === cat ? "border-amber-500 text-amber-400 bg-amber-900/20" : "border-slate-700 text-slate-400 hover:border-slate-600"
            )}>
            {cat !== "all" && (CATEGORY_ICONS[cat] ?? "")} {cat === "all" ? "All" : cat}
          </button>
        ))}
        <button
          onClick={() => setCraftedOnly(v => !v)}
          className={cn(
            "px-3 py-1 rounded text-xs border transition-colors flex items-center gap-1",
            craftedOnly
              ? "border-blue-600 text-blue-300 bg-blue-950/30"
              : "border-slate-700 text-slate-400 hover:border-slate-600"
          )}
        >
          ✦ {craftedOnly ? "Handcrafted Only" : "Handcrafted"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-600 w-36"
          />
          <button onClick={fetchListings} className="px-3 py-1 rounded text-xs border border-slate-700 text-slate-500 hover:text-slate-300 transition-colors">
            ↻
          </button>
        </div>
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const filtered = q ? listings.filter(l => l.itemName.toLowerCase().includes(q) || l.sellerName.toLowerCase().includes(q)) : listings;
        return filtered;
      })().length === 0 && listings.length > 0 ? (
        <div className="text-center text-slate-500 py-8">No listings match your search.</div>
      ) : listings.length === 0 ? (
        <div className="text-center text-slate-500 py-12">No listings in this category.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.filter(l => {
            const q = search.trim().toLowerCase();
            return !q || l.itemName.toLowerCase().includes(q) || l.sellerName.toLowerCase().includes(q);
          }).map(listing => {
            const item = listing.itemData;
            const rarity = (item?.rarity as string) ?? "common";
            const canAfford = gold >= listing.buyoutPrice;
            const isOwn = listing.isPlayerListing;

            const meta = listing.craftedMeta;
            const isHandcrafted = !!meta;
            const isOneOfAKind = meta?.isOneOfAKind;
            const isCritCraft = meta?.isCritical;
            const isGhost = listing.isGhostCrafter;
            const tierBadge = meta?.recipeTier;
            const qNum = meta?.resourceQuality ?? 0;

            const cardBorder = isOneOfAKind
              ? "border-amber-400/60 bg-amber-950/15 shadow-amber-800/20 shadow-sm"
              : isCritCraft
                ? "border-purple-600/50 bg-purple-950/10"
                : isOwn
                  ? "border-amber-700/50 bg-amber-950/10"
                  : "border-slate-800";

            return (
              <Card key={listing.id} className={cn("border bg-card/40 backdrop-blur", cardBorder)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {(() => {
                      const tooltipItem: ItemTooltipData = {
                        name: listing.itemName,
                        rarity,
                        slot: item?.slot as string,
                        type: item?.type as string,
                        level: item?.level as number,
                        description: item?.description as string,
                        stats: item?.stats as Record<string, number>,
                        sellPrice: item?.sellPrice as number,
                        spriteId: item?.spriteId as string,
                        quality: (item as unknown as Record<string, unknown>)?.quality as number | undefined,
                      };
                      return (
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "w-11 h-11 shrink-0 rounded border-2 flex items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900/80 cursor-default relative",
                                  isOneOfAKind ? "border-amber-400/70" : RARITY_ICON_FRAME[rarity] ?? RARITY_ICON_FRAME.common
                                )}>
                                  <SpriteImage spriteId={item?.spriteId as string} slot={item?.slot as string} type={item?.type as string} size={32} />
                                  {isGearType(item?.type as string) && computeItemGS(item?.level as number, rarity, item?.slot as string) > 0 && (
                                    <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black px-0.5 py-0 rounded leading-none bg-black/70 text-amber-300 border border-amber-900/60">
                                      GS {computeItemGS(item?.level as number, rarity, item?.slot as string)}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="p-0 border-slate-700 bg-transparent shadow-xl">
                                <ItemTooltipContent item={tooltipItem} />
                              </TooltipContent>
                            </Tooltip>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="bg-slate-900 border-slate-700 text-slate-200">
                            <ContextMenuItem onSelect={() => setExamineItem({ ...tooltipItem, rarity, name: listing.itemName })}>
                              Examine
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={cn("font-semibold text-sm", RARITY_COLORS[rarity] ?? "text-slate-400")}>
                          {listing.itemName}
                        </span>
                        {isGearType(item?.type as string) && computeItemGS(item?.level as number, rarity, item?.slot as string) > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-950/70 text-amber-300 border border-amber-800/50">
                            GS {computeItemGS(item?.level as number, rarity, item?.slot as string)}
                          </span>
                        )}
                        {listing.quantity > 1 && <span className="text-slate-500 font-normal text-xs">×{listing.quantity}</span>}
                        {isOneOfAKind && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/70 text-amber-300 border border-amber-500/50 font-bold">UNIQUE</span>}
                        {isCritCraft && !isOneOfAKind && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-600/50 font-semibold">CRIT</span>}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isOwn ? "⭐ Your listing" : isGhost ? `👻 ${listing.sellerName}` : `🧑 ${listing.sellerName}`} · {CATEGORY_ICONS[listing.category] ?? ""} {listing.category}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">⏳ {timeLeft(listing.expiresAt)}</div>

                      {isHandcrafted && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            ✦ Handcrafted
                          </span>
                          {tierBadge && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded border",
                              tierBadge === "mythic" ? "bg-amber-950/60 text-amber-300 border-amber-600/50"
                                : tierBadge === "expert" ? "bg-blue-950/60 text-blue-300 border-blue-700/50"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            )}>
                              {tierBadge.charAt(0).toUpperCase() + tierBadge.slice(1)}
                            </span>
                          )}
                          {meta?.experimentFocus && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-primary/80 border border-slate-700 capitalize">
                              {meta.experimentFocus} focus
                            </span>
                          )}
                          {qNum > 0 && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded border bg-slate-900",
                              qNum >= 75 ? "text-green-400 border-green-800/50" : qNum >= 50 ? "text-yellow-400 border-yellow-800/50" : "text-red-400 border-red-800/50"
                            )}>
                              Q:{qNum}
                            </span>
                          )}
                          {meta?.craftedBy && (
                            <span className="text-[9px] text-slate-600 italic">by {meta.craftedBy}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                    <div>
                      <span className={cn("font-bold text-sm", canAfford ? "text-amber-400" : "text-slate-500")}>
                        💰 {listing.buyoutPrice.toLocaleString()}g
                      </span>
                      {listing.quantity > 1 && (
                        <span className="ml-1 text-[10px] text-slate-500">
                          ({Math.ceil(listing.buyoutPrice / listing.quantity).toLocaleString()}g ea)
                        </span>
                      )}
                    </div>
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
      )}
      <ExamineDialog item={examineItem} open={!!examineItem} onClose={() => setExamineItem(null)} />
    </div>
  );
}

// ─── My Listings Tab ──────────────────────────────────────────────────────────

function MyListings() {
  const queryClient = useQueryClient();
  const { data: inventoryData } = useGetInventory();
  const [listings, setListings] = React.useState<MyListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState<{ text: string; ok: boolean } | null>(null);
  const [cancelling, setCancelling] = React.useState<number | null>(null);

  // List form state
  const [showForm, setShowForm] = React.useState(false);
  const [selectedItemId, setSelectedItemId] = React.useState("");
  const [listQty, setListQty] = React.useState(1);
  const [listPrice, setListPrice] = React.useState(10);
  const [listCategory, setListCategory] = React.useState("materials");
  const [submitting, setSubmitting] = React.useState(false);

  const allInventory: Item[] = inventoryData?.items ?? [];
  const inventory = allInventory;

  function shopItemIsNoSell(_i: Item): boolean {
    return false;
  }

  const fetchMyListings = React.useCallback(() => {
    fetch(apiUrl("/api/auction/my-listings"))
      .then(r => r.json())
      .then((data: MyListing[]) => { setListings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchMyListings();
    const interval = setInterval(fetchMyListings, 20_000);
    return () => clearInterval(interval);
  }, [fetchMyListings]);

  const handleCancel = async (listingId: number, itemName: string) => {
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
    <div className="space-y-4">
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
                {inventory.map(inv => {
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.name ?? inv.id} ×{inv.quantity ?? 1}
                    </option>
                  );
                })}
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

  React.useEffect(() => {
    if (character?.gold !== undefined) setGold(character.gold);
  }, [character?.gold]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "auction", label: "🏛 Auction" },
    { id: "my-listings", label: "📋 My Listings" },
    { id: "vendor", label: "🛍 Vendor" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-amber-400">Auction Hall</h1>
          <p className="text-slate-400 text-sm mt-1">Player & ghost economy — buy, sell, and track the market</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-amber-400">💰 {(gold).toLocaleString()}g</div>
          <div className="text-xs text-slate-500">Your gold</div>
        </div>
      </div>

      <Card className="border-slate-800/60 bg-slate-900/40">
        <CardHeader className="py-2 px-4 border-b border-slate-800/40">
          <CardTitle className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            📊 Market Pulse
            <span className="font-normal text-slate-600">— ghost adventurer spending shifts prices ±15%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2.5">
          <MarketPulse />
        </CardContent>
      </Card>

      <div className="flex gap-1 border-b border-slate-800/60">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "auction" && (
        <AuctionBrowse gold={gold} onGoldChange={() => {
          fetch(apiUrl("/api/character"))
            .then(r => r.json())
            .then((d: Character) => { if (d?.gold !== undefined) setGold(d.gold); })
            .catch(() => {});
        }} />
      )}
      {tab === "my-listings" && <MyListings />}
      {tab === "vendor" && <VendorTab character={character} />}
    </div>
  );
}
