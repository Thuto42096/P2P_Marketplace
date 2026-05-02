/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fb: {
          bg: "#faf7ff",
          surface: "#ffffff",
          border: "#ede9fe",
          text: "#1f2937",
          subtle: "#6b7280",
          accent: "#7c3aed",
          accentHover: "#6d28d9",
          success: "#16a34a",
          successHover: "#15803d",
          danger: "#dc2626",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.1)",
        cardHover: "0 4px 12px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};

