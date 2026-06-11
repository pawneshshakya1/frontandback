import { APP } from "@/lib/constants";

export default function AboutSection() {
  return (
    <section id="about" className="relative px-4 py-24 sm:py-32">
      <div className="absolute inset-0 bg-hero-glow opacity-30 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="text-center">
          <span className="font-body text-[10px] font-bold uppercase tracking-[4px] text-battle-orange">
            About
          </span>
          <h2 className="section-heading mt-2">
            Why <span className="text-gradient">BattleCore</span>?
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="glass-card rounded-xl p-8">
            <h3 className="font-display text-xl uppercase tracking-wider text-white">
              For Players
            </h3>
            <ul className="mt-6 space-y-4">
              {[
                "Join Free Fire, BGMI, and multi-game tournaments",
                "Real-time match updates and live scoreboards",
                "Secure wallet with instant prize payouts",
                "Elite Pass system with exclusive rewards",
                "Compete against India's best players",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-battle-orange" />
                  <span className="text-sm text-battle-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-xl p-8">
            <h3 className="font-display text-xl uppercase tracking-wider text-white">
              For Hosts
            </h3>
            <ul className="mt-6 space-y-4">
              {[
                "Create Standard, Sponsored, or Premium events",
                "Flexible entry fees and prize pool management",
                "Partner program with platform fee earnings",
                "Dedicated tier system with increasing benefits",
                "Grow your audience and build your brand",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-battle-gold" />
                  <span className="text-sm text-battle-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="glass-card inline-block rounded-xl px-8 py-4">
            <span className="font-body text-[10px] font-bold uppercase tracking-[4px] text-battle-text-muted">
              {APP.version} • PROTECTED BY VANGUARD • SERVER: {APP.region}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
