import { preload } from "react-dom";
import { ASSETS, avifSrcSet } from "@/lib/konjed/assetMap";
import { FinalAdventure } from "@/components/konjed/FinalAdventure";
import { JourneyProvider } from "@/components/konjed/JourneyProvider";
import { KonjedArcade } from "@/components/konjed/KonjedArcade";
import { KonjedFooter } from "@/components/konjed/KonjedFooter";
import { KonjedHero } from "@/components/konjed/KonjedHero";
import { KonjedNavigation } from "@/components/konjed/KonjedNavigation";
import { LearningJourney } from "@/components/konjed/LearningJourney";
import { Particles } from "@/components/konjed/Particles";
import { SkillSchool } from "@/components/konjed/SkillSchool";
import { StudentShowcase } from "@/components/konjed/StudentShowcase";
import { getHome } from "@/lib/server/cms";
import { homeData } from "@/lib/server/services/home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [c, d] = await Promise.all([getHome(), homeData()]);
  // the LCP image: start the AVIF download from the very first bytes of the HTML
  preload(ASSETS.world.hero.replace(".webp", "-md.webp"), { as: "image", imageSrcSet: avifSrcSet(ASSETS.world.hero), imageSizes: "100vw", fetchPriority: "high", type: "image/avif" });
  return (
    <>
      <KonjedNavigation />
      <Particles />
      <main id="main">
        <JourneyProvider>
          <KonjedHero c={c.hero} />
          <KonjedArcade c={c.arcade} games={d.games} />
          <SkillSchool c={c.school} course={d.course} />
          <StudentShowcase c={c.showcase} projects={d.projects} />
          <LearningJourney c={c.journey} />
          <FinalAdventure c={c.final} />
        </JourneyProvider>
      </main>
      <KonjedFooter />
    </>
  );
}
