import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { useGetCharacter, getGetCharacterQueryKey, getGetInventoryQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SpriteImage } from "@/components/game/item-icon";
import { Landmark, Package, Coins, Search, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface BankItem {
  id: string; name: string; slot: string; type: string;
  level: number; rarity: string; stats: Record<string, number>;
  sellPrice: number; quantity: number; description?: string;
  spriteId?: string; rowId?: number;
}

interface BankData {
  items: BankItem[];
  bankGold: number;
  walletGold: number;
}

// ── Rarity styles (shared) ────────────────────────────────────────────────────

const RARITY_STYLES: Record<string, { border: string; glow: string; text: string; badge: string; label: string }> = {
  common:    { border: "border-slate-700",  glow: "",                                        text: "text-slate-300",  badge: "bg-slate-800 text-slate-400",    label: "Common" },
  uncommon:  { border: "border-green-700",  glow: "shadow-[0_0_10px_rgba(34,197,94,0.2)]",  text: "text-green-400",  badge: "bg-green-950 text-green-400",    label: "Uncommon" },
  rare:      { border: "border-blue-700",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",text: "text-blue-400",   badge: "bg-blue-950 text-blue-400",      label: "Rare" },
  legendary: { border: "border-purple-700", glow: "shadow-[0_0_14px_rgba(168,85,247,0.3)]", text: "text-purple-400", badge: "bg-purple-950 text-purple-400",  label: "Legendary" },
  fabled:    { border: "border-orange-600", glow: "shadow-[0_0_16px_rgba(234,88,12,0.35)]", text: "text-orange-400", badge: "bg-orange-950 text-orange-400",  label: "Fabled" },
  mythical:  { border: "border-red-600",    glow: "shadow-[0_0_18px_rgba(220,38,38,0.4)]",  text: "text-red-400",    badge: "bg-red-950 text-red-400",        label: "Mythical" },
};

// ── Query key ─────────────────────────────────────────────────────────────────

const BANK_KEY = ["bank"];

async function fetchBank(): Promise<BankData> {
  const res = await fetch(apiUrl("/api/bank"));
  if (!res.ok) throw new Error("Failed to load bank");
  return res.json();
}

// ── Item card ─────────────────────────────────────────────────────────────────

function BankItemCard({ item, onWithdraw, pending }: {
  item: BankItem; onWithdraw: () => void; pending: boolean;
}) {
  const rs = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 bg-gradient-to-r from-slate-900/80 to-slate-950/80",
        rs.border, rs.glow
      )}
    >
      <div className={cn("w-10 h-10 shrink-0 rounded border flex items-center justify-center bg-slate-800/60", rs.border)}>
        <SpriteImage spriteId={item.spriteId} slot={item.slot} type={item.type} size={32} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-bold truncate leading-tight", rs.text)}>{item.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide", rs.badge)}>{rs.label}</span>
          <span className="text-[10px] text-slate-600 capitalize">Lv {item.level}</span>
          {item.quantity > 1 && (
            <span className="text-[10px] text-slate-400 font-semibold">×{item.quantity}</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onWithdraw}
        disabled={pending}
        className="h-7 text-[10px] px-2.5 shrink-0 bg-amber-800 hover:bg-amber-700 text-white border-0"
      >
        {pending ? "…" : <><ArrowUpFromLine className="w-3 h-3 mr-1" />Take</>}
      </Button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BankPage() {
  const queryClient = useQueryClient();
  const { data: bankData, isLoading } = useQuery({ queryKey: BANK_KEY, queryFn: fetchBank });
  const { data: character } = useGetCharacter();

  const [activeTab, setActiveTab] = React.useState<"items" | "gold">("items");
  const [search, setSearch] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [goldAmount, setGoldAmount] = React.useState("");
  const [goldPending, setGoldPending] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: BANK_KEY });
    queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInventoryQueryKey() });
  };

  const handleWithdraw = async (item: BankItem) => {
    setPendingId(item.id);
    try {
      const r = await fetch(apiUrl("/api/bank/withdraw-item"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, quantity: 1 }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`Withdrew ${item.name} to inventory`);
        invalidate();
      } else {
        showToast(d.error ?? "Could not withdraw item");
      }
    } finally { setPendingId(null); }
  };

  const handleGoldAction = async (action: "deposit" | "withdraw") => {
    const amt = parseInt(goldAmount, 10);
    if (!amt || amt <= 0) { showToast("Enter a valid amount"); return; }
    setGoldPending(true);
    try {
      const r = await fetch(apiUrl(`/api/bank/${action}-gold`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const d = await r.json();
      if (r.ok) {
        showToast(`${action === "deposit" ? "Deposited" : "Withdrew"} ${amt.toLocaleString()}g`);
        setGoldAmount("");
        invalidate();
      } else {
        showToast(d.error ?? `Could not ${action} gold`);
      }
    } finally { setGoldPending(false); }
  };

  const filteredItems = (bankData?.items ?? []).filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Landmark className="w-5 h-5 text-amber-500" />
        <div>
          <h1 className="text-lg font-black font-serif text-slate-100">Bank of Norrath</h1>
          <p className="text-xs text-slate-600">Unlimited secure storage for your belongings</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 self-start">
        <button
          onClick={() => setActiveTab("items")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
            activeTab === "items" ? "bg-amber-900/40 text-amber-400 border border-amber-800/50" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          Items
          {bankData && bankData.items.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-300 text-[9px] font-bold">
              {bankData.items.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("gold")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors",
            activeTab === "gold" ? "bg-amber-900/40 text-amber-400 border border-amber-800/50" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Coins className="w-3.5 h-3.5" />
          Gold
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-xl" />
      ) : activeTab === "items" ? (
        <Card className="flex-1 bg-card/30 border-slate-800 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="px-4 py-2.5 border-b border-slate-800/50 bg-slate-900/40 flex items-center gap-3 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-600" />
            <Input
              placeholder="Search stored items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 bg-transparent border-0 text-xs p-0 focus-visible:ring-0 text-slate-300 placeholder:text-slate-600"
            />
            <span className="text-xs text-slate-700 shrink-0">{filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredItems.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 text-center"
                >
                  <Landmark className="w-10 h-10 text-slate-800 mb-3" />
                  <p className="text-sm text-slate-600">
                    {search ? "No items match your search" : "Your bank vault is empty"}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    {!search && "Deposit items from your Inventory page"}
                  </p>
                </motion.div>
              ) : (
                filteredItems.map(item => (
                  <BankItemCard
                    key={item.id}
                    item={item}
                    onWithdraw={() => handleWithdraw(item)}
                    pending={pendingId === item.id}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </Card>
      ) : (
        // Gold tab
        <div className="space-y-4">
          {/* Balances */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-900/60 border-slate-800 p-4">
              <div className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-1">Wallet</div>
              <div className="text-2xl font-black text-amber-400">
                💰 {(bankData?.walletGold ?? character?.gold ?? 0).toLocaleString()}g
              </div>
              <div className="text-[10px] text-slate-600 mt-1">Gold on your person</div>
            </Card>
            <Card className="bg-slate-900/60 border-amber-900/30 border p-4">
              <div className="text-xs text-slate-600 uppercase tracking-widest font-bold mb-1">Bank Vault</div>
              <div className="text-2xl font-black text-amber-300">
                🏦 {(bankData?.bankGold ?? 0).toLocaleString()}g
              </div>
              <div className="text-[10px] text-slate-600 mt-1">Secured in the vault</div>
            </Card>
          </div>

          {/* Transfer controls */}
          <Card className="bg-slate-900/40 border-slate-800 p-4 space-y-3">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Transfer Gold</div>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                placeholder="Amount…"
                value={goldAmount}
                onChange={e => setGoldAmount(e.target.value)}
                className="flex-1 h-9 bg-slate-900 border-slate-700 text-sm"
              />
              <Button
                size="sm"
                onClick={() => handleGoldAction("deposit")}
                disabled={goldPending}
                className="h-9 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 border-0"
                title="Deposit gold from wallet to bank"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
                Deposit
              </Button>
              <Button
                size="sm"
                onClick={() => handleGoldAction("withdraw")}
                disabled={goldPending}
                className="h-9 px-3 text-xs bg-amber-800 hover:bg-amber-700 text-white border-0"
                title="Withdraw gold from bank to wallet"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" />
                Withdraw
              </Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[100, 500, 1000, 5000].map(v => (
                <button
                  key={v}
                  onClick={() => setGoldAmount(String(v))}
                  className="text-[10px] px-2 py-1 rounded border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
                >
                  {v.toLocaleString()}g
                </button>
              ))}
              <button
                onClick={() => setGoldAmount(String(Math.floor(bankData?.walletGold ?? 0)))}
                className="text-[10px] px-2 py-1 rounded border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
              >
                All wallet
              </button>
              <button
                onClick={() => setGoldAmount(String(Math.floor(bankData?.bankGold ?? 0)))}
                className="text-[10px] px-2 py-1 rounded border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
              >
                All bank
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 shadow-xl whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
