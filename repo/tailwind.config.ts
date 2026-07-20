import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Arus Inovasi brand palette
        arus: {
          amber: "#FDB813",
          amberDark: "#E5A209",
          orange: "#F26522",
          purple: "#3B1053",
          purpleMid: "#4E1A6B",
          purpleLight: "#6B2E8F",
        },
      },
    },
  },
  plugins: [],
};
export default config;
