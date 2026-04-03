import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sword, Plus, LogOut, User, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterSummary {
  id: number;
  name: string;
  race: string;
  class: string;
  archetype: string;
  alignment: string;
  level: number;
  zone: string;
  createdAt: string;
}

export default function CharacterSelectPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { user, logout, selectCharacter, refreshUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(apiUrl("/api/auth/characters"), { credentials: "include" })
      .then(r => r.json())
      .then(setCharacters)
      .catch(() => setError("Failed to load characters"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (characterId: number) => {
    setSelecting(characterId);
    setError("");
    try {
      await selectCharacter(characterId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select character");
      setSelecting(null);
    }
  };

  const handleNewCharacter = () => {
    navigate("/creation");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const raceIcon: Record<string, string> = {
    "High Elf": "🧝",
    "Dark Elf": "🧟",
    "Human": "🧑",
    "Dwarf": "⛏️",
    "Gnome": "🔬",
    "Halfling": "🌿",
    "Kerra": "🐱",
    "Iksar": "🦎",
    "Troll": "👹",
    "Ogre": "💪",
    "Barbarian": "⚔️",
    "Wood Elf": "🌲",
  };

  const archetypeColor: Record<string, string> = {
    Fighter: "text-red-400",
    Scout: "text-green-400",
    Mage: "text-purple-400",
    Priest: "text-blue-400",
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-4 pt-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sword className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-amber-400 tracking-tight">Choose Your Hero</h1>
          {user && (
            <p className="text-slate-400 mt-1 text-sm">
              Welcome back, <span className="text-slate-300 font-medium">{user.username}</span>
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-950/50 border-red-900">
            <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading characters…</div>
        ) : (
          <div className="space-y-3 mb-6">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => handleSelect(char.id)}
                disabled={selecting !== null}
                className={cn(
                  "w-full bg-slate-900 border border-slate-800 rounded-xl p-4",
                  "hover:border-amber-600 hover:bg-slate-800/80 transition-all text-left",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  selecting === char.id && "border-amber-500 bg-slate-800",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="text-3xl w-10 text-center shrink-0">
                    {raceIcon[char.race] ?? "⚔️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-100">{char.name}</span>
                      <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                        Lv {char.level}
                      </span>
                      {char.archetype && (
                        <span className={cn("text-xs font-medium", archetypeColor[char.archetype] ?? "text-slate-400")}>
                          {char.archetype}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {char.race} {char.class}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {char.zone}
                      </span>
                      {char.alignment && (
                        <span className={cn(
                          "flex items-center gap-1",
                          char.alignment === "Qeynos" ? "text-blue-400" : "text-red-400"
                        )}>
                          <Star className="w-3 h-3" />
                          {char.alignment}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-500 text-sm">
                    {selecting === char.id ? (
                      <span className="text-amber-400">Loading…</span>
                    ) : (
                      <span className="text-amber-600 hover:text-amber-400">Play →</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {characters.length === 0 && (
              <div className="text-center text-slate-500 py-8 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="mb-2">No characters yet.</p>
                <p className="text-sm">Create your first hero to begin your adventure!</p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleNewCharacter}
          disabled={characters.length >= 3}
          variant="outline"
          className="w-full border-dashed border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-600 bg-transparent mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          {characters.length >= 3 ? "Character Limit Reached (3/3)" : "Create New Character"}
        </Button>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full text-slate-500 hover:text-slate-300 hover:bg-slate-900"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
