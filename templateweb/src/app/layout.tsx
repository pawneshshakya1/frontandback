import type { Metadata, Viewport } from "next";
import { Russo_One, Chakra_Petch, Fira_Sans } from "next/font/google";
import "./globals.css";

const russo = Russo_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-russo",
  display: "swap",
});

const chakra = Chakra_Petch({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra",
  display: "swap",
});

const firaSans = Fira_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fira-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020617",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://battlecore.app"),
  title: {
    default: "BattleCore MAX — India's Premier Esports Tournament Platform",
    template: "%s | BattleCore MAX",
  },
  description:
    "Compete in Free Fire, BGMI, and esports tournaments on BattleCore — India's top gaming platform. Create events, win prizes, join a community of champions.",
  keywords: [
    "battlecore",
    "esports",
    "gaming",
    "tournament",
    "free fire",
    "bgmi",
    "india gaming",
    "online tournament",
    "esports platform",
    "battle royale",
  ],
  authors: [{ name: "BattleCore" }],
  creator: "BattleCore",
  publisher: "BattleCore",
  applicationName: "BattleCore MAX",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "BattleCore MAX",
    title: "BattleCore MAX — India's Premier Esports Tournament Platform",
    description:
      "Compete in Free Fire, BGMI, and esports tournaments. Create events, win prizes, and join a community of champions.",
    url: "https://battlecore.app",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "BattleCore MAX - Esports Tournament Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BattleCore MAX — India's Premier Esports Tournament Platform",
    description:
      "Compete in Free Fire, BGMI, and esports tournaments. Create events, win prizes, and join a community of champions.",
    images: ["/images/og-image.png"],
    creator: "@battlecore",
  },
  alternates: {
    canonical: "https://battlecore.app",
  },
  category: "gaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${russo.variable} ${chakra.variable} ${firaSans.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        <meta name="theme-color" content="#020617" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MobileApplication",
              name: "BattleCore MAX",
              applicationCategory: "GameApplication",
              operatingSystem: ["Android", "iOS"],
              description:
                "India's premier esports tournament platform. Compete in Free Fire, BGMI, and more.",
              url: "https://battlecore.app",
              image: "https://battlecore.app/images/og-image.png",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "INR",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.5",
                bestRating: "5",
                ratingCount: "10000",
              },
              author: {
                "@type": "Organization",
                name: "BattleCore",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BattleCore",
              url: "https://battlecore.app",
              logo: "https://battlecore.app/favicon.ico",
              description:
                "India's premier esports tournament platform for Free Fire, BGMI, and more.",
              foundingDate: "2024",
              location: { "@type": "Place", address: { "@type": "PostalAddress", addressCountry: "IN" } },
            }),
          }}
        />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
