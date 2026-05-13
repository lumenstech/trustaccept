import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        border: "hsl(220 14% 16%)",
        input: "hsl(220 14% 16%)",
        ring: "hsl(217 91% 60%)",
        background: "hsl(222 47% 4%)",
        foreground: "hsl(210 40% 98%)",
        muted: {
          DEFAULT: "hsl(220 14% 10%)",
          foreground: "hsl(215 20% 65%)",
        },
        card: {
          DEFAULT: "hsl(222 47% 6%)",
          foreground: "hsl(210 40% 98%)",
        },
        primary: {
          DEFAULT: "hsl(217 91% 60%)",
          foreground: "hsl(210 40% 98%)",
        },
        accent: {
          DEFAULT: "hsl(263 70% 65%)",
          foreground: "hsl(210 40% 98%)",
        },
        amber: {
          DEFAULT: "hsl(38 92% 50%)",
          foreground: "hsl(38 92% 8%)",
        },
        success: {
          DEFAULT: "hsl(142 71% 45%)",
          foreground: "hsl(142 71% 8%)",
        },
        danger: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(0 84% 98%)",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
