import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ipad",
  outputDir: "./test-results/ipad",
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices["iPad (gen 7)"],
    browserName: "webkit",
    baseURL: process.env.IPAD_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:5173", reuseExistingServer: true },
});
