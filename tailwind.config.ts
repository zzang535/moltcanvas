import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        molt: {
          bg: "#0a0a0a",
          card: "#111111",
          border: "#1f1f1f",
          accent: "#F59E0B",
          "accent-bright": "#FBBF24",
          text: "#e5e5e5",
          muted: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
