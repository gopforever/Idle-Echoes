import * as React from "react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

interface Message {
  role: "player" | "npc";
  text: string;
}

interface NpcDialogueModalProps {
  npcName: string;
  npcRole?: string;
  context?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function NpcDialogueModal({ npcName, npcRole, context, triggerLabel, triggerClassName }: NpcDialogueModalProps) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting on first open
  React.useEffect(() => {
    if (open && messages.length === 0) {
      sendMessage("Greetings.");
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "player", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/api/npc/dialogue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npcName, npcRole, playerMessage: trimmed, context }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "npc", text: data.reply ?? "..." }]);
    } catch {
      setMessages(prev => [...prev, { role: "npc", text: "I... have no words for you right now, traveler." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "text-xs px-3 py-1.5 rounded border border-amber-700/50 text-amber-500 hover:bg-amber-900/20 transition-colors",
          triggerClassName
        )}
      >
        {triggerLabel ?? `💬 Talk to ${npcName.split(" ")[0]}`}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-700/40 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <div className="text-sm font-semibold text-amber-400">{npcName}</div>
                {npcRole && <div className="text-xs text-slate-500 capitalize">{npcRole}</div>}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none"
              >✕</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "player" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed",
                    msg.role === "player"
                      ? "bg-amber-900/40 border border-amber-700/40 text-amber-100"
                      : "bg-slate-800 border border-slate-700 text-slate-200"
                  )}>
                    {msg.role === "npc" && <span className="block text-[10px] text-amber-500 mb-1 font-semibold">{npcName}</span>}
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-500 animate-pulse">
                    {npcName} is speaking...
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {["What wares do you have?", "Tell me about this zone.", "Any quests for me?"].map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-400 hover:border-amber-700/60 hover:text-amber-400 transition-colors disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 pb-4 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say something..."
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-700/60 disabled:opacity-40"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium transition-colors disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
