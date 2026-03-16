"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MobileNavProps = {
  links: ReadonlyArray<{ href: string; label: string }>;
};

export function MobileNav({ links }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="mobileNavWrap">
      <button
        aria-expanded={open}
        aria-label="Menu"
        className="hamburgerButton"
        onClick={toggle}
        type="button"
      >
        <span className={`hamburgerIcon ${open ? "hamburgerIconOpen" : ""}`}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <nav aria-label="Mobile" className="mobileNavDropdown" onClick={close}>
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
