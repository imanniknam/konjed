import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE ?? "http://localhost:3000", locale: "fa-IR", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { extraHTTPHeaders: { "x-forwarded-for": "10.0.0.1" }, ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "laptop", use: { extraHTTPHeaders: { "x-forwarded-for": "10.0.0.2" }, ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "mobile", use: { extraHTTPHeaders: { "x-forwarded-for": "10.0.0.3" }, ...devices["Pixel 7"] } },
    { name: "mobile-320", use: { extraHTTPHeaders: { "x-forwarded-for": "10.0.0.4" }, ...devices["Pixel 7"], viewport: { width: 320, height: 640 } } },
  ],
  webServer: process.env.BASE ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
