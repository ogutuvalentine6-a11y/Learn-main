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
        // --brand-* : one hue family, 9 steps. Reskin by editing this block only.
        brand: {
          50:  "#EEF4FF",  // Soft Academic Blue
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#7BA3E8",
          500: "#4F80E8",
          600: "#356AE6",  // Professional Blue — buttons, links, active state
          700: "#2C56C2",  // hover
          800: "#17365D",  // Deep Academic Navy — headings on light, dark panels
          900: "#0F2647",  // deepest navy
        },
        // --bg-* : page-level backgrounds. Use intent, not hex.
        bg: {
          DEFAULT:    "#F5F8FF",  // main app background
          dashboard:  "#EEF4FF",  // dashboard body
          workspace:  "#F8FAFF",  // learning workspace (course-view, video)
          important:  "#E5EEFF",  // callout / emphasis section
        },
        // --surface-* : card / panel / nav surfaces (always light in this theme)
        surface: { DEFAULT: "#FFFFFF", 2: "#F1F5F9" },
        // --footer : deep navy band
        footer: "#17365D",
        // --border
        border: "#E2E8F0",
        // --text-*
        fg: {
          DEFAULT: "#172B4D",
          muted:   "#64748B",
          subtle:  "#94A3B8",
        },
        // --status-*
        success: "#16A34A",
        warning: "#D97706",
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
