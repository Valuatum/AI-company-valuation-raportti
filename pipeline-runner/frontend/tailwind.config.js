/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { neutral: { 850: "#1f1f23" } },
      spacing: { "4.5": "1.125rem" },
    },
  },
  plugins: [],
};
