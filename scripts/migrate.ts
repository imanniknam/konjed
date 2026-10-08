import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../lib/server/db/client";

migrate(db, { migrationsFolder: "./drizzle" }).then(() => { console.log("migrated"); process.exit(0); }, (e) => { console.error(e); process.exit(1); });
