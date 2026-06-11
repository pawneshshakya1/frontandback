import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        battle: {
          orange: "#f47b25",
          "orange-hover": "#fb923c",
          "orange-pressed": "#ea580c",
          dark: "#020617",
          surface: "#0F172A",
          "surface-hover": "#1E293B",
          text: "#F8FAFC",
          "text-secondary": "#94A3B8",
          "text-muted": "#64748B",
          gold: "#fbbf24",
          blue: "#3b82f6",
          border: "#1E293B",
          success: "#22c55e",
          error: "#ef4444",
        },
      },
      fontFamily: {
        display: ["var(--font-russo)"],
        body: ["var(--font-chakra)"],
        description: ["var(--font-fira-sans)"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse at center, rgba(244,123,37,0.15) 0%, transparent 70%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95))",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
