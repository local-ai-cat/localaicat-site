"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    mermaid?: {
      initialize: (cfg: Record<string, unknown>) => void;
      render: (id: string, chart: string) => Promise<{ svg: string }>;
    };
  }
}

let loader: Promise<NonNullable<Window["mermaid"]>> | null = null;

function loadMermaid(): Promise<NonNullable<Window["mermaid"]>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/mermaid.min.js"; // vendored, same-origin (passes CSP script-src 'self')
      script.onload = () => {
        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              fontFamily: "var(--font-body), system-ui, sans-serif",
              fontSize: "13px",
              background: "#060606",
              primaryColor: "#16140f",
              primaryBorderColor: "rgba(240,236,228,0.55)",
              primaryTextColor: "#f0ece4",
              lineColor: "rgba(240,236,228,0.4)",
              secondaryColor: "#13241a",
              tertiaryColor: "#121213"
            }
          });
          resolve(window.mermaid);
        } else {
          reject(new Error("mermaid missing after load"));
        }
      };
      script.onerror = () => reject(new Error("mermaid failed to load"));
      document.head.appendChild(script);
    });
  }
  return loader;
}

let counter = 0;

export function Mermaid({ chart }: { chart: string }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    counter += 1;
    const id = `bs-mermaid-${counter}`;
    loadMermaid()
      .then((mermaid) => mermaid.render(id, chart.trim()))
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && ref.current) {
          ref.current.textContent = `diagram failed to render: ${String(err)}`;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return <div className="bs-mermaid" ref={ref} />;
}
