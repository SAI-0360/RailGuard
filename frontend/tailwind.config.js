/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — solid elevation steps, no glass
        bg: "#0B0D12",
        surface: {
          1: "#12151C",
          2: "#181C25",
          3: "#1F2430",
        },
        line: "#232936",
        // Text
        ink: {
          DEFAULT: "#E7EBF1",
          2: "#9AA3B2",
          3: "#6A7383",
        },
        // Severity — reserved exclusively for status
        ok: "#3FB890",
        warn: "#E6A23C",
        crit: "#F0524F",
        // Interactive accent — selection, focus, agent identity. Never severity.
        accent: "#4CB8E8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
}
