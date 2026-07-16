/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f3ea",
        ink: "#13232f",
        accent: "#ec6f36",
        pine: "#275245",
        gold: "#f2c66d",
        mist: "#e8ddd0",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(19, 35, 47, 0.12)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

