import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

// Each folder in lib/domains is one feature. Its UI may use the shared `event` feature and
// another feature's pure `rules/`, never another feature's components or hooks.
const FEATURES = readdirSync("lib/domains", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const crossFeatureZones = FEATURES.flatMap((feature) =>
  FEATURES.filter((other) => other !== feature && other !== "event").map((other) => ({
    target: [`./lib/domains/${feature}/components/**`, `./lib/domains/${feature}/hooks/**`],
    from: [`./lib/domains/${other}/components/**`, `./lib/domains/${other}/hooks/**`],
    message: `Uma funcionalidade não importa a UI de outra (${other}). Move o que é partilhado para lib/domains/event ou para rules/.`,
  })),
);

const CLIENT_CODE = [
  "./components/**",
  "./hooks/**",
  "./lib/domains/*/components/**",
  "./lib/domains/*/hooks/**",
  "./lib/repositories/**",
];

// shortcut: the new rules are "warn" while the frontend refactor is in progress; turn each to
// "error" once its warnings reach zero.
const sonarRecommendedAsWarnings = Object.fromEntries(
  Object.entries(sonarjs.configs.recommended.rules).map(([rule, setting]) => [
    rule,
    setting === "off" || setting === 0 ? setting : "warn",
  ]),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { sonarjs },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // React Compiler diagnostics from eslint-plugin-react-hooks v7; this app is still on React 18.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",

      ...sonarRecommendedAsWarnings,
      "sonarjs/cognitive-complexity": ["warn", 15],
      // Duplicates `@typescript-eslint/no-unused-vars` and TODOs are tracked in Sonar anyway.
      "sonarjs/no-unused-vars": "off",
      "sonarjs/todo-tag": "off",

      "max-lines": ["warn", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 10],
      "max-depth": ["warn", 3],
      "max-params": ["warn", 3],

      "import/no-restricted-paths": [
        "warn",
        {
          zones: [
            {
              target: "./components/ui/**",
              from: ["./lib/domains/**", "./components/chrome/**", "./components/modules/**"],
              message: "components/ui só tem primitivas; não conhece domínios nem o shell.",
            },
            {
              target: CLIENT_CODE,
              from: "./lib/domains/*/services/**",
              message: "Código de cliente não importa serviços de servidor. Lógica pura partilhada vai para rules/.",
            },
            {
              target: "./lib/**",
              from: "./app/**",
              message: "lib/ não depende de app/.",
            },
            ...crossFeatureZones,
          ],
        },
      ],
    },
  },
  {
    // Visible UI text lives in messages/pt.json.
    files: ["app/canhoes/**/*.tsx", "components/**/*.tsx", "lib/domains/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["warn", { allowedStrings: ["·", "—", "–", "/", "×", "•", "…", "%", "+", "-", ":", "(", ")"] }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Local agent skills (git-ignored).
    ".agents/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
