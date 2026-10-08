import { ASSETS } from "@/lib/konjed/assetMap";
import type { HomeContent } from "@/lib/konjed/content";
import { Backdrop, Gate } from "./Backdrop";
import { CourseCard, type CourseInfo } from "./CourseCard";
import { FloatingObject } from "./FloatingObject";
import { Plate } from "./Img";
import { KonjedButton } from "./KonjedButton";

export function SkillSchool({ c: SCHOOL, course }: { c: HomeContent["school"]; course: CourseInfo | null }) {
  return (
    <section id="school" data-scene="school" className="scene scene--school" aria-labelledby="school-title">
      <div className="stage">
        <Backdrop scene="school" />
        <div className="school__warmth" aria-hidden="true" />

        <FloatingObject src={ASSETS.rewards.backpack} className="prop prop--a" data={{ s: "prop", depth: 1.0, "flow-float": "" }} duration={7} stage={2} />
        <FloatingObject src={ASSETS.rewards.book} className="prop prop--b" data={{ s: "prop", depth: 0.7 }} duration={8} delay={1} stage={2} />
        <FloatingObject src={ASSETS.rewards.bulb} className="prop prop--c" data={{ s: "prop", depth: 1.3 }} duration={5.5} delay={0.5} glow="#ffe08a" stage={2} />
        <FloatingObject src={ASSETS.rewards.scroll} className="prop prop--d" data={{ s: "prop", depth: 0.9 }} duration={9} delay={2} stage={2} />

        <header className="head head--school" data-s="head">
          <p className="eyebrow" data-reveal><span className="eyebrow__no" aria-hidden="true">۰۳</span>{SCHOOL.eyebrow}</p>
          <h2 id="school-title" className="h-display" data-reveal>{SCHOOL.title}</h2>
          <p className="lead" data-reveal>{SCHOOL.lead}</p>
          <p className="body-text" data-reveal>{SCHOOL.body}</p>
          <div className="actions" data-reveal>
            <KonjedButton href={SCHOOL.primary.href}>{SCHOOL.primary.label}</KonjedButton>
            <KonjedButton href={SCHOOL.secondary.href} variant="secondary">{SCHOOL.secondary.label}</KonjedButton>
          </div>
        </header>

        <figure className="peek" data-s="peek">
          <Plate src={ASSETS.school.people} fullW={2000} sizes="(min-width: 900px) 20vw, 120px" alt="فضای مدرسه مهارت؛ سالنی روشن با پله‌ها و گیاه" stage={2} />
        </figure>

        {course && <CourseCard c={SCHOOL} course={course} />}
        <Gate next="showcase" />
      </div>
    </section>
  );
}
