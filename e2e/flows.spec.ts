import { expect, test, type Page } from "@playwright/test";
import { login, noOverflow, rnd, waitLoaderGone, watch } from "./helpers";

/** Full user journeys through the real UI, across roles: student → coach → parent → admin. */
test.describe.serial("end-to-end journey", () => {
  const id = rnd();
  const student = { name: `نیلوفر ${id}`, email: `e2e-s-${id}@t.test`, pass: "password123" };
  let code = "";

  async function logout(page: Page) { await page.request.post("/api/auth/logout"); await page.context().clearCookies(); }

  test("student: sign up → dashboard", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "ثبت‌نام در کنجد" })).toBeVisible();
    await page.getByRole("radio", { name: /^مهارت‌آموز/ }).check({ force: true });
    await page.getByLabel("نام و نام خانوادگی").fill(student.name);
    await page.getByLabel("ایمیل یا شماره موبایل").fill(student.email);
    await page.getByLabel("سن").fill("14");
    await page.getByLabel("رمز عبور").fill(student.pass);
    await page.getByRole("button", { name: "ساخت حساب و شروع ماجراجویی" }).click();
    await page.waitForURL("**/panel/student/dashboard");
    await expect(page.getByRole("heading", { name: "داشبورد من" })).toBeVisible();
    await expect(page.getByText("مأموریت بعدی من")).toBeVisible();
    code = (await page.locator(".linkcode").first().textContent())!.trim();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    await noOverflow(page);
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("student: signup validation errors are shown in Persian", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("radio", { name: /^والدین/ }).check({ force: true });
    await page.getByLabel("نام و نام خانوادگی").fill("تست");
    await page.getByLabel("ایمیل یا شماره موبایل").fill("not-an-email");
    await page.getByLabel("رمز عبور").fill("password123");
    await page.getByRole("button", { name: "ساخت حساب و شروع ماجراجویی" }).click();
    await expect(page.getByText("ایمیل یا شماره موبایل معتبر وارد کن")).toBeVisible();
  });

  test("student: wrong password, then login works", async ({ page }) => {
    await page.goto("/login"); await page.waitForLoadState("networkidle");
    await page.getByLabel("ایمیل یا شماره موبایل").fill(student.email);
    await page.getByLabel("رمز عبور").fill("wrong-password");
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "درست نیست" })).toBeVisible();
    await page.getByLabel("رمز عبور").fill(student.pass);
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await page.waitForURL("**/panel/student/dashboard");
  });

  test("student: enrol in the course, do the first mission, see AI evaluation", async ({ page }) => {
    await login(page, student.email, student.pass);
    await page.goto("/courses#registering");
    await page.getByRole("button", { name: "ثبت‌نام در دوره" }).first().click();
    await expect(page.getByText("ثبت‌نامت انجام شد")).toBeVisible();
    await page.goto("/panel/student/missions");
    await expect(page.getByText("مرحله ۱").first()).toBeVisible();
    await expect(page.getByText("قفل — اول مأموریت‌های قبلی").first()).toBeVisible();
    await page.getByRole("link", { name: /مسئله‌ات رو بشناس/ }).click();
    await expect(page.getByRole("heading", { name: "ارسال پاسخ" })).toBeVisible();
    await page.getByLabel(/خلاصه‌ی آموخته‌ها/).fill("مسئله من کمبود کتابخانه در مدرسه است. بچه‌ها و معلم‌ها درگیرش هستن و چون خلاقیت و سواد رو کم می‌کنه مهمه. وقتی چند بار پرسیدم چرا فهمیدم بودجه نداریم.");
    await page.getByRole("button", { name: "ارسال پاسخ" }).click();
    await expect(page.getByText("نتیجه ارزیابی").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/امتیاز و \+?[۰-۹]+ سکه گرفتی/)).toBeVisible();
    await expect(page.getByRole("button", { name: /مأموریت بعدی/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "نتیجه ارزیابی" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ارسال پاسخ" })).toHaveCount(0);
  });

  test("student: play a game, publish a project, like + comment, join a challenge", async ({ page, isMobile }) => {
    await login(page, student.email, student.pass);
    await page.goto("/games"); await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "شروع بازی" }).first().click();
    await page.waitForURL(/\/games\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/showcase/gallery#submit");
    await page.getByLabel(/عنوان پروژه/).fill(`پروژه ${id}`);
    await page.getByLabel("توضیح پروژه").fill("یک ایده برای ساخت کتابخانه اشتراکی در مدرسه.");
    await page.getByLabel("مهارت اصلی").selectOption("کارآفرینی");
    await page.locator("#submit").getByText("گروهی", { exact: true }).click();
    await page.getByRole("button", { name: "ارسال پروژه" }).click();
    await expect(page.getByText("پروژه‌ات توی ویترین منتشر شد")).toBeVisible();

    await page.goto("/showcase/gallery");
    await page.getByPlaceholder("اسم پروژه، مهارت یا موضوع رو بنویس").fill(`پروژه ${id}`);
    const card = page.locator("article.gcard", { hasText: `پروژه ${id}` });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: /پسندیدن/ }).click();
    await expect(card.getByRole("button", { name: /برداشتن پسند/ })).toBeVisible();
    await card.getByRole("button", { name: "مشاهده پروژه" }).click();
    await page.getByPlaceholder("نظرت رو برای سازنده بنویس...").fill("عالی بود!");
    await page.getByRole("button", { name: "ثبت نظر" }).click();
    await expect(page.locator(".comments").getByText("عالی بود!")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/showcase/challenges");
    await page.getByRole("button", { name: "شرکت در چالش" }).first().click();
    await page.getByPlaceholder("ایده یا پاسخت رو بنویس...").fill("ایده من: کتابخانه اشتراکی با کتاب‌های بچه‌ها.");
    await page.getByRole("button", { name: "ارسال", exact: true }).click();
    await expect(page.getByText(/پاسخت ثبت شد/)).toBeVisible();
    await page.getByRole("button", { name: "یادآوری مسابقه" }).click();
    await expect(page.getByRole("button", { name: /یادآوری فعال شد/ })).toBeVisible();
    void isMobile;
  });

  test("student: dashboard, achievements, ranking, notifications reflect the activity", async ({ page }) => {
    await login(page, student.email, student.pass);
    await expect(page.locator(".pstats dd").first()).not.toHaveText("۰");
    await page.goto("/showcase/achievements");
    await expect(page.getByRole("heading", { name: "نشان‌هایی که به دست آوردم" })).toBeVisible();
    await expect(page.getByText("نشان سازنده").first()).toBeVisible();
    await page.goto("/panel/student/ranking");
    await expect(page.getByRole("heading", { name: "نفرات برتر" })).toBeVisible();
    await page.goto("/panel/student/notifications");
    await expect(page.getByText("نتیجه ارزیابی مأموریتت آماده‌ست")).toBeVisible();
    await page.getByRole("button", { name: /علامت‌گذاری همه/ }).click();
    await expect(page.getByRole("button", { name: /علامت‌گذاری همه/ })).toHaveCount(0);
    await page.goto("/panel/student/projects");
    await expect(page.getByText(`پروژه ${id}`)).toBeVisible();
  });

  test("coach: claims the new student, takes attendance, reviews the mission", async ({ page }) => {
    await login(page, "coach@demo.konjed");
    await page.goto("/panel/coach/classes");
    await page.getByRole("link", { name: /کلاس خلاقیت/ }).first().click();
    await expect(page.getByRole("heading", { name: /کلاس خلاقیت/ })).toBeVisible();
    const row = page.locator("li", { hasText: student.name });
    await row.getByRole("button", { name: "افزودن به کلاس" }).click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("row", { name: new RegExp(student.name) })).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "حضور و غیاب" }).click();
    await page.getByRole("button", { name: "ثبت حضور و غیاب" }).click();
    await expect(page.getByText("حضور و غیاب ثبت شد.")).toBeVisible();

    await page.goto("/panel/coach/evaluations");
    const blk = page.locator("section", { hasText: student.name }).first();
    await expect(blk).toBeVisible();
    await blk.getByRole("button", { name: "اصلاح امتیاز" }).click();
    await blk.getByLabel(/امتیاز نهایی/).fill("95");
    await blk.getByLabel("بازخورد برای مهارت‌آموز").fill("کار عالی بود");
    await blk.getByRole("button", { name: "ثبت بازبینی" }).click();
    await expect(page.locator("section", { hasText: student.name }).first().getByText("امتیاز نهایی: ۹۵")).toBeVisible();

    await page.goto("/panel/coach/reports");
    await page.getByRole("link", { name: "مشاهده گزارش" }).first().click();
    await expect(page.getByText("میانگین پیشرفت کلاس")).toBeVisible();
    await page.goto("/panel/coach/challenges");
    await page.getByRole("combobox", { name: "کلاس" }).first().selectOption({ index: 1 });
    await page.getByRole("button", { name: "فعال‌سازی چالش" }).first().click();
    await expect(page.getByText(/برای کلاس فعال شد/)).toBeVisible();
  });

  test("student sees the coach's review", async ({ page }) => {
    await login(page, student.email, student.pass);
    await page.goto("/panel/student/notifications");
    await expect(page.getByText("مربی خروجی‌ت رو بررسی کرد")).toBeVisible();
  });

  test("parent: sign up, link the child with the code, see skills + report", async ({ page }) => {
    const email = `e2e-p-${id}@t.test`;
    await page.goto("/signup");
    await page.getByRole("radio", { name: /^والدین/ }).check({ force: true });
    await page.getByLabel("نام و نام خانوادگی").fill(`والد ${id}`);
    await page.getByLabel("ایمیل یا شماره موبایل").fill(email);
    await page.getByLabel("رمز عبور").fill("password123");
    await page.getByRole("button", { name: "ساخت حساب و شروع ماجراجویی" }).click();
    await page.waitForURL("**/panel/parent/dashboard"); await page.waitForLoadState("networkidle");
    await page.getByLabel("کد اتصال فرزند").fill("ZZZZZZ");
    await page.getByRole("button", { name: "اتصال", exact: true }).click();
    await expect(page.getByText("این کد پیدا نشد")).toBeVisible();
    await page.getByLabel("کد اتصال فرزند").fill(code.toLowerCase());
    await page.getByRole("button", { name: "اتصال", exact: true }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`داشبورد ${student.name}`) })).toBeVisible();
    await page.goto("/panel/parent/skills");
    await expect(page.getByText("حل مسئله").first()).toBeVisible();
    await page.goto("/panel/parent/reports");
    await expect(page.getByText("مأموریت‌های تکمیل‌شده").first()).toBeVisible();
    await page.goto("/panel/parent/projects");
    await expect(page.getByText(`پروژه ${id}`)).toBeVisible();
  });

  test("a student cannot open another role's panel", async ({ page }) => {
    await login(page, student.email, student.pass);
    await page.goto("/panel/coach/dashboard");
    await page.waitForURL("**/panel/student/dashboard");
    await page.goto("/panel/admin");
    await page.waitForURL("**/panel/student/dashboard");
  });

  test("anonymous visitors are sent to login and returned afterwards", async ({ page }) => {
    await logout(page);
    await page.goto("/panel/student/missions");
    await page.waitForURL(/\/login\?next=%2Fpanel%2Fstudent%2Fmissions/);
    await page.getByLabel("ایمیل یا شماره موبایل").fill(student.email);
    await page.getByLabel("رمز عبور").fill(student.pass);
    await page.getByRole("button", { name: "ورود", exact: true }).click();
    await page.waitForURL("**/panel/student/missions");
  });

  test("admin: approve a new coach, edit home copy through the CMS, create + delete a course", async ({ page }) => {
    const coachEmail = `e2e-c-${id}@t.test`;
    await page.goto("/signup");
    await page.getByRole("radio", { name: /^مربی/ }).check({ force: true });
    await page.getByLabel("نام و نام خانوادگی").fill(`مربی ${id}`);
    await page.getByLabel("ایمیل یا شماره موبایل").fill(coachEmail);
    await page.getByLabel("رمز عبور").fill("password123");
    await page.getByRole("button", { name: "ساخت حساب و شروع ماجراجویی" }).click();
    await page.waitForURL("**/panel/coach/dashboard");
    await expect(page.getByText("حساب مربی‌ات در انتظار تأییده")).toBeVisible();
    await logout(page);

    await login(page, "admin@demo.konjed");
    await page.goto("/panel/admin");
    const pending = page.getByRole("region", { name: "مربی‌های منتظر تأیید" }).locator("li", { hasText: `مربی ${id}` });
    await pending.getByRole("button", { name: "تأیید مربی" }).click();
    await expect(pending).toHaveCount(0);

    // CMS: change the home hero accent word
    const marker = `ماجراجویی ${id}!`;
    await page.goto("/panel/admin/content/edit?key=home");
    const input = page.locator(".je__f input[value='بازی کن!']").first();
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(marker);
    await page.getByRole("button", { name: "ذخیره و انتشار" }).click();
    await expect(page.getByText("ذخیره شد و همین حالا روی سایت اعمال شد.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(marker);
    await page.goto("/panel/admin/content/edit?key=home");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "بازگشت به پیش‌فرض" }).click();
    await expect(page.getByText("به پیش‌فرض برگشت.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(marker);

    // CRUD through the generic manager
    await page.goto("/panel/admin/courses");
    await page.getByRole("button", { name: "＋ افزودن" }).click();
    await page.getByLabel(/عنوان دوره/).fill(`دوره ${id}`);
    await page.getByLabel(/نشانی/).fill(`e2e-${id}`);
    await page.getByLabel("ظرفیت").fill("12");
    await page.getByRole("button", { name: "ذخیره", exact: true }).click();
    await expect(page.getByRole("row", { name: new RegExp(`دوره ${id}`) })).toBeVisible();
    await page.goto("/courses");
    await expect(page.getByText(`دوره ${id}`)).toBeVisible();
    await page.goto("/panel/admin/courses");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("row", { name: new RegExp(`دوره ${id}`) }).getByRole("button", { name: "حذف" }).click();
    await expect(page.getByRole("row", { name: new RegExp(`دوره ${id}`) })).toHaveCount(0);
  });
});
