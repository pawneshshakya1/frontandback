import { APP, DOWNLOAD_LINKS } from "@/lib/constants";

function StoreButton({
  href,
  icon,
  label,
  sublabel,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-gradient-to-br from-battle-orange to-battle-orange-pressed text-white shadow-lg shadow-battle-orange/20 hover:shadow-battle-orange/40"
    : "glass-card text-white hover:border-battle-orange/30 hover:shadow-lg hover:shadow-battle-orange/5";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex w-full max-w-xs items-center gap-4 rounded-xl px-6 py-4 transition-all duration-300 ${cls}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="text-left">
        <div className="font-body text-[10px] font-bold uppercase tracking-[3px] text-battle-text-secondary group-hover:text-white">
          {sublabel}
        </div>
        <div className="font-body text-base font-bold tracking-wider text-white">
          {label}
        </div>
      </div>
    </a>
  );
}

export default function DownloadSection() {
  return (
    <section id="download" className="relative px-4 py-24 sm:py-32">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <span className="font-body text-[10px] font-bold uppercase tracking-[4px] text-battle-orange">
          Download
        </span>
        <h2 className="section-heading mt-2">
          Get <span className="text-gradient">BattleCore</span> Now
        </h2>
        <p className="section-subheading mx-auto">
          Available on Android and iOS. Join thousands of players competing in
          India&apos;s fastest-growing esports platform.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <StoreButton
            href={DOWNLOAD_LINKS.android}
            primary
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 16.433l-8.81 5.086c-.763.44-1.722-.11-1.722-.99V9.47c0-.88.959-1.43 1.722-.99l8.81 5.086c.763.44.763 1.54 0 1.98zM2.733 21.19c-.21.12-.45.13-.66.02a.72.72 0 01-.36-.63V3.42c0-.26.14-.5.36-.63.21-.11.45-.1.66.02l10.06 6.16-1.73 3.18-2.63 4.93-8.7 8.1z" />
              </svg>
            }
            label="Google Play"
            sublabel="Android"
          />
          <StoreButton
            href={DOWNLOAD_LINKS.ios}
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            }
            label="App Store"
            sublabel="iOS"
          />
        </div>

        <div className="mt-12 glass-card mx-auto inline-block rounded-xl px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-battle-surface-hover">
              <span className="font-display text-sm text-battle-orange">B</span>
            </div>
            <div className="text-left">
              <div className="font-display text-sm uppercase tracking-wider text-white">
                {APP.name} {APP.tagline}
              </div>
              <div className="font-body text-[10px] font-bold uppercase tracking-[2px] text-battle-text-muted">
                {APP.version}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
