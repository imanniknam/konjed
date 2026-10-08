# معماری فنی کنجد

## ۱. تحلیل نیازها (از اسناد)
- **سه نقش با تجربه‌ی متفاوت** (مهارت‌آموز / مربی / والدین) روی یک مسیر داده‌ی مشترک + **مدیر** (تیم کنجد) برای بررسی درخواست‌ها.
- **جریان اصلی داده:** مأموریت → خروجی (متن/صدا/ویدئو) → ارزیابی هوش مصنوعی → بازبینی مربی → امتیاز/سکه/نشان → رتبه‌بندی → گزارش والدین.
- **آرکید:** متادیتای بازی (نام، کاور، سازنده، لینک اجرا، مهارت، سن، مدت، رایگان/پولی) + جست‌وجو/فیلتر + محبوبیت (تعداد بازی‌شدن).
- **ویترین:** پروژه، لایک، نظر، دسته‌بندی، ثبت پروژه با فایل.
- **فاز ۲/۳ (آماده‌سازی، نه پیاده‌سازی کامل):** انتشار بازی توسط سازنده‌ها (جدول `game_submissions` + گردش وضعیت)، چالش و مسابقه.

## ۲. انتخاب استک و دلیل
| لایه | انتخاب | چرا |
|---|---|---|
| اپلیکیشن | **Next.js 15 (App Router) + TypeScript** | فرانت و بک‌اند در یک مخزن و یک دیپلوی؛ نوع‌های مشترک؛ سرور-کامپوننت‌ها مستقیم از لایه‌ی سرویس می‌خوانند (بدون API اضافه) |
| API | Route Handlers با پوشه‌ی `app/api/*` | REST ساده برای فرم‌ها/کلاینت‌های آینده (اپ موبایل فاز ۳) |
| پایگاه داده | **PostgreSQL 17** | داده‌ی رابطه‌ایِ قوی (کلاس/ثبت‌نام/امتیاز)، تراکنش، آرایه و JSONB برای قوانین نشان |
| ORM / مهاجرت | **Drizzle ORM + drizzle-kit** | SQL شفاف و تایپ‌شده، مهاجرت‌های قابل‌بازبینی در `drizzle/` |
| اعتبارسنجی | **Zod** | یک تعریف برای ورودی، پیام خطای فارسی |
| احراز هویت | سشن کوکی (`httpOnly`, `SameSite=Lax`) + **scrypt** | بدون وابستگی خارجی؛ توکن تصادفی ۲۵۶ بیتی که فقط هش آن در DB می‌ماند |
| هوش مصنوعی | **Claude (Anthropic Messages API)** با fallback قطعی | ارزیابی تطابق پاسخ با محتوای جلسه؛ بدون کلید هم سیستم کار می‌کند |
| فایل | دیسک محلی پشت اینترفیس `putUpload/getUpload` | برای پروداکشن با S3-سازگار عوض می‌شود؛ بقیه‌ی کد تغییر نمی‌کند |

دلیل نگرفتن چیزهای دیگر: GraphQL/tRPC و صف پیام در این مقیاس سربار است؛ NextAuth برای نیاز «ایمیل/موبایل + رمز + نقش» کوچک‌تر از آن است که ارزش وابستگی داشته باشد.

## ۳. لایه‌بندی کد (`lib/server`)
```
app/api/**/route.ts      ← لایه‌ی HTTP: auth، اعتبارسنجی، تبدیل خطا (wrapper route())
lib/server/services/*    ← منطق کسب‌وکار (games, courses, missions, coach, parent, gamification, …)
lib/server/db/schema.ts  ← مدل داده (Drizzle)
lib/server/ai/evaluator  ← ارزیاب Claude / heuristic
lib/server/auth/*        ← scrypt، سشن، guard نقش‌ها
lib/server/http/*        ← ApiError، rate-limit، handler
lib/server/storage/*     ← آپلود
```
قاعده: route فقط ورودی را می‌گیرد و سرویس را صدا می‌زند؛ صفحات سروری هم از همان سرویس‌ها می‌خوانند → یک نسخه از قوانین.

## ۴. مدل داده (خلاصه)
`users` (نقش) · `student_profiles` (امتیاز، سکه، سطح، **کد اتصال والدین**) · `parent_links` · `courses` · `classes` · `enrollments` · `missions` · `mission_submissions` (امتیاز AI + بازبینی مربی) · `games` · `game_plays` · `game_submissions` · `projects` · `project_likes` · `project_comments` · `badges` (قانون اعلانی JSONB) · `user_badges` · `points_ledger` (دفتر کل امتیاز/سکه) · `skill_events` (نمودار مهارت والدین) · `challenges` · `challenge_classes` · `challenge_entries` · `challenge_reminders` · `attendance_sessions/records` · `notifications` · `toolbox_items` · `contact_messages` · `collab_requests` · `sessions`.

تصمیم‌های مهم
- امتیاز **دفتر کل** است (`points_ledger`)؛ مقدار تجمعی در `student_profiles` برای خواندن سریع نگه‌داری می‌شود و فقط از `award()` تغییر می‌کند.
- نشان‌ها قانون اعلانی دارند (`missions_in_skill`, `projects`, `games_played` …)؛ افزودن نشان جدید = یک ردیف، بدون deploy.
- فعال‌سازی چالش **برای کلاس** است (`challenge_classes`) و وضعیت سراسری چالش را عوض نمی‌کند.
- هر مأموریت یک بار ارسال می‌شود (`unique(mission, student)`)؛ باز شدن مأموریت بعدی از روی ارسال‌های قبلی محاسبه می‌شود (نیازی به جدول وضعیت نیست).

## ۵. امنیت
- رمز: scrypt (N=16384) + salt تصادفی؛ مقایسه‌ی زمان‌ثابت. پیام یکسان برای «کاربر نامعتبر / رمز غلط».
- سشن: توکن تصادفی، فقط هش در DB، انقضا ۳۰ روز، تغییر رمز همه‌ی سشن‌های دیگر را باطل می‌کند.
- CSRF: `SameSite=Lax` + بررسی `Origin` برای همه‌ی متدهای غیر GET.
- **کنترل دسترسی (IDOR):** مربی فقط کلاس خودش؛ والد فقط فرزند متصل؛ مهارت‌آموز فقط مأموریت‌های مسیر خودش؛ پروژه‌ی پیش‌نویس فقط برای نویسنده.
- Rate limit برای ثبت‌نام/ورود/فرم‌ها/آپلود (حافظه‌ی پردازش؛ برای چند نمونه → Redis با همان امضا).
- آپلود: لیست سفید MIME، سقف حجم (تصویر ۵ / صدا ۱۵ / ویدئو ۵۰ مگابایت)، بررسی magic-bytes تصویر، نام تصادفی، جلوگیری از path traversal، `nosniff`. SVG مجاز نیست.
- متن مهارت‌آموز در پرامپت AI «داده» است نه دستور (در system prompt تصریح شده).
- خروجی HTML همیشه توسط React escape می‌شود؛ هیچ `dangerouslySetInnerHTML` استفاده نشده است.

## ۶. اجرا
```bash
npm install
npm run db:start          # PostgreSQL محلی روی پورت 54329 (جدا از هر Postgres دیگر)
npm run db:migrate
npm run db:seed:demo      # داده‌ی اسناد + حساب‌های دمو (رمز demo12345)
npm run dev
npm run test:api          # ~۸۰ بررسی سرتاسری API
npm run test:pages        # رندر همه‌ی صفحات با نقش‌های مختلف
```
حساب‌های دمو: `student@demo.konjed` · `coach@demo.konjed` · `parent@demo.konjed` · `admin@demo.konjed`.
متغیرها: `.env.example`. برای ارزیابی با Claude کلید `ANTHROPIC_API_KEY` را بگذارید؛ مدیر واقعی با `ADMIN_EMAIL/ADMIN_PASSWORD` هنگام seed ساخته می‌شود.

## ۶-ب. پنل مدیر و CMS
- **پنل مدیر** (`/panel/admin`): میز کار (آمار، مربی‌های منتظر تأیید، صف‌ها)، صندوق ورودی (درخواست انتشار بازی با انتشار یک‌کلیکی در آرکید، پیام‌های تماس، درخواست‌های همکاری)، گزارش تغییرات (audit log).
- **ساخت و مدیریت محتوا** با یک موتور CRUD اعلانی (`lib/server/admin/resources.ts`): دوره‌ها، مأموریت‌ها (با «خلاصه محتوای جلسه» برای ارزیاب AI)، بازی‌ها (آپلود کاور)، نشان‌ها (قانون اعلانی)، چالش‌ها، جعبه ابزار، نظارت بر پروژه‌ها و نظرها، کلاس‌ها، کاربران (ساخت، مسدودسازی، تأیید مربی، تغییر نقش). افزودن منبع جدید = یک تعریف فیلد.
- **CMS متن‌ها:** سند‌های `home`، `chrome` (منو/فوتر) و `page:<slug>` برای همه صفحه‌ها در `cms_documents`. اگر ویرایش نشده باشد، پیش‌فرض کد استفاده می‌شود. ویرایشگر بصری (افزودن/حذف/جابه‌جایی آیتم‌ها و بخش‌های جدید از قالب) + JSON پیشرفته + تاریخچه نسخه و بازگردانی + بازگشت به پیش‌فرض. اعتبارسنجی: ساختار، لینک‌های ناامن (`javascript:` رد می‌شود)، حجم.
- **تأیید مربی:** مربی‌های خودثبت‌نام تا تأیید مدیر به پنل دسترسی ندارند؛ کاربر مسدودشده سشن‌هایش قطع می‌شود.

## ۶-ج. آماده‌ی پروداکشن
- هدرهای امنیتی + CSP (فقط در production)، `output: standalone`، `robots.txt`، `sitemap.xml` (پویا)، manifest، `icon.svg`، noindex برای پنل/ورود، صفحه‌های `404` و خطا، `/api/health`.
- `Dockerfile` چندمرحله‌ای + `docker-compose.yml` (اپ + Postgres + volume آپلود)؛ هنگام بالا آمدن: migrate → seed محتوای پایه (idempotent) → سرویس. متغیرهای لازم: `DATABASE_URL`, `SITE_URL` (و اختیاری `ADMIN_EMAIL/ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`).
- CI در `.github/workflows/ci.yml`: typecheck، migrate، build، تست API، تست صفحه‌ها، Playwright.
- پشت reverse proxy اجرا شود که `X-Forwarded-For` را بازنویسی کند (محدودیت نرخ بر اساس آن است).

## ۶-د. تست‌ها
`npm run test:api` (حدود ۱۱۰ بررسی API: نقش‌ها، دسترسی، CRUD مدیر، CMS، آپلود، امنیت) · `npm run test:pages` · `npm run test:e2e` (Playwright، ۴ viewport: دسکتاپ، لپ‌تاپ، موبایل، ۳۲۰ پیکسل؛ مسیر کامل مهارت‌آموز ← مربی ← والد ← مدیر، سرریز افقی، RTL، خطاهای کنسول/درخواست، axe).

## ۷. مسیر مقیاس (وقتی لازم شد)
1. ارزیابی AI → صف کار (BullMQ/Redis یا pg-boss) با وضعیت `pending` روی ارسال؛ فعلاً هم‌زمان با timeout ۲۰ ثانیه و fallback.
2. Rate limit و کش → Redis. فایل‌ها → S3 + CDN (URL ثابت `/api/files/…` می‌ماند).
3. اعلان‌ها → SSE/WebSocket (فعلاً polling با شمارنده‌ی خوانده‌نشده).
4. مارکت‌پلیس (فاز ۲): `game_submissions` → `creators` + پرداخت (درگاه)، سهم سازنده و قیمت‌گذاری؛ ستون‌های `price_model/price_amount` از الان در `games` هست.
5. جست‌وجو: امروز `ILIKE` با نرمال‌سازی نیم‌فاصله؛ برای حجم بالا `pg_trgm`/جست‌وجوی تمام‌متن.

## ۸. محدودیت‌ها و تصمیم‌های باز
- ظرفیت/تاریخ شروع دوره در seed نیست (سند مقدار نداده)؛ از پنل مدیر یا SQL تنظیم می‌شود. 
- محتوای مأموریت‌ها و ابزارهای جعبه‌ابزار در seed **نمونه** است و از اسناد نیامده.
- بازی‌های واقعی هنوز میزبانی نشده‌اند؛ دکمه‌ی «شروع بازی» ثبت می‌کند و در صورت داشتن `play_url` بازی را باز می‌کند.
- معیار «محبوبیت» = تعداد شروع بازی (`plays_count`)؛ سند خواسته بک‌اند آن را مشخص تعریف کند.

## Performance (images, loading, scroll system)
- **Images**: big scene plates ship as an AVIF ladder (640…2560w) with the old WebP set as `<picture>` fallback; PNG sprites have WebP twins that
  `next.config.mjs` serves transparently for any `/assets/**.png` request whose `Accept` includes `image/webp` (so DB/CMS references benefit too).
  Regenerate everything with `node scripts/optimize-assets.mjs` (idempotent; also writes `lib/konjed/lqip.ts`, the blur-up placeholders).
- **Staged loading** (`lib/perf/stageImages.ts`, `components/konjed/Img.tsx`): only the hero plate loads eagerly (preloaded, `fetchpriority=high`).
  Every other scene image has `data-src` and is activated by scene proximity, then the rest trickle in during idle time (never on Save-Data / 2G).
- **No blocking loader**: an inline script in `app/layout.tsx` picks the scroll mode before first paint and holds scroll still until GSAP/Lenis
  (a separate, dynamically imported chunk) have wired the story.
- **Fonts**: Vazirmatn variable font (one file per subset). **Prefetch** of nav/footer links is off.
- Measure with `BASE=https://… node scripts/perf-measure.mjs`; Lighthouse: `npx lighthouse@12 <url> --only-categories=performance`.
- Deploy artefacts are built off-server (the production VPS is shared and slow to reach npm/Docker Hub): `next build` + `npm run build:scripts`,
  then rsync `standalone/ static/ public/ drizzle/ dist/` into `/opt/apps/konjed` and `docker compose up -d --build`.
