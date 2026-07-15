import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5e6ad2",
          hover: "#828fff",
          focus: "#5e69d1",
        },
        canvas: "#010102",
        surface: {
          1: "#0f1011",
          2: "#141516",
          3: "#18191a",
        },
        ink: {
          DEFAULT: "#f7f8f8",
          muted: "#d0d6e0",
          subtle: "#8a8f98",
        },
        hairline: {
          DEFAULT: "#23252a",
          strong: "#34343a",
        },
        semantic: {
          success: "#27a644",
          warning: "#f2994a",
          danger: "#eb5757",
        },
        priority: {
          critical: "#eb5757",
          high: "#f2994a",
          medium: "#f2c94c",
          low: "#9ca3af",
        },
        status: {
          open: "#3b82f6",
          "in-progress": "#8b5cf6",
          pending: "#f2994a",
          resolved: "#27ae60",
          closed: "#6b7280",
          cancelled: "#9ca3af",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        base: "14px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
