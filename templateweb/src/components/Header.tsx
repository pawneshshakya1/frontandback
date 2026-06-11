"use client";

import { useState } from "react";
import { APP, NAV_LINKS } from "@/lib/constants";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-battle-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-battle-orange to-battle-orange-pressed shadow-lg">
              <span className="font-display text-sm leading-none text-white">
                B
              </span>
            </div>
            <span className="font-display text-lg uppercase tracking-wider text-white">
              {APP.name}
              <span className="ml-1 text-battle-orange">MAX</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body text-xs font-bold uppercase tracking-[2px] text-battle-text-secondary transition-colors hover:text-battle-orange"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              className="btn-primary text-xs"
            >
              Download
            </a>
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-battle-border md:hidden"
            aria-label="Menu"
          >
            <div className="flex flex-col gap-1.5">
              <span
                className={`block h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded bg-white transition-all duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </div>
          </button>
        </div>
      </div>

      {open && (
        <div className="glass border-b border-battle-border md:hidden">
          <nav className="flex flex-col gap-2 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 font-body text-sm font-bold uppercase tracking-wider text-battle-text-secondary transition-colors hover:bg-battle-surface-hover hover:text-battle-orange"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#download"
              onClick={() => setOpen(false)}
              className="btn-primary mt-2 text-xs"
            >
              Download Now
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
