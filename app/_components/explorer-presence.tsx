"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { explorerPollMs, parseExplorerSnapshot, type ExplorerSnapshot } from "../../lib/explorer-client";

type ExplorerContextValue = { snapshot: ExplorerSnapshot | null; connected: boolean; loading: boolean };
const ExplorerContext = createContext<ExplorerContextValue>({ snapshot: null, connected: false, loading: true });
export function useExplorers(): ExplorerContextValue { return useContext(ExplorerContext); }

export function ExplorerProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ExplorerSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;
    let pending = false;
    async function poll(): Promise<void> {
      if (disposed || document.hidden || pending) return;
      pending = true;
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), 8000);
      try {
        const response = await fetch("/api/explorers", {
          method: "GET", cache: "no-store", credentials: "omit", signal: current.signal
        });
        if (!response.ok) throw new Error("Count unavailable");
        const result = parseExplorerSnapshot(await response.json());
        if (!result) throw new Error("Invalid count response");
        if (!disposed && !document.hidden) { setSnapshot(result); setConnected(result.available); }
      } catch {
        if (!disposed) setConnected(false);
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (!disposed) {
          setLoading(false);
          if (!document.hidden) timer = setTimeout(poll, explorerPollMs);
        }
      }
    }
    function visibility(): void {
      clearTimeout(timer);
      if (document.hidden) { controller?.abort(); setConnected(false); }
      else void poll();
    }
    document.addEventListener("visibilitychange", visibility);
    void poll();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  return <ExplorerContext.Provider value={{ snapshot, connected, loading }}>{children}</ExplorerContext.Provider>;
}

export function ExplorerCount() {
  const { snapshot, connected, loading } = useExplorers();
  let label = "Explorer radio";
  if (loading) label = "Listening…";
  else if (connected && snapshot?.visitsToday !== null && snapshot?.visitsToday !== undefined) {
    label = `${snapshot.visitsToday.toLocaleString()} ${snapshot.visitsToday === 1 ? "explorer" : "explorers"} today`;
  }
  return <details className="explorerPresence" data-connected={connected}>
    <summary><i aria-hidden="true" /><span>{label}</span><span className="explorerChevron" aria-hidden="true">⌄</span></summary>
    <div className="explorerReport">
      <strong>A little company out here.</strong>
      {connected && snapshot ? <>
        <div className="explorerTotal"><b>{snapshot.visitsToday?.toLocaleString()}</b><span>explorers today</span></div>
        <p>Visitors to this website since midnight UTC. A daily estimate, not a live headcount.</p>
      </> : <p>The visitor count is taking a little nap. Your cat can keep exploring.</p>}
      <p className="explorerFinePrint">Cookie-free website statistics from Vercel. Reporting can take a little time to catch up.</p>
      <a href="/privacy#website-analytics">How we count visits</a>
    </div>
  </details>;
}
