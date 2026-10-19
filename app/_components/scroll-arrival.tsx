"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Content stays visible without JavaScript; motion plays once on arrival. */
export function ScrollArrival({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    if (!ref.current || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setArrived(true);
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={arrived ? "scrollArrival scrollArrivalVisible" : "scrollArrival"}>{children}</div>;
}
