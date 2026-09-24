import type { Config } from "tailwindcss";

// Design tokens for Force Schools ERP.
// Palette is deliberately "academic ledger" (navy + aged gold on warm paper)
// rather than the generic SaaS terracotta/cream or dark+neon defaults.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#132A46",
          light: "#1D3A5F",
          dark: "#0C1C30",
        },
        gold: {
          DEFAULT: "#B8923F",
          light: "#D4B876",
          dark: "#8F701F",
        },
        paper: "#F7F5EF",
        ink: "#1C2230",
        sage: "#4F6B58",
        brick: "#9C4438",
        line: "#DEDACD",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
