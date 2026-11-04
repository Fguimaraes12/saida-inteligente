import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5180",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: [
    {
      command: "npm --prefix ../backend start",
      url: "http://localhost:3100/health",
      reuseExistingServer: false,
      env: {
        PORT: "3100",
        FRONTEND_ORIGIN: "http://localhost:5180",
        NODE_ENV: "test",
      },
    },
    {
      command: "npm run dev -- --port 5180 --strictPort",
      url: "http://localhost:5180",
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:3100" },
    },
  ],
});
