import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";
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
  "./lib/domains/*/components/**",
  "./lib/domains/*/hooks/**",
  "./lib/repositories/**",
];

/** Size, complexity and Sonar smells, at one severity. */
function qualityRules(severity) {
  return {
    ...Object.fromEntries(
      Object.entries(sonarjs.configs.recommended.rules).map(([rule, setting]) => [
        rule,
        setting === "off" || setting === 0 ? setting : severity,
      ]),
    ),
    "sonarjs/cognitive-complexity": [severity, 15],
    // Duplicates `@typescript-eslint/no-unused-vars`; TODOs are tracked in Sonar anyway.
    "sonarjs/no-unused-vars": "off",
    "sonarjs/todo-tag": "off",

    "max-lines": [severity, { max: 250, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": [severity, { max: 80, skipBlankLines: true, skipComments: true }],
    complexity: [severity, 10],
    "max-depth": [severity, 3],
    // Repositories and errors take (eventId, id, payload, …) positionally, like their URLs.
    "max-params": [severity, 4],
  };
}

// shortcut: server code (services, route handlers, scripts) was not refactored with the frontend,
// so its quality rules only warn; turn them to "error" once a server refactor clears them.
const SERVER_CODE = [
  "app/api/**",
  "lib/domains/*/services/**",
  "lib/api/guards.ts",
  "lib/api/route.ts",
  "lib/api/rateLimit.ts",
  "lib/storage/**",
  "prisma/**",
  "scripts/**",
  "tests/integration/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { sonarjs },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // React 19 rules from eslint-plugin-react-hooks v7: no setState inside effects (derive the
      // state instead) and no ref reads or writes during render.
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/incompatible-library": "error",

      ...qualityRules("error"),

      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./components/ui/**",
              from: ["./lib/domains/**", "./components/chrome/**"],
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
      "react/jsx-no-literals": ["error", { allowedStrings: ["·", "—", "–", "/", "×", "•", "…", "%", "+", "-", ":", "(", ")"] }],
    },
  },
  {
    files: SERVER_CODE,
    rules: qualityRules("warn"),
  },
  {
    // Shared logic says what it does in one JSDoc line: services, rules, hooks and lib helpers.
    files: [
      "lib/domains/*/services/**/*.ts",
      "lib/domains/*/rules/**/*.ts",
      "lib/domains/*/hooks/**/*.ts",
      "lib/*.ts",
      "lib/api/**/*.ts",
      "lib/storage/**/*.ts",
      "components/**/use*.ts",
    ],
    ignores: ["**/*.test.ts", "lib/api/types.ts"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: { FunctionDeclaration: true },
          // Exported `const x = () => …`, not the callbacks inside an exported object.
          contexts: ["ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression"],
          checkConstructors: false,
        },
      ],
    },
  },
  {
    // Declarations only: one DTO per API response; splitting it by size alone would not help.
    files: ["lib/api/types.ts"],
    rules: { "max-lines": "off" },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      // it.each tables pass one argument per column.
      "max-params": "off",
      // Tests talk to local fakes over plain http.
      "sonarjs/no-clear-text-protocols": "off",
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
    // Prisma client, generated by `prisma generate`.
    "lib/generated/**",
    // Local agent skills (git-ignored).
    ".agents/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
