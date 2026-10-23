import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Profiles, progress and ?tab= deep links live in the browser only; they
      // are read once after hydration so server and client render the same HTML.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "data/**", "next-env.d.ts"] },
];

export default config;
