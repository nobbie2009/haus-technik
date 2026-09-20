import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"))
  .version as string;

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    {
      name: "app-version",
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version }) });
      },
      configureServer(server) {
        const packagePath = fileURLToPath(new URL("./package.json", import.meta.url));
        server.watcher.add(packagePath);
        server.watcher.on("change", (file) => {
          if (normalizePath(file) === normalizePath(packagePath)) void server.restart();
        });
        server.middlewares.use("/version.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version }));
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
