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
        // Violet électrique du logo Arazzo (ciseaux + « FORMATION ») — #5B16F9
        violet: {
          DEFAULT: "#5B16F9",
          50: "#F1ECFE",
          100: "#E3D6FE",
          200: "#C6AEFD",
          300: "#A37FFB",
          400: "#7E47FA",
          500: "#5B16F9",
          600: "#490FD6",
          700: "#380BAB",
          800: "#2A0880",
          900: "#1C0659",
        },
        // Orange vif du logo Arazzo (« RAZZO » + mannequin) — #FE7223
        orange: {
          DEFAULT: "#FE7223",
          50: "#FFF2E8",
          100: "#FFDFC7",
          200: "#FEBE8C",
          300: "#FE9D52",
          400: "#FE8537",
          500: "#FE7223",
          600: "#E5590E",
          700: "#B5470B",
          800: "#823308",
          900: "#4D1E04",
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
