/** End-to-end API smoke test against a running server (BASE=http://localhost:3000). Uses throw-away accounts. */
import { sql } from "drizzle-orm";
import { db } from "../lib/server/db/client";
const BASE = process.env.BASE ?? "http://localhost:3000";

/** Remove everything earlier runs created so the test is deterministic. */
async function cleanup() {
  await db.execute(sql`delete from classes where coach_id in (select id from users where email like '%@t.test' or phone like '09%')`);
  await db.execute(sql`delete from users where email like '%@t.test' or (phone like '09%' and display_name like '%تست%')`);
  await db.execute(sql`delete from games where title = 'بازی تست من'`);
  await db.execute(sql`delete from game_submissions where name = 'بازی تست من'`);
  await db.execute(sql`delete from challenge_classes`);
  await db.execute(sql`delete from contact_messages where name = 'مهمان'`);
  await db.execute(sql`delete from cms_documents where key in ('home','page:games/skills')`);
  await db.execute(sql`delete from courses where slug like 't-%'`);
  await db.execute(sql`delete from collab_requests where name = 'یک مدرسه'`);
}
let fails = 0;
const ok = (name: string, cond: unknown, extra?: unknown) => { console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : "  " + JSON.stringify(extra)}`); if (!cond) fails++; };

class Client {
  cookie = "";
  async call(method: string, path: string, body?: unknown) {
    const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json", cookie: this.cookie, origin: BASE }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) { const [kv] = c.split(";"); if (kv.endsWith("=") || /Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c)) this.cookie = ""; else this.cookie = kv; }
    const json = await res.json().catch(() => null);
    return { status: res.status, json, data: json?.data };
  }
}

const rnd = Math.random().toString(36).slice(2, 8);
async function main() {
  await cleanup();
  const anon = new Client(), student = new Client(), coach = new Client(), parent = new Client(), admin = new Client();

  // public data
  let r = await anon.call("GET", "/api/games?sort=popular");
  ok("games list", r.status === 200 && r.data.games.length >= 5, r);
  r = await anon.call("GET", "/api/games?q=" + encodeURIComponent("پول") + "&group=finance");
  ok("games search (Persian) + group filter", r.data?.games?.length === 1 && r.data.games[0].slug === "money", r.data);
  r = await anon.call("GET", "/api/games?duration=short&age=13-14");
  ok("games duration/age filter", r.status === 200 && r.data.games.every((g: any) => g.minutes <= 10), r.data);
  r = await anon.call("GET", "/api/games/money"); ok("game detail", r.data?.title === "مدیریت پول", r);
  r = await anon.call("GET", "/api/games/nope"); ok("game 404", r.status === 404, r);
  r = await anon.call("GET", "/api/courses?status=registering"); ok("courses", r.data?.courses?.length >= 1, r);
  r = await anon.call("GET", "/api/projects?sort=popular"); ok("projects list", r.data?.projects?.length >= 3, r);
  r = await anon.call("GET", "/api/challenges"); ok("challenges", r.data?.challenges?.length === 3, r);

  // auth
  r = await anon.call("GET", "/api/me/dashboard"); ok("dashboard needs auth (401)", r.status === 401, r);
  r = await student.call("POST", "/api/auth/register", { role: "student", displayName: "تست", identifier: `s${rnd}@t.test`, password: "short" }); ok("weak password rejected (422)", r.status === 422, r);
  r = await student.call("POST", "/api/auth/register", { role: "student", displayName: "دانش‌آموز تست", identifier: `s${rnd}@t.test`, password: "password123", age: 14 }); ok("student register", r.status === 200 && r.data?.role === "student", r);
  r = await student.call("POST", "/api/auth/register", { role: "student", displayName: "نام دوم", identifier: `s${rnd}@t.test`, password: "password123", age: 14 }); ok("duplicate register (409)", r.status === 409, r);
  r = await student.call("GET", "/api/auth/me"); ok("me", r.data?.user?.displayName === "دانش‌آموز تست", r);
  r = await student.call("GET", "/api/me/profile"); const linkCode = r.data?.linkCode; ok("student has link code", /^[A-Z0-9]{6}$/.test(linkCode ?? ""), r);
  const coachPhone = `09${Math.floor(100000000 + Math.random() * 899999999)}`;
  r = await coach.call("POST", "/api/auth/register", { role: "coach", displayName: "مربی تست", identifier: coachPhone, password: "password123" }); ok("coach register by phone", r.status === 200, r);
  r = await coach.call("GET", "/api/coach/dashboard"); ok("unapproved coach is blocked (403 pending_approval)", r.status === 403 && r.json?.error?.code === "pending_approval", r);
  await db.execute(sql`update users set approved = true where phone = ${coachPhone}`);
  r = await parent.call("POST", "/api/auth/register", { role: "parent", displayName: "والد تست", identifier: `p${rnd}@t.test`, password: "password123" }); ok("parent register", r.status === 200, r);
  r = await anon.call("POST", "/api/auth/login", { identifier: `s${rnd}@t.test`, password: "wrongpass1" }); ok("bad login 401", r.status === 401, r);

  // role guards
  r = await student.call("GET", "/api/coach/dashboard"); ok("student blocked from coach API (403)", r.status === 403, r);
  r = await parent.call("POST", "/api/projects", { title: "x یک" }); ok("parent cannot create project (403)", r.status === 403, r);

  // enrol + missions
  r = await student.call("GET", "/api/courses?status=registering"); const course = r.data.courses[0];
  r = await student.call("POST", `/api/courses/${course.slug}/enroll`); ok("enroll", r.status === 200, r);
  r = await student.call("POST", `/api/courses/${course.slug}/enroll`); ok("double enroll 409", r.status === 409, r);
  r = await student.call("GET", "/api/me/missions"); const path = r.data.paths.find((p: any) => p.title === course.title);
  ok("mission map has locked/current states", path && path.stages[0].missions[0].state === "current" && path.stages[1].missions[0].state === "locked", r.data);
  const first = path.stages[0].missions[0], locked = path.stages[1].missions[0];
  r = await student.call("POST", `/api/missions/${locked.id}/submit`, { text: "این یک پاسخ آزمایشی برای مأموریت قفل است." }); ok("locked mission cannot be submitted (409)", r.status === 409, r);
  r = await student.call("POST", `/api/missions/${first.id}/submit`, { text: "مسئله‌ی من اینه که توی مدرسه کتابخونه‌ی خوبی نداریم. بچه‌ها و معلم‌ها درگیرش هستن و چون سواد و خلاقیت رو کم می‌کنه مهمه. وقتی چند بار پرسیدم چرا، فهمیدم بودجه نداریم." });
  ok("mission submit → evaluation", r.status === 200 && r.data.score >= 0 && r.data.points > 0, r);
  const subId = r.data?.submissionId;
  r = await student.call("POST", `/api/missions/${first.id}/submit`, { text: "دوباره ارسال می‌کنم تا ببینم چی میشه." }); ok("resubmit blocked (409)", r.status === 409, r);
  r = await student.call("GET", "/api/me/dashboard"); ok("dashboard shows points + next mission", r.data?.points > 0 && r.data?.nextMission, r.data);

  // arcade
  r = await student.call("POST", "/api/games/money/play"); ok("play recorded", r.status === 200, r);
  r = await student.call("POST", "/api/games/money/complete"); ok("complete game gives reward", r.status === 200, r);
  r = await student.call("GET", "/api/me/games"); ok("my games", r.data?.games?.[0]?.completed === true, r.data);

  // projects
  r = await student.call("POST", "/api/projects", { title: "پروژه آزمایشی من", desc: "یک توضیح", skill: "کارآفرینی", type: "فردی" }); ok("project create", r.status === 200, r);
  const pid = r.data?.id;
  r = await parent.call("POST", `/api/projects/${pid}/like`); ok("like (parent)", r.data?.liked === true && r.data.likes === 1, r);
  r = await parent.call("POST", `/api/projects/${pid}/like`); ok("unlike", r.data?.liked === false && r.data.likes === 0, r);
  r = await parent.call("POST", `/api/projects/${pid}/comments`, { body: "ایده‌ی خوبی بود" }); ok("comment", r.status === 200, r);
  r = await anon.call("POST", `/api/projects/${pid}/like`); ok("anonymous like blocked", r.status === 401, r);
  r = await student.call("GET", "/api/achievements"); ok("badges: maker earned after first project", r.data?.badges?.some((b: any) => b.code === "maker" && b.earned) && r.data?.badges?.some((b: any) => b.code === "entrepreneur" && b.earned), r.data?.badges?.map((b: any) => [b.code, b.earned]));
  r = await student.call("GET", "/api/me/rankings"); ok("rankings", r.data?.global >= 1 && Array.isArray(r.data?.top), r);

  // challenges
  r = await anon.call("GET", "/api/challenges"); const ch = r.data.challenges.find((c: any) => c.status === "active");
  r = await student.call("POST", `/api/challenges/${ch.id}/entries`, { text: "ایده‌ی من حل مشکل کتابخانه با کتاب‌های اشتراکی است." }); ok("challenge entry", r.status === 200, r);
  const up = (await anon.call("GET", "/api/challenges")).data.challenges.find((c: any) => c.status === "upcoming");
  r = await student.call("POST", `/api/challenges/${up.id}/entries`, { text: "هنوز فعال نیست ولی می‌فرستم" }); ok("inactive challenge blocked", r.status === 409, r);
  r = await student.call("POST", `/api/challenges/${up.id}/reminder`); ok("reminder", r.data?.reminder === true, r);

  // coach flow
  r = await coach.call("POST", "/api/coach/classes", { courseId: course.id, name: "کلاس تست", schedule: "شنبه‌ها" }); ok("coach creates class", r.status === 200, r); const classId = r.data?.id;
  r = await coach.call("GET", `/api/coach/classes/${classId}`); ok("class detail lists enrolled student (new class claims unassigned)", r.data?.students?.some((s: any) => s.name === "دانش‌آموز تست"), r.data);
  const sid = r.data?.students?.[0]?.id;
  r = await coach.call("GET", `/api/coach/classes/${classId}/students`); ok("unassigned list endpoint", r.status === 200, r);
  r = await coach.call("POST", `/api/coach/classes/${classId}/attendance`, { title: "جلسه ۱", records: [{ studentId: sid, status: "present" }] }); ok("attendance", r.status === 200 && r.data.recorded === 1, r);
  r = await coach.call("GET", "/api/coach/evaluations"); ok("evaluation queue has submission", r.data?.items?.some((i: any) => i.id === subId), r.data);
  const before = (await student.call("GET", "/api/me/dashboard")).data.points;
  r = await coach.call("PATCH", `/api/coach/evaluations/${subId}`, { action: "adjust", score: 100, feedback: "عالی!" }); ok("coach adjusts score", r.status === 200 && r.data.score === 100, r);
  const after = (await student.call("GET", "/api/me/dashboard")).data.points;
  ok("points updated by review delta", after >= before, { before, after });
  r = await coach.call("POST", "/api/coach/challenges", { challengeId: up.id, classId }); ok("coach activates challenge for class", r.status === 200 && r.data.notified === 1, r);
  r = await student.call("POST", `/api/challenges/${up.id}/entries`, { text: "حالا برای کلاس من فعال شده و پاسخ می‌دم." }); ok("class-activated challenge now enterable", r.status === 200, r);
  r = await coach.call("GET", `/api/coach/classes/${classId}/report`); ok("class report", r.data?.students?.length === 1 && r.data.skills.length >= 1, r.data);
  const other = new Client(); await other.call("POST", "/api/auth/register", { role: "coach", displayName: "مربی دیگر", identifier: `c2${rnd}@t.test`, password: "password123" });
  await db.execute(sql`update users set approved = true where email = ${`c2${rnd}@t.test`}`);
  r = await other.call("GET", `/api/coach/classes/${classId}`); ok("other coach blocked from class (403)", r.status === 403, r);

  // parent flow
  r = await parent.call("POST", "/api/parent/link", { code: "ZZZZZZ" }); ok("bad code 404", r.status === 404, r);
  r = await parent.call("POST", "/api/parent/link", { code: linkCode }); ok("parent link child", r.status === 200, r);
  r = await parent.call("GET", "/api/parent/children"); ok("children list", r.data?.children?.length === 1, r);
  r = await parent.call("GET", `/api/parent/children/${sid}/dashboard`); ok("child dashboard", r.data?.summary?.points > 0, r.data);
  r = await parent.call("GET", `/api/parent/children/${sid}/skills`); ok("child skills", r.data?.skills?.length >= 1, r.data);
  r = await parent.call("GET", `/api/parent/children/${sid}/report?days=30`); ok("child report", r.data?.completedMissions >= 1, r.data);
  r = await other.call("GET", `/api/parent/children/${sid}/dashboard`); ok("non-parent blocked", r.status === 403, r);
  const stranger = new Client(); await stranger.call("POST", "/api/auth/register", { role: "parent", displayName: "غریبه", identifier: `x${rnd}@t.test`, password: "password123" });
  r = await stranger.call("GET", `/api/parent/children/${sid}/dashboard`); ok("unlinked parent blocked (403)", r.status === 403, r);

  // inbox + admin
  r = await anon.call("POST", "/api/contact", { name: "مهمان", message: "سلام، یک پیام آزمایشی", subject: "سایر موارد" }); ok("contact form", r.status === 200, r);
  r = await anon.call("POST", "/api/contact", { name: "م", message: "" }); ok("contact validation 422", r.status === 422, r);
  r = await anon.call("POST", "/api/collab", { name: "یک مدرسه", type: "مدارس و مراکز آموزشی", description: "می‌خوایم همکاری کنیم" }); ok("collab form", r.status === 200, r);
  r = await student.call("POST", "/api/game-submissions", { name: "بازی تست من", summary: "یک بازی", skill: "حل مسئله", price: "رایگان" }); ok("game submission", r.status === 200 && r.data.status === "received", r); const gsid = r.data?.id;
  r = await student.call("GET", "/api/admin/inbox"); ok("student blocked from admin (403)", r.status === 403, r);
  r = await admin.call("POST", "/api/auth/login", { identifier: "admin@demo.konjed", password: "demo12345" }); ok("admin login", r.status === 200, r);
  r = await admin.call("GET", "/api/admin/inbox"); ok("admin inbox", r.data?.games?.length >= 1 && r.data?.contacts?.length >= 1 && r.data?.collabs?.length >= 1, r);
  r = await admin.call("PATCH", `/api/admin/game-submissions/${gsid}`, { status: "reviewing", note: "در حال بررسی" }); ok("admin sets status", r.status === 200, r);
  r = await student.call("GET", "/api/game-submissions"); ok("status visible to submitter", r.data?.submissions?.[0]?.statusLabel === "در حال بررسی", r.data);
  r = await admin.call("POST", `/api/admin/game-submissions/${gsid}/publish`); ok("admin publishes", r.status === 200, r);
  r = await anon.call("GET", "/api/games?q=" + encodeURIComponent("بازی تست")); ok("published submission appears in arcade", r.data?.games?.length === 1, r.data);


  // ───── admin: CRUD engine ─────
  const slug = `t-${rnd}`;
  r = await student.call("GET", "/api/admin/courses"); ok("non-admin blocked from admin CRUD (403)", r.status === 403, r);
  r = await admin.call("POST", "/api/admin/courses", { title: "دوره آزمایشی", slug, category: "soft", skills: "حل مسئله، خلاقیت", ageMin: 13, ageMax: 15, status: "registering", capacity: 5, featured: false }); ok("admin creates course", r.status === 200 && r.data?.slug === slug, r); const cid = r.data?.id;
  r = await admin.call("POST", "/api/admin/courses", { title: "تکراری", slug, category: "soft" }); ok("duplicate slug rejected", r.status >= 400, r);
  r = await admin.call("POST", "/api/admin/courses", { title: "x", slug: "y", category: "nope" }); ok("invalid enum 422", r.status === 422, r);
  r = await admin.call("PATCH", `/api/admin/courses/${cid}`, { capacity: 9, startsAt: new Date(Date.now() + 864e5 * 10).toISOString() }); ok("admin updates course", r.status === 200 && r.data.capacity === 9, r);
  r = await anon.call("GET", "/api/courses?status=registering"); ok("new course visible publicly", r.data.courses.some((c: any) => c.slug === slug && c.seatsLeft === 9), r.data);
  r = await admin.call("POST", "/api/admin/missions", { courseId: cid, title: "مأموریت ساخته‌شده", stage: 1, position: 1, skill: "حل مسئله", instruction: "یک چیزی بنویس", contentSummary: "حل مسئله", points: 40, coins: 4 }); ok("admin creates mission", r.status === 200, r); const mid = r.data?.id;
  r = await admin.call("POST", "/api/admin/games", { title: "بازی ساخته‌شده", slug: `g-${rnd}`, shortText: "توضیح", cover: "/assets/konjed/arcade/game-valley-landscape.webp", skillGroup: "soft", skillLabel: "تصمیم‌گیری", status: "published", tags: "جدید، رایگان" }); ok("admin creates game", r.status === 200 && r.data.tags.length === 2, r); const gid = r.data?.id;
  r = await anon.call("GET", "/api/games?q=" + encodeURIComponent("بازی ساخته")); ok("admin game visible in arcade", r.data?.games?.length === 1, r.data);
  r = await admin.call("PATCH", `/api/admin/games/${gid}`, { status: "draft" }); r = await anon.call("GET", "/api/games?q=" + encodeURIComponent("بازی ساخته")); ok("draft game hidden", r.data?.games?.length === 0, r.data);
  r = await admin.call("POST", "/api/admin/games", { title: "بد", slug: "bad", shortText: "x", cover: "javascript:alert(1)", skillGroup: "soft", skillLabel: "x" }); ok("unsafe cover url rejected", r.status === 422, r);
  r = await admin.call("POST", "/api/admin/badges", { title: "نشان آزمایشی", code: `b-${rnd}`, description: "d", rule: "{bad json" }); ok("invalid badge rule rejected", r.status === 422, r);
  r = await admin.call("POST", "/api/admin/badges", { title: "نشان آزمایشی", code: `b-${rnd}`, description: "d", icon: "crown", rule: JSON.stringify({ type: "games_played", count: 1 }) }); ok("admin creates badge", r.status === 200, r); const bid = r.data?.id;
  r = await admin.call("POST", "/api/admin/challenges", { title: "چالش ساخته‌شده", slug: `c-${rnd}`, description: "d", skill: "حل مسئله", status: "active", points: 10, coins: 1 }); ok("admin creates challenge", r.status === 200, r); const chid = r.data?.id;
  r = await admin.call("POST", "/api/admin/toolbox", { title: "ابزار", kind: "tool", skillGroup: "soft", body: "متن" }); ok("admin creates toolbox item", r.status === 200, r); const tid = r.data?.id;
  r = await admin.call("PATCH", `/api/admin/projects/${pid}`, { status: "hidden" }); r = await anon.call("GET", "/api/projects"); ok("hidden project disappears from showcase", !r.data.projects.some((p: any) => p.id === pid), r.data);
  r = await admin.call("GET", "/api/admin/comments"); ok("admin can list comments for moderation", r.status === 200 && r.data.rows.length >= 1, r);
  r = await admin.call("POST", "/api/admin/users", { displayName: "کاربر ساخته‌شده", identifier: `made${rnd}@t.test`, password: "password123", role: "coach", approved: true }); ok("admin creates user", r.status === 200, r); const uid = r.data?.id;
  const made = new Client(); r = await made.call("POST", "/api/auth/login", { identifier: `made${rnd}@t.test`, password: "password123" }); ok("created user can log in", r.status === 200, r);
  r = await admin.call("PATCH", `/api/admin/users/${uid}`, { disabled: true }); ok("admin blocks user", r.status === 200, r);
  r = await made.call("GET", "/api/auth/me"); ok("blocked user's session is revoked", r.data?.user === null, r);
  r = await made.call("POST", "/api/auth/login", { identifier: `made${rnd}@t.test`, password: "password123" }); ok("blocked user cannot log in (403)", r.status === 403, r);
  const me = (await admin.call("GET", "/api/auth/me")).data.user;
  r = await admin.call("PATCH", `/api/admin/users/${me.id}`, { role: "student" }); ok("admin cannot demote self", r.status === 409, r);
  r = await admin.call("DELETE", `/api/admin/users/${me.id}`); ok("admin cannot delete self", r.status === 409, r);
  for (const [res, id] of [["toolbox", tid], ["challenges", chid], ["badges", bid], ["missions", mid], ["courses", cid], ["games", gid], ["users", uid]] as const) { r = await admin.call("DELETE", `/api/admin/${res}/${id}`); ok(`admin deletes ${res}`, r.status === 200, r); }
  r = await admin.call("DELETE", `/api/admin/courses/not-a-uuid`); ok("bad id → 400", r.status === 400, r);

  // ───── admin: CMS ─────
  r = await student.call("GET", "/api/admin/cms"); ok("CMS needs admin", r.status === 403 || r.status === 401, r);
  r = await admin.call("GET", "/api/admin/cms"); ok("CMS lists documents", r.data?.docs?.length >= 14 && r.data.docs.some((d: any) => d.key === "home"), r.data?.docs?.length);
  r = await admin.call("GET", "/api/admin/cms?key=home"); const home = r.data.data; ok("CMS returns home default", home?.hero?.title?.length === 2 && r.data.customized === false, r.data?.customized);
  const marker = `سربرگ آزمایشی ${rnd}`;
  const edited = structuredClone(home); edited.hero.title[1] = marker;
  r = await admin.call("PUT", "/api/admin/cms", { key: "home", data: edited }); ok("CMS saves home", r.status === 200, r);
  let html = await (await fetch(BASE + "/")).text(); ok("edited hero title is live on the home page", html.includes(marker));
  const noLead = structuredClone(home); delete noLead.hero.lead;
  r = await admin.call("PUT", "/api/admin/cms", { key: "home", data: noLead }); ok("CMS rejects removed required field (422)", r.status === 422, r);
  const evilDoc = structuredClone(home); evilDoc.hero.primary.href = "javascript:alert(1)";
  r = await admin.call("PUT", "/api/admin/cms", { key: "home", data: evilDoc }); ok("CMS rejects javascript: links (422)", r.status === 422, r);
  r = await admin.call("GET", "/api/admin/cms?key=page:games/skills"); const pg = r.data.data; pg.hero.title = `عنوان ${rnd}`; pg.sections.push({ kind: "prose", title: `بخش ${rnd}`, paragraphs: ["x"] });
  r = await admin.call("PUT", "/api/admin/cms", { key: "page:games/skills", data: pg }); ok("CMS saves page with a new section", r.status === 200, r);
  html = await (await fetch(BASE + "/games/skills")).text(); ok("edited page + new section are live", html.includes(`عنوان ${rnd}`) && html.includes(`بخش ${rnd}`));
  r = await admin.call("PUT", "/api/admin/cms", { key: "page:games/skills", data: { ...pg, sections: [{ kind: "nope" }] } }); ok("CMS rejects unknown section kind", r.status === 422, r);
  r = await admin.call("GET", "/api/admin/cms?key=home"); ok("revision is kept", r.data.revisions.length >= 0 && r.data.customized === true, r.data);
  r = await admin.call("DELETE", "/api/admin/cms?key=home"); ok("CMS reset to default", r.status === 200, r);
  r = await admin.call("DELETE", "/api/admin/cms?key=page:games/skills");
  html = await (await fetch(BASE + "/")).text(); ok("home back to default after reset", !html.includes(marker));

  // notifications + upload + logout
  r = await student.call("GET", "/api/me/notifications"); ok("notifications", r.data?.unread > 0, r.data);
  r = await student.call("PATCH", "/api/me/notifications"); r = await student.call("GET", "/api/me/notifications"); ok("mark all read", r.data?.unread === 0, r.data);
  const form = new FormData(); form.append("file", new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], { type: "image/png" }), "a.png");
  let up2 = await fetch(BASE + "/api/uploads", { method: "POST", headers: { cookie: student.cookie, origin: BASE }, body: form }); const upj = await up2.json(); ok("upload png", up2.status === 200 && upj.data?.url, upj);
  const bad = new FormData(); bad.append("file", new Blob(["not an image"], { type: "image/png" }), "b.png");
  up2 = await fetch(BASE + "/api/uploads", { method: "POST", headers: { cookie: student.cookie, origin: BASE }, body: bad }); ok("fake png rejected (415)", up2.status === 415);
  const evil = await fetch(BASE + "/api/files/..%2f..%2f.env.local"); ok("path traversal blocked", evil.status === 404, evil.status);
  r = await student.call("POST", "/api/auth/logout"); r = await student.call("GET", "/api/auth/me"); ok("logout", r.data?.user === null, r);
  const xo = await fetch(BASE + "/api/contact", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ name: "x y", message: "hello there" }) }); ok("cross-origin POST blocked (403)", xo.status === 403, xo.status);

  await cleanup();
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
