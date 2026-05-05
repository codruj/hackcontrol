/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "sans-serif"],
      },
      borderRadius: {
        "border-inherit": "inherit",
      },
      colors: {
        midnight: "rgb(var(--c-midnight) / <alpha-value>)",
        white: "rgb(var(--c-white) / <alpha-value>)",
        neutral: {
          50: "rgb(var(--c-neutral-50) / <alpha-value>)",
          100: "rgb(var(--c-neutral-100) / <alpha-value>)",
          200: "rgb(var(--c-neutral-200) / <alpha-value>)",
          300: "rgb(var(--c-neutral-300) / <alpha-value>)",
          400: "rgb(var(--c-neutral-400) / <alpha-value>)",
          500: "rgb(var(--c-neutral-500) / <alpha-value>)",
          600: "rgb(var(--c-neutral-600) / <alpha-value>)",
          700: "rgb(var(--c-neutral-700) / <alpha-value>)",
          800: "rgb(var(--c-neutral-800) / <alpha-value>)",
          900: "rgb(var(--c-neutral-900) / <alpha-value>)",
          950: "rgb(var(--c-neutral-950) / <alpha-value>)",
        },
      },
      keyframes: {
        overlayShow: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        contentShow: {
          from: { opacity: 0, transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        },
      },
      animation: {
        overlayShow: "overlayShow 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        contentShow: "contentShow 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
