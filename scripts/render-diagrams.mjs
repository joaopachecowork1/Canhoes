// Renders docs/diagramas/*.mmd to PNG on a white background, so the diagrams read
// the same on GitHub, in VS Code (light or dark theme) and in any image viewer.
// Usage: npm run docs:diagrams [-- fluxo-votar.mmd ...]
// PUPPETEER_CONFIG points at a puppeteer config file when Chrome needs extra
// launch flags (for example --no-sandbox when running as root in a container).
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const MERMAID_CLI = "@mermaid-js/mermaid-cli@11.17.0";
const diagramsDir = path.join("docs", "diagramas");
const requested = process.argv.slice(2);

const sources = readdirSync(diagramsDir)
  .filter((file) => file.endsWith(".mmd"))
  .filter((file) => requested.length === 0 || requested.includes(file));

for (const source of sources) {
  const input = path.join(diagramsDir, source);
  const output = input.replace(/\.mmd$/, ".png");
  console.log(`${input} -> ${output}`);
  execFileSync(
    "npx",
    ["--yes", MERMAID_CLI, "--quiet", "-c", path.join(diagramsDir, "mermaid.config.json"),
      "-b", "white", "-s", "2", "-i", input, "-o", output,
      ...(process.env.PUPPETEER_CONFIG ? ["-p", process.env.PUPPETEER_CONFIG] : [])],
    { stdio: "inherit" },
  );
}
