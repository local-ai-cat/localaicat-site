"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScrollHeaderProps = {
  children: React.ReactNode;
};

export function ScrollHeader({ children }: ScrollHeaderProps) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      // Hide after scrolling down 80px, show immediately on scroll up
      if (y > 80 && y > lastY.current) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY.current = y;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <header className={`siteHeader ${hidden ? "siteHeaderHidden" : ""}`}>
      {children}
    </header>
  );
}
