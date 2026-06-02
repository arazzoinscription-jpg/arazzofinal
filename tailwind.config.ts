import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: "#4B3BC7",
          50: "#EEEDFB",
          100: "#D5D2F6",
          200: "#AAA5EE",
          300: "#7F78E5",
          400: "#5F55D6",
          500: "#4B3BC7",
          600: "#3A2DAA",
          700: "#2B2180",
          800: "#1D1657",
          900: "#0E0B2E",
        },
        orange: {
          DEFAULT: "#E07840",
          50: "#FDF3EC",
          100: "#FAE3D0",
          200: "#F5C3A0",
          300: "#EFA270",
          400: "#E78C58",
          500: "#E07840",
          600: "#C85E25",
          700: "#9A471C",
          800: "#6D3213",
          900: "#40200C",
        },
        cream: {
          DEFAULT: "#F5F0EB",
          50: "#FDFCFB",
          100: "#F5F0EB",
          200: "#E8DED4",
          300: "#D6C9BA",
        },
        blush: {
          DEFAULT: "#E9B8CD",
          50: "#FCF5F8",
          100: "#F9E9F0",
          200: "#F2D2E0",
          300: "#E9B8CD",
          400: "#DD93B2",
          500: "#C96FA0",
        },
        gold: {
          DEFAULT: "#CBA36B",
          100: "#F1E6D2",
          200: "#E3CCA8",
          300: "#CBA36B",
        },
      },
      fontFamily: {
        playfair: ["Playfair Display", "serif"],
        dm: ["DM Sans", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
