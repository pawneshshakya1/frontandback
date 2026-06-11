import { APP, DOWNLOAD_LINKS } from "@/lib/constants";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-battle-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <a href="#" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-battle-orange to-battle-orange-pressed">
                <span className="font-display text-xs leading-none text-white">
                  B
                </span>
              </div>
              <span className="font-display text-base uppercase tracking-wider text-white">
                {APP.name}{" "}
                <span className="text-battle-orange">{APP.tagline}</span>
              </span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-battle-text-secondary">
              India&apos;s premier esports tournament platform. Compete, create,
              and conquer.
            </p>
          </div>

          <div>
            <h4 className="font-body text-xs font-bold uppercase tracking-[3px] text-battle-orange">
              Quick Links
            </h4>
            <nav className="mt-4 flex flex-col gap-3">
              {["Features", "Download", "About"].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="font-body text-xs font-bold uppercase tracking-[2px] text-battle-text-secondary transition-colors hover:text-battle-orange"
                >
                  {link}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="font-body text-xs font-bold uppercase tracking-[3px] text-battle-orange">
              Download
            </h4>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={DOWNLOAD_LINKS.android}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs font-bold uppercase tracking-[2px] text-battle-text-secondary transition-colors hover:text-battle-orange"
              >
                Android (Google Play)
              </a>
              <a
                href={DOWNLOAD_LINKS.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs font-bold uppercase tracking-[2px] text-battle-text-secondary transition-colors hover:text-battle-orange"
              >
                iOS (App Store)
              </a>
              <a
                href={DOWNLOAD_LINKS.apk}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs font-bold uppercase tracking-[2px] text-battle-text-secondary transition-colors hover:text-battle-orange"
              >
                Direct APK
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-battle-border pt-8 text-center">
          <p className="font-body text-[10px] font-bold uppercase tracking-[3px] text-battle-text-muted">
            &copy; {year} {APP.name}. All rights reserved. • PROTECTED BY
            VANGUARD
          </p>
        </div>
      </div>
    </footer>
  );
}
