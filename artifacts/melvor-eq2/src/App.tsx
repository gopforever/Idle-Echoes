import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import Combat from "@/pages/combat";
import CharacterSheet from "@/pages/character";
import InventoryPage from "@/pages/inventory";
import BankPage from "@/pages/bank";
import SkillsPage from "@/pages/skills";
import GatheringPage from "@/pages/gathering";
import CraftingPage from "@/pages/crafting";
import CharacterCreation from "@/pages/creation";
import ZonesPage from "@/pages/zones";
import ShopPage from "@/pages/shop";
import FactionsPage from "@/pages/factions";
import AchievementsPage from "@/pages/achievements";
import AATreePage from "@/pages/aa";
import MountsPage from "@/pages/mounts";
import CollectionsPage from "@/pages/collections";
import AdornmentsPage from "@/pages/adornments";
import WorldPage from "@/pages/world";
import QuestsPage from "@/pages/quests";
import DungeonsPage from "@/pages/dungeons";
import DungeonsRunPage from "@/pages/dungeons-run";
import RaidsPage from "@/pages/raids";
import RaidsRunPage from "@/pages/raids-run";
import BestiaryPage from "@/pages/bestiary";
import TradeskillsPage from "@/pages/tradeskills";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import CharacterSelectPage from "@/pages/character-select";
import { setBaseUrl } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import React, { useEffect } from "react";

const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) {
  setBaseUrl(apiBase.replace(/\/+$/, ""));
}

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-amber-400 text-lg animate-pulse">Loading…</div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
    } else if (!user.activeCharacterId) {
      navigate("/character-select");
    }
  }, [user, loading, navigate]);

  if (loading) return <LoadingScreen />;
  if (!user || !user.activeCharacterId) return null;
  return <>{children}</>;
}

function AuthGateLoggedIn({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/character-select">
        {() => (
          <AuthGateLoggedIn>
            <CharacterSelectPage />
          </AuthGateLoggedIn>
        )}
      </Route>
      <Route path="/creation">
        {() => (
          <AuthGateLoggedIn>
            <CharacterCreation />
          </AuthGateLoggedIn>
        )}
      </Route>
      <Route>
        {() => (
          <AuthGate>
            <MainLayout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/combat" component={Combat} />
                <Route path="/character" component={CharacterSheet} />
                <Route path="/inventory" component={InventoryPage} />
                <Route path="/bank" component={BankPage} />
                <Route path="/skills" component={SkillsPage} />
                <Route path="/gathering" component={GatheringPage} />
                <Route path="/crafting" component={CraftingPage} />
                <Route path="/zones" component={ZonesPage} />
                <Route path="/shop" component={ShopPage} />
                <Route path="/factions" component={FactionsPage} />
                <Route path="/achievements" component={AchievementsPage} />
                <Route path="/aa" component={AATreePage} />
                <Route path="/adornments" component={AdornmentsPage} />
                <Route path="/mounts" component={MountsPage} />
                <Route path="/collections" component={CollectionsPage} />
                <Route path="/world" component={WorldPage} />
                <Route path="/quests" component={QuestsPage} />
                <Route path="/bestiary" component={BestiaryPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/tradeskills" component={TradeskillsPage} />
                <Route path="/dungeons/run" component={DungeonsRunPage} />
                <Route path="/dungeons/raids/run" component={RaidsRunPage} />
                <Route path="/dungeons/raids" component={RaidsPage} />
                <Route path="/dungeons" component={DungeonsPage} />
                <Route component={NotFound} />
              </Switch>
            </MainLayout>
          </AuthGate>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
