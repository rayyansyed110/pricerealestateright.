import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 700: "#1d3a6e", 800: "#163060", 900: "#0f2448", 950: "#0a1a36" },
        brand: { green: "#22c55e", gold: "#f5b83d", blue: "#2563eb" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
