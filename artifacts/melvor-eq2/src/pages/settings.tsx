import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  combatSpeed: "slow" | "normal" | "fast";
  autoSell: boolean;
  autoSellRarity: "common" | "uncommon";
  showDamageNumbers: boolean;
  showWorldEvents: boolean;
  compactMode: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  theme: "dark" | "light" | "system";
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800/60 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-200">{label}</div>
        {description && (
          <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-800 bg-card/40">
      <CardHeader className="pb-2 border-b border-slate-800/60">
        <CardTitle className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settingsQ = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch(apiUrl("/api/settings")).then((r) => r.json()),
  });

  const [local, setLocal] = React.useState<Settings | null>(null);
  const [resetConfirm, setResetConfirm] = React.useState(false);

  // Seed local state once data arrives
  React.useEffect(() => {
    if (settingsQ.data && !local) {
      setLocal(settingsQ.data);
    }
  }, [settingsQ.data, local]);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Settings>) =>
      fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then((r) => r.json()),
    onSuccess: (data: Settings) => {
      queryClient.setQueryData(["settings"], data);
      setLocal(data);
      toast({ description: "Settings saved." });
    },
    onError: () => toast({ description: "Failed to save settings.", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      fetch(apiUrl("/api/settings/reset"), { method: "POST" }).then((r) => r.json()),
    onSuccess: (data: Settings) => {
      queryClient.setQueryData(["settings"], data);
      setLocal(data);
      setResetConfirm(false);
      toast({ description: "Settings reset to defaults." });
    },
    onError: () => toast({ description: "Failed to reset settings.", variant: "destructive" }),
  });

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!local) return;
    const next = { ...local, [key]: value };
    setLocal(next);
    updateMutation.mutate({ [key]: value });
  }

  if (settingsQ.isLoading || !local) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-amber-400">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Customize your Norrath experience</p>
      </div>

      {/* Combat Settings */}
      <SectionCard title="Combat" icon="⚔️">
        <SettingsRow
          label="Combat Speed"
          description="Controls how fast combat ticks are processed"
        >
          <Select
            value={local.combatSpeed}
            onValueChange={(v) => set("combatSpeed", v as Settings["combatSpeed"])}
          >
            <SelectTrigger className="w-28 h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="slow" className="text-xs">Slow</SelectItem>
              <SelectItem value="normal" className="text-xs">Normal</SelectItem>
              <SelectItem value="fast" className="text-xs">Fast</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow
          label="Auto-Sell"
          description="Automatically sell items when inventory is full"
        >
          <Switch
            checked={local.autoSell}
            onCheckedChange={(v) => set("autoSell", v)}
          />
        </SettingsRow>

        {local.autoSell && (
          <SettingsRow
            label="Auto-Sell Rarity"
            description="Only sell items at or below this rarity"
          >
            <Select
              value={local.autoSellRarity}
              onValueChange={(v) => set("autoSellRarity", v as Settings["autoSellRarity"])}
            >
              <SelectTrigger className="w-32 h-8 text-xs bg-slate-900 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="common" className="text-xs">Common</SelectItem>
                <SelectItem value="uncommon" className="text-xs">Uncommon</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>
        )}

        <SettingsRow
          label="Show Damage Numbers"
          description="Display floating damage numbers during combat"
        >
          <Switch
            checked={local.showDamageNumbers}
            onCheckedChange={(v) => set("showDamageNumbers", v)}
          />
        </SettingsRow>
      </SectionCard>

      {/* Interface Settings */}
      <SectionCard title="Interface" icon="🖥️">
        <SettingsRow
          label="Show World Events"
          description="Display world events feed in the Living World panel"
        >
          <Switch
            checked={local.showWorldEvents}
            onCheckedChange={(v) => set("showWorldEvents", v)}
          />
        </SettingsRow>

        <SettingsRow
          label="Compact Mode"
          description="Reduce padding and element sizes for a denser layout"
        >
          <Switch
            checked={local.compactMode}
            onCheckedChange={(v) => set("compactMode", v)}
          />
        </SettingsRow>

        <SettingsRow
          label="Theme"
          description="Choose your preferred color theme"
        >
          <Select
            value={local.theme}
            onValueChange={(v) => set("theme", v as Settings["theme"])}
          >
            <SelectTrigger className="w-28 h-8 text-xs bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="dark" className="text-xs">Dark</SelectItem>
              <SelectItem value="light" className="text-xs">Light</SelectItem>
              <SelectItem value="system" className="text-xs">System</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SectionCard>

      {/* Audio Settings */}
      <SectionCard title="Audio" icon="🔊">
        <SettingsRow
          label="Sound Effects"
          description="Enable combat and UI sound effects"
        >
          <Switch
            checked={local.soundEnabled}
            onCheckedChange={(v) => set("soundEnabled", v)}
          />
        </SettingsRow>

        <SettingsRow
          label="Background Music"
          description="Enable ambient background music"
        >
          <Switch
            checked={local.musicEnabled}
            onCheckedChange={(v) => set("musicEnabled", v)}
          />
        </SettingsRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" icon="🔔">
        <SettingsRow
          label="Notifications"
          description="Show in-game notifications for events and rewards"
        >
          <Switch
            checked={local.notificationsEnabled}
            onCheckedChange={(v) => set("notificationsEnabled", v)}
          />
        </SettingsRow>
      </SectionCard>

      {/* Reset */}
      <Card className="border-red-900/40 bg-card/40">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-300 font-medium">Reset to Defaults</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Restore all settings to their default values
              </div>
            </div>
            {resetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Are you sure?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-slate-400 hover:text-slate-200"
                  onClick={() => setResetConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                onClick={() => setResetConfirm(true)}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
