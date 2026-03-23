import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          text: "hsl(var(--sidebar-text))",
          hover: "hsl(var(--sidebar-hover))",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
