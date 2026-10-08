import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KonjedNavigation } from "@/components/konjed/KonjedNavigation";
import { AdminAudit, AdminContentEditor, AdminContentList, AdminDesk, AdminHome, AdminResource, ADMIN_NAV } from "@/components/konjed/admin/AdminPages";
import { CoachAttendance, CoachChallenges, CoachClassDetail, CoachClasses, CoachDashboard, CoachEvaluations, CoachReports } from "@/components/konjed/panel/coach";
import { ParentDashboard, ParentProjects, ParentReports, ParentSkills } from "@/components/konjed/panel/parent";
import { ResponsiveTables } from "@/components/konjed/panel/ResponsiveTables";
import { Notifications, Settings } from "@/components/konjed/panel/shared";
import { StudentArcade, StudentDashboard, StudentMissionDetail, StudentMissions, StudentProjects, StudentRanking, StudentToolbox } from "@/components/konjed/panel/student";
import { getUser } from "@/lib/server/auth/session";
import { notificationsFor } from "@/lib/server/services/dashboard";
import { PANELS, ROLE_ORDER, type Role } from "@/lib/konjed/pages/panels";

type Props = { params: Promise<{ role: string; section?: string[] }>; searchParams: Promise<{ child?: string; days?: string; key?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { role, section } = await params;
  const panel = PANELS[role as Role];
  const page = panel?.pages.find((p) => p.slug === (section?.[0] ?? "dashboard"));
  return { title: page ? `${page.title} | پنل ${panel.label} | کنجد` : "پنل کاربری | کنجد", robots: { index: false, follow: false } };
}

export default async function PanelPage({ params, searchParams }: Props) {
  const { role, section = [] } = await params;
  const sp = await searchParams;
  const path = `/panel/${role}${section.length ? `/${section.join("/")}` : ""}`;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  if (role === "admin") {
    if (user.role !== "admin") redirect(`/panel/${user.role}/dashboard`);
    const slug = section[0] ?? "";
    const { unread } = await notificationsFor(user.id, 1);
    const flat = ADMIN_NAV.flatMap((g) => g.items);
    const title = flat.find(([k]) => k === slug)?.[1] ?? "میز کار تیم کنجد";
    let body: React.ReactNode;
    if (slug === "") body = <AdminHome />;
    else if (slug === "inbox") body = <AdminDesk />;
    else if (slug === "content") body = section[1] === "edit" && sp.key ? <AdminContentEditor docKey={sp.key} /> : <AdminContentList />;
    else if (slug === "audit") body = <AdminAudit />;
    else if (slug === "settings") body = <Settings user={user} />;
    else if (slug === "notifications") body = <Notifications user={user} />;
    else if (flat.some(([k]) => k === slug)) body = <AdminResource keyName={slug} />;
    else notFound();
    return (
      <>
        <KonjedNavigation />
        <div className="panel" data-role="admin">
          <aside className="panel__side" aria-label="منوی پنل مدیر">
            <p className="panel__role">پنل مدیر</p>
            <nav className="adm-nav">{ADMIN_NAV.map((g) => (
              <div key={g.group}><h3>{g.group}</h3><ul>{g.items.map(([k, l]) => <li key={k}><Link href={`/panel/admin${k ? `/${k}` : ""}`} aria-current={k === slug ? "page" : undefined}>{l}{k === "notifications" && unread > 0 && <b className="dot">{unread.toLocaleString("fa-IR")}</b>}</Link></li>)}</ul></div>
            ))}</nav>
          </aside>
          <main id="main" className="panel__main">
            <ResponsiveTables />
            <header className="panel__head"><p className="eyebrow">پنل مدیر · تیم کنجد</p><h1 className="h-display">{title}</h1></header>
            {body}
          </main>
        </div>
      </>
    );
  }
  if (!ROLE_ORDER.includes(role as Role)) notFound();
  if (user.role !== role && user.role !== "admin") redirect(`/panel/${user.role}/dashboard`);

  const panel = PANELS[role as Role];
  const slug = section[0] ?? "dashboard";
  const sub = section[1];
  const page = panel.pages.find((p) => p.slug === slug);
  if (!page) notFound();
  const { unread } = await notificationsFor(user.id, 1);

  let body: React.ReactNode = null;
  if (role === "coach" && !user.approved && user.role !== "admin") body = <div className="panel__grid panel__grid--one"><section className="panel__block panel__block--wide"><h2>حساب مربی‌ات در انتظار تأییده</h2><p>تیم کنجد بعد از بررسی، حساب مربی‌ات رو فعال می‌کنه و بهت اعلان می‌ده. تا اون موقع می‌تونی پروفایلت رو ویرایش کنی.</p><Settings user={user} /></section></div>;
  else if (slug === "notifications") body = <Notifications user={user} />;
  else if (slug === "settings") body = <Settings user={user} />;
  else if (role === "student") {
    body = slug === "dashboard" ? <StudentDashboard user={user} /> : slug === "missions" ? (sub ? <StudentMissionDetail user={user} id={sub} /> : <StudentMissions user={user} />)
      : slug === "arcade" ? <StudentArcade user={user} /> : slug === "toolbox" ? <StudentToolbox /> : slug === "projects" ? <StudentProjects user={user} /> : <StudentRanking user={user} />;
  } else if (role === "coach") {
    body = slug === "dashboard" ? <CoachDashboard user={user} /> : slug === "classes" ? (sub ? <CoachClassDetail user={user} id={sub} /> : <CoachClasses user={user} />)
      : slug === "attendance" ? <CoachAttendance user={user} id={sub} /> : slug === "evaluations" ? <CoachEvaluations user={user} /> : slug === "challenges" ? <CoachChallenges user={user} /> : <CoachReports user={user} id={sub} />;
  } else {
    body = slug === "dashboard" ? <ParentDashboard user={user} child={sp.child} /> : slug === "skills" ? <ParentSkills user={user} child={sp.child} />
      : slug === "projects" ? <ParentProjects user={user} child={sp.child} /> : <ParentReports user={user} child={sp.child} days={Number(sp.days) || 30} />;
  }

  return (
    <>
      <KonjedNavigation />
      <div className="panel" data-role={panel.role}>
        <aside className="panel__side" aria-label={`منوی پنل ${panel.label}`}>
          <p className="panel__role">پنل {panel.label}</p>
          <nav>
            <ul>{panel.pages.map((p) => (
              <li key={p.slug}><Link href={`/panel/${panel.role}/${p.slug}`} aria-current={p.slug === slug ? "page" : undefined}>{p.label}{p.slug === "notifications" && unread > 0 && <b className="dot">{unread.toLocaleString("fa-IR")}</b>}</Link></li>
            ))}</ul>
          </nav>
        </aside>
        <main id="main" className="panel__main">
            <ResponsiveTables />
          <header className="panel__head">
            <p className="eyebrow">پنل {panel.label} · محور اصلی: {panel.axis}</p>
            <h1 className="h-display">{page.title}</h1>
            {page.goal && <p className="lead">{page.goal}</p>}
            {slug === "dashboard" && <p className="panel__flow" aria-label="مسیر تجربه">{panel.flow}</p>}
          </header>
          {body}
          {slug === "dashboard" && panel.note && <p className="pg-note">{panel.note}</p>}
        </main>
      </div>
    </>
  );
}

