import type { HomeContent } from "@/lib/konjed/content";
import { Backdrop, Gate } from "./Backdrop";
import { Img } from "./Img";

export function LearningJourney({ c: JOURNEY }: { c: HomeContent["journey"] }) {
  return (
    <section id="journey" data-scene="journey" className="scene scene--journey" aria-labelledby="journey-title">
      <div className="stage">
        <Backdrop scene="journey" />
        <div className="journey__wrap" data-j="wrap">
          <header className="head head--journey" data-j="head">
            <p className="eyebrow" data-reveal><span className="eyebrow__no" aria-hidden="true">۰۵</span>{JOURNEY.eyebrow}</p>
            <h2 id="journey-title" className="h-display" data-reveal>{JOURNEY.title}</h2>
            <p className="lead" data-reveal>{JOURNEY.lead}</p>
          </header>

          <div className="steps-wrap">
            <svg className="steps__path" data-j="path" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 10 30 C 150 -10, 220 70, 330 30 S 540 -10, 660 30 S 860 70, 990 30" />
            </svg>
            <ol className="steps">
              {JOURNEY.steps.map((s) => (
                <li key={s.n} className="step" data-step>
                  <div className="step__stage">
                    <div className="step__pad" data-pad aria-hidden="true" />
                    <Img className="step__art" data-art src={s.art} aria-hidden="true" stage={4} />
                  </div>
                  <h3 data-copy><span className="step__n" aria-hidden="true">{s.n}.</span> {s.title}</h3>
                  <p data-copy>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <p className="ribbon" data-j="ribbon"><span>{JOURNEY.closing}</span></p>
        </div>
        <Gate next="final" />
      </div>
    </section>
  );
}
