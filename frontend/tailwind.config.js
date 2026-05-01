/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fb: {
          bg: "#f0f2f5",
          surface: "#ffffff",
          border: "#dddfe2",
          text: "#1c1e21",
          subtle: "#65676b",
          accent: "#1877f2",
          accentHover: "#166fe5",
          success: "#42b72a",
          danger: "#e41e3f",
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

