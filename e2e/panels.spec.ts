import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { login, noOverflow, watch } from "./helpers";

const SETS: Record<string, { email: string; paths: string[] }> = {
  student: { email: "student@demo.konjed", paths: ["dashboard", "missions", "arcade", "toolbox", "projects", "ranking", "notifications", "settings"] },
  coach: { email: "coach@demo.konjed", paths: ["dashboard", "classes", "attendance", "evaluations", "challenges", "reports", "notifications", "settings"] },
  parent: { email: "parent@demo.konjed", paths: ["dashboard", "skills", "projects", "reports", "notifications", "settings"] },
  admin: { email: "admin@demo.konjed", paths: ["", "inbox", "content", "content/edit?key=home", "content/edit?key=page%3Agames", "courses", "missions", "games", "badges", "challenges", "toolbox", "projects", "comments", "classes", "users", "audit", "settings"] },
};

for (const [role, { email, paths }] of Object.entries(SETS)) {
  test(`${role} panel: every page renders clean without overflow`, async ({ page }) => {
    const problems = watch(page);
    await login(page, email);
    for (const p of paths) {
      const res = await page.goto(`/panel/${role}${p ? `/${p}` : ""}`);
      expect(res?.status(), p).toBe(200);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toHaveCount(1);
      await noOverflow(page);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("admin: resource dialog is usable (open, validate, close)", async ({ page }) => {
  await login(page, "admin@demo.konjed");
  await page.goto("/panel/admin/games"); await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "＋ افزودن" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(dlg).toBeVisible();
  expect(await dlg.locator(":invalid").count()).toBeGreaterThan(0);
  const box = await dlg.boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
  await dlg.getByRole("button", { name: "انصراف" }).click();
  await expect(dlg).toBeHidden();
});
