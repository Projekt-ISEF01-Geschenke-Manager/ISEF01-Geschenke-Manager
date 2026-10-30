import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" wirft absichtlich, sobald es importiert wird - Next.js
    // loest das ueber die "react-server"-Export-Condition auf ein leeres
    // Modul auf (Server-Bundle), Vitest kennt diese Condition nicht und
    // wuerde sonst jeden Test crashen lassen, der transitiv ein Modul mit
    // "server-only" laedt (z. B. ueber eine Server Action, die von einer
    // Client-Komponente importiert wird).
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
});
