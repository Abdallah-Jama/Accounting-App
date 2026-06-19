import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17221c",
        canvas: "#f4f6f1",
        brand: { 50: "#eef8f1", 100: "#d9efdf", 500: "#31915a", 600: "#26794a", 700: "#1f603c" },
      },
      boxShadow: { soft: "0 1px 2px rgba(19, 35, 26, .04), 0 10px 30px rgba(19, 35, 26, .06)" },
    },
  },
  plugins: [],
} satisfies Config;
