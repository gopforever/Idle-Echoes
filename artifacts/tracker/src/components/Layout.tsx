import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 ml-60 min-h-screen">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        {/* Sidebar footer note */}
        <div
          className="fixed bottom-0 left-0 w-60 px-4 py-3 text-xs text-muted-foreground"
          style={{ borderTop: "1px solid #1f2937", background: "#0d0d14" }}
        >
          <p className="font-medium text-foreground/60">Melvor EQ2 Tracker</p>
          <p>v0.1.0 · {time.toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
