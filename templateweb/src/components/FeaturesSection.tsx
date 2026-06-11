import { FEATURES } from "@/lib/constants";

export default function FeaturesSection() {
  return (
    <section id="features" className="relative px-4 py-24 sm:py-32">
      <div className="absolute inset-0 bg-hero-glow opacity-50 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <span className="font-body text-[10px] font-bold uppercase tracking-[4px] text-battle-orange">
            Features
          </span>
          <h2 className="section-heading mt-2">
            Built for <span className="text-gradient">Champions</span>
          </h2>
          <p className="section-subheading mx-auto">
            Everything you need to compete, create, and conquer in the Indian
            esports arena.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card rounded-xl p-6 transition-all duration-300 hover:border-battle-orange/30 hover:shadow-lg hover:shadow-battle-orange/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-battle-surface-hover text-2xl transition-colors group-hover:bg-battle-orange/10">
                {feature.icon}
              </div>
              <h3 className="font-body text-base font-bold uppercase tracking-wider text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-battle-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
