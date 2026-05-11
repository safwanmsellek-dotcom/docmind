import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-instrument)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-serif)", "serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0C0C0E",
          2: "#13131A",
          3: "#1A1A24",
          4: "#22222F",
        },
        border: {
          DEFAULT: "#2A2A38",
          2: "#353548",
        },
        accent: {
          DEFAULT: "#7C6BF5",
          2: "#9D8FFF",
          3: "#C4BCFF",
        },
        docmind: {
          teal: "#2DD4BF",
          amber: "#F59E0B",
          coral: "#F87171",
          green: "#4ADE80",
        },
      },
      animation: {
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "processing": "processing 1.5s infinite",
        "pulse-dot": "pulseDot 1.4s infinite",
      },
      keyframes: {
        slideIn: { from: { transform: "translateX(-8px)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        processing: { "0%": { left: "-100%" }, "100%": { left: "100%" } },
        pulseDot: { "0%,80%,100%": { opacity: "0.3", transform: "scale(0.8)" }, "40%": { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};

export default config;
