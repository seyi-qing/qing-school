import type { Config } from "tailwindcss";

// Design tokens for Kayvlop Magnificent School (KMS)
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1a3a6e",
          light: "#2a4f8f",
          dark: "#0f2748",
        },
        gold: {
          DEFAULT: "#c9a227",
          light: "#d4b876",
          dark: "#8f701f",
        },
        paper: "#F7F5EF",
        ink: "#1C2230",
        sage: "#4F6B58",
        brick: "#c41e3a",
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
