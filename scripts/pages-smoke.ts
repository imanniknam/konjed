/** Renders every page as the right user and fails on non-200 / error overlays. Needs `npm run db:seed:demo` + a running server. */
import { sql } from "drizzle-orm";
import { db } from "../lib/server/db/client";
const BASE = process.env.BASE ?? "http://localhost:3000";
let fails = 0;

async function login(identifier: string) {
  const res = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ identifier, password: "demo12345" }) });
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
}
async function check(path: string, cookie = "", expect: string[] = []) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  const html = await res.text();
  const bad = res.status !== 200 || /Runtime Error|Application error|digest="/.test(html) || expect.some((e) => !html.includes(e));
  console.log(`${bad ? "✗" : "✓"} ${res.status} ${path}${bad && res.status === 200 ? "  (content check failed)" : ""}`);
  if (bad) fails++;
}

async function main() {
  const pub = ["/", "/games", "/games/skills", "/games/popular", "/games/publish", "/games/money", "/courses", "/showcase", "/showcase/gallery", "/showcase/achievements", "/showcase/challenges", "/about", "/about/story", "/about/method", "/about/partnership", "/about/contact", "/login", "/signup"];
  const nf = await fetch(BASE + "/some/unknown/path"); console.log(`${nf.status === 404 ? "✓" : "✗"} ${nf.status} unknown path is a real 404`); if (nf.status !== 404) fails++;
  for (const p of pub) await check(p, "", p === "/games" ? ["مدیریت پول", "دنبال چه بازی‌ای می‌گردی؟"] : p === "/courses" ? ["مهارت‌های خلاقیت و حل مسئله", "ثبت‌نام در دوره"] : p === "/showcase/gallery" ? ["یک هفته بدون خرید اضافه"] : []);
  const st = await login("student@demo.konjed"), co = await login("coach@demo.konjed"), pa = await login("parent@demo.konjed"), ad = await login("admin@demo.konjed");
  const [m] = (await db.execute(sql`select id from missions where title = 'مسئله‌ات رو بشناس'`)).rows as { id: string }[];
  const [c] = (await db.execute(sql`select id from classes where name like 'کلاس خلاقیت%'`)).rows as { id: string }[];
  for (const s of ["dashboard", "missions", `missions/${m.id}`, "arcade", "toolbox", "projects", "ranking", "notifications", "settings"]) await check(`/panel/student/${s}`, st);
  for (const s of ["dashboard", "classes", `classes/${c.id}`, "attendance", `attendance/${c.id}`, "evaluations", "challenges", "reports", `reports/${c.id}`, "notifications", "settings"]) await check(`/panel/coach/${s}`, co);
  for (const s of ["dashboard", "skills", "projects", "reports", "notifications", "settings"]) await check(`/panel/parent/${s}`, pa);
  await check("/panel/admin", ad, ["مربی‌های منتظر تأیید"]);
  await check("/panel/admin/inbox", ad, ["درخواست‌های انتشار بازی"]);
  for (const s of ["content", "content/edit?key=home", "content/edit?key=chrome", "content/edit?key=page%3Agames", "courses", "missions", "games", "badges", "challenges", "toolbox", "projects", "comments", "classes", "users", "audit", "settings", "notifications"]) await check(`/panel/admin/${s}`, ad);
  await check("/showcase/achievements", st, ["خلاصه دستاوردهای من"]);
  // access control on pages
  for (const [path, cookie] of [["/panel/coach/dashboard", st], ["/panel/student/dashboard", ""], ["/panel/admin", st]] as const) {
    const r = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
    const ok = r.status >= 300 && r.status < 400;
    console.log(`${ok ? "✓" : "✗"} redirect ${r.status} ${path} (${cookie ? "wrong role" : "anonymous"})`);
    if (!ok) fails++;
  }
  console.log(fails ? `\n${fails} FAILED` : "\nall pages ok");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
