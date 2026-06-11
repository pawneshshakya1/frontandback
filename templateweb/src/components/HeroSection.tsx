import { APP, DOWNLOAD_LINKS } from "@/lib/constants";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-16">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="corner-decoration corner-tl" />
        <div className="corner-decoration corner-tr" />
        <div className="corner-decoration corner-bl" />
        <div className="corner-decoration corner-br" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-battle-border bg-battle-surface/50 px-4 py-1.5 mb-8">
          <span className="h-2 w-2 rounded-full bg-battle-success animate-pulse" />
          <span className="font-body text-[10px] font-bold uppercase tracking-[3px] text-battle-text-secondary">
            SERVER: {APP.region} —{" "}
            <span className="text-battle-success">LIVE</span>
          </span>
        </div>

        <h1 className="font-display text-5xl uppercase leading-tight tracking-wider text-white sm:text-6xl md:text-7xl lg:text-8xl">
          {APP.name}
          <br />
          <span className="text-gradient">{APP.tagline}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-battle-text-secondary sm:text-lg md:text-xl">
          {APP.description}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={DOWNLOAD_LINKS.android}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary min-w-[200px] text-xs"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 16.433l-8.81 5.086c-.763.44-1.722-.11-1.722-.99V9.47c0-.88.959-1.43 1.722-.99l8.81 5.086c.763.44.763 1.54 0 1.98zM2.733 21.19c-.21.12-.45.13-.66.02a.72.72 0 01-.36-.63V3.42c0-.26.14-.5.36-.63.21-.11.45-.1.66.02l10.06 6.16-1.73 3.18-2.63 4.93-8.7 8.1z" />
            </svg>
            Google Play
          </a>
          <a
            href={DOWNLOAD_LINKS.ios}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline min-w-[200px] text-xs"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            App Store
          </a>
        </div>

        <div className="mt-8">
          <span className="font-body text-[10px] font-bold uppercase tracking-[4px] text-battle-text-muted">
            {APP.version} • PROTECTED BY VANGUARD
          </span>
        </div>
      </div>
    </section>
  );
}
