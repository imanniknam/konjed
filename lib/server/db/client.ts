import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assertProductionEnv } from "../env";
import * as schema from "./schema";

if (process.env.NEXT_PHASE !== "phase-production-build") assertProductionEnv();

/** One pool per server process (survives Next.js dev hot reloads). */
const g = globalThis as unknown as { __konjedPool?: Pool };
const pool = g.__konjedPool ?? new Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://konjed@127.0.0.1:54329/konjed", max: 10 });
if (process.env.NODE_ENV !== "production") g.__konjedPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
