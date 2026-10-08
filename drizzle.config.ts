import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://konjed@127.0.0.1:54329/konjed" },
});
