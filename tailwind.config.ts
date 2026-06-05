import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Violet du logo Arazzo (scissors + « Patronnage »)
        violet: {
          DEFAULT: "#6D28D9",
          50: "#F4EEFD",
          100: "#E6D8FB",
          200: "#CDB1F7",
          300: "#B088F1",
          400: "#8F5BEA",
          500: "#6D28D9",
          600: "#5B21B6",
          700: "#491A92",
          800: "#37146E",
          900: "#260D4B",
        },
        // Orange du logo Arazzo (« RAZZO »)
        orange: {
          DEFAULT: "#F4801F",
          50: "#FEF3E8",
          100: "#FCE0C5",
          200: "#F9C088",
          300: "#F7A24E",
          400: "#F58E30",
          500: "#F4801F",
          600: "#D9620E",
          700: "#A8490B",
          800: "#723109",
          900: "#421C05",
        },
        cream: {
          DEFAULT: "#F5F0EB",
          50: "#FDFCFB",
          100: "#F5F0EB",
          200: "#E8DED4",
          300: "#D6C9BA",
        },
        // Teal/pétrole — accent principal du dashboard (inspiré du site de référence)
        teal: {
          DEFAULT: "#247390",
          50: "#EAF2F5",
          100: "#CFE1E8",
          200: "#9FC3D1",
          300: "#6FA5BA",
          400: "#3F87A3",
          500: "#247390",
          600: "#1D5C73",
          700: "#164556",
          800: "#0E3340",
          900: "#082531",
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
