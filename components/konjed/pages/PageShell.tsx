import type { PageData } from "@/lib/konjed/pages/types";
import { KonjedFooter } from "../KonjedFooter";
import { KonjedNavigation } from "../KonjedNavigation";
import { getUser } from "@/lib/server/auth/session";
import { listGames } from "@/lib/server/services/games";
import { PageHero } from "./PageHero";
import { SectionView } from "./SectionView";

export async function PageShell({ page }: { page: PageData }) {
  const ctx = { games: await listGames({ sort: "recommended", limit: 60 }), user: await getUser() };
  return (
    <>
      <KonjedNavigation />
      <main id="main" className="page">
        <PageHero page={page} />
        {page.sections.map((s, i) => <SectionView key={i} s={s} index={i} ctx={ctx} />)}
      </main>
      <KonjedFooter />
    </>
  );
}
