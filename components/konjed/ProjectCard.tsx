import type { CSSProperties } from "react";
import type { HomeContent } from "@/lib/konjed/content";
import { Img } from "./Img";
import { KonjedButton } from "./KonjedButton";

export type ProjectData = { id: string; title: string; maker: string; tag: string; blurb: string; prop: string; hue: string };

export function ProjectCard({ project, labels }: { project: ProjectData; labels: Pick<HomeContent["showcase"], "makerPrefix" | "viewLabel"> }) {
  return (
    <article className="pcard" data-pcard data-active="false" style={{ "--hue": project.hue } as CSSProperties} aria-labelledby={`project-${project.id}`}>
      <div className="pcard__art">
        <Img src={project.prop} aria-hidden="true" stage={3} />
        <span className="pcard__tag">{project.tag}</span>
      </div>
      <div className="pcard__body">
        <h3 id={`project-${project.id}`}>{project.title}</h3>
        <p className="pcard__maker">{labels.makerPrefix}: <b>{project.maker}</b></p>
        <p className="pcard__blurb">{project.blurb}</p>
        <KonjedButton href="/showcase/gallery#all" variant="ghost" size="sm" magnetic={false}>{labels.viewLabel}</KonjedButton>
      </div>
    </article>
  );
}
