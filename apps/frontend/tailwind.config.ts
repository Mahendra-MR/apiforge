import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary accent, matched to the logo's blue-violet. Green stays reserved for
        // semantic "success"/GET, so it's never confused with the app's own chrome.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f7f8fa",
          dark: "#121317",
          "dark-subtle": "#191b21",
          "dark-elevated": "#20232b",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 1px 0 rgb(15 23 42 / 0.03)",
        panel: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 8px 24px -8px rgb(15 23 42 / 0.10)",
        "panel-dark": "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 8px 24px -8px rgb(0 0 0 / 0.45)",
      },
    },
  },
  plugins: [],
} satisfies Config;
