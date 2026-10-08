import type { HomeContent } from "@/lib/konjed/content";
import { Backdrop, Gate } from "./Backdrop";
import { KonjedButton } from "./KonjedButton";
import { ProjectCard, type ProjectData } from "./ProjectCard";

export function StudentShowcase({ c: SHOWCASE, projects }: { c: HomeContent["showcase"]; projects: ProjectData[] }) {
  return (
    <section id="showcase" data-scene="showcase" className="scene scene--showcase" aria-labelledby="showcase-title">
      <div className="stage">
        <Backdrop scene="showcase" />
        <div className="showcase__vignette" aria-hidden="true" />

        <header className="head head--showcase" data-sh="head">
          <p className="eyebrow" data-reveal><span className="eyebrow__no" aria-hidden="true">۰۴</span>{SHOWCASE.eyebrow}</p>
          <h2 id="showcase-title" className="h-display" data-reveal>{SHOWCASE.title}</h2>
          <p className="lead" data-reveal>{SHOWCASE.lead}</p>
          <p className="body-text accent" data-reveal>{SHOWCASE.closing}</p>
        </header>

        <div className="track" data-sh="track">
          {projects.map((p) => <ProjectCard key={p.id} project={p} labels={SHOWCASE} />)}
        </div>

        <div className="showcase__cta" data-reveal><KonjedButton href={SHOWCASE.cta.href}>{SHOWCASE.cta.label}</KonjedButton></div>
        <Gate next="journey" />
      </div>
    </section>
  );
}
