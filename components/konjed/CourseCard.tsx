import { ASSETS } from "@/lib/konjed/assetMap";
import type { HomeContent } from "@/lib/konjed/content";
import { Plate } from "./Img";
import { KonjedButton } from "./KonjedButton";

export type CourseInfo = { title: string; skills: string[]; age: string; status: string; href: string };

export function CourseCard({ c: SCHOOL, course: c }: { c: HomeContent["school"]; course: CourseInfo }) {
  return (
    <article className="course" data-s="course" aria-labelledby="course-title">
      <p className="course__label">{SCHOOL.featuredLabel}</p>
      <div className="course__row">
        <div className="course__thumb">
          <Plate src={ASSETS.school.people} fullW={2000} sizes="110px" alt="مهارت‌آموزها دور یک میز کنار هم روی یک پروژه کار می‌کنند" stage={2} />
        </div>
        <div className="course__info">
          <h3 id="course-title">{c.title}</h3>
          <ul className="chips" aria-label="مهارت‌ها">
            {c.skills.map((s) => <li key={s} className="chip">{s}</li>)}
          </ul>
          <dl className="course__meta">
            <div><dt>رده سنی</dt><dd>{c.age}</dd></div>
            <div><dt>وضعیت</dt><dd className="status"><i aria-hidden="true" />{c.status}</dd></div>
          </dl>
        </div>
      </div>
      <KonjedButton href={c.href} variant="ghost" size="sm">{SCHOOL.courseCta}</KonjedButton>
    </article>
  );
}
