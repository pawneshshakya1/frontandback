export const APP = {
  name: "BattleCore",
  tagline: "MAX",
  fullName: "BATTLECORE MAX",
  domain: "battlecore.app",
  description:
    "India's premier esports tournament platform. Compete in Free Fire, BGMI, and more. Create tournaments, win prizes, and join a community of champions.",
  packageName: "com.esports.battlecore",
  appStoreId: "battlecore-app",
  version: "v2.105.4.92",
  region: "INDIA",
} as const;

export const DOWNLOAD_LINKS = {
  android:
    "https://play.google.com/store/apps/details?id=com.esports.battlecore",
  ios: "https://apps.apple.com/app/battlecore/id",
  apk: "https://battlecore.app/download/battlecore.apk",
} as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Download", href: "#download" },
  { label: "About", href: "#about" },
] as const;

export const FEATURES = [
  {
    title: "Tournaments",
    description:
      "Join Free Fire, BGMI, and other esports tournaments. Compete against the best players in India and win real prizes.",
    icon: "🏆",
  },
  {
    title: "Create Events",
    description:
      "Host your own tournaments with flexible tier systems — Standard, Sponsored, or Premium. Set entry fees, prize pools, and rules.",
    icon: "🎮",
  },
  {
    title: "Elite Pass",
    description:
      "Unlock exclusive rewards with Battle Pass, Elite Pass, or Supreme Pass. Climb the ranks and earn premium benefits.",
    icon: "⚡",
  },
  {
    title: "Secure Wallet",
    description:
      "Integrated payment system with Cashfree. Safe deposits, withdrawals, and automated prize distribution for every match.",
    icon: "🛡️",
  },
  {
    title: "Partner Program",
    description:
      "Become a sponsored or premium partner. Grow your audience, earn platform fees, and get featured across the platform.",
    icon: "🤝",
  },
  {
    title: "Live Updates",
    description:
      "Real-time match notifications, live scores, and instant result declarations. Stay in the action at all times.",
    icon: "🔴",
  },
] as const;
