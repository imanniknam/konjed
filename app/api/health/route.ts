import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db/client";

export const dynamic = "force-dynamic";
/** Liveness + DB readiness for load balancers / uptime checks. */
export async function GET() {
  try { await db.execute(sql`select 1`); return NextResponse.json({ ok: true, db: "up", time: new Date().toISOString() }); }
  catch { return NextResponse.json({ ok: false, db: "down" }, { status: 503 }); }
}
