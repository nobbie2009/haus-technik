import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
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
        server.middlewares.use("/version.json", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ version }));
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
