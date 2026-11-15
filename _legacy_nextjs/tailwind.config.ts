import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./emails/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#14213D",
          900: "#0B1733",
        },
        bg: "#F8FAFC",
        surface: { DEFAULT: "#FFFFFF", 2: "#F1F5F9" },
        border: "#E2E8F0",
        fg: {
          DEFAULT: "#172033",
          muted:   "#64748B",
          subtle:  "#94A3B8",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        error:   "#DC2626",
        info:    "#0891B2",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
        sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.25rem", full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        sm:  "0 1px 2px rgb(15 23 42 / 0.05)",
        md:  "0 4px 12px rgb(15 23 42 / 0.08), 0 2px 4px rgb(15 23 42 / 0.04)",
        lg:  "0 12px 24px rgb(15 23 42 / 0.10), 0 4px 8px rgb(15 23 42 / 0.05)",
      },
      keyframes: {
        "fade-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to:   { transform: "translateY(0)",   opacity: "1" },
        },
      },
      animation: {
        "fade-in":  "fade-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "slide-up": "slide-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
