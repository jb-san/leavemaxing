import formsPlugin from "@tailwindcss/forms";
import { type Config } from "tailwindcss";

export default {
  content: [
    "./routes/**/*.{jsx,tsx}",
    "./components/**/*.{jsx,tsx}",
    "./islands/**/*.{jsx,tsx}",
  ],
  plugins: [
    formsPlugin,
  ],
} satisfies Config;
