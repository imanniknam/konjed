import { ASSETS } from "@/lib/konjed/assetMap";
import { LQIP } from "@/lib/konjed/lqip";
import { Img, Plate } from "./Img";

export type BackdropScene = "arcade" | "school" | "showcase" | "journey" | "final";

const STAGE = { arcade: 1, school: 2, showcase: 3, final: 5 } as const;
const IMAGES: Record<Exclude<BackdropScene, "journey">, { src: string; alt: string; w: number }> = {
  arcade: { src: ASSETS.arcade.hall, alt: "", w: 3000 },
  school: { src: ASSETS.school.castle, alt: "", w: 2600 },
  showcase: { src: ASSETS.showcase.gallery, alt: "", w: 2400 },
  final: { src: ASSETS.world.finalSunset, alt: "", w: 2400 },
};

/**
 * The environment plate of a scene. The same component renders a scene's own backdrop and the
 * "gate" inside the previous scene, so both end in an identical frame (seamless transition).
 */
export function Backdrop({ scene, eager = false }: { scene: BackdropScene; eager?: boolean }) {
  if (scene === "journey") {
    return (
      <div className="backdrop backdrop--journey" aria-hidden="true">
        <Img src={ASSETS.world.cloudBlue} stage={4} className="backdrop__cloud backdrop__cloud--a" />
        <Img src={ASSETS.world.rock} stage={4} className="backdrop__rock" />
        <Img src={ASSETS.world.islandTower} stage={4} className="backdrop__island" />
        <div className="backdrop__stars" />
      </div>
    );
  }
  const { src, alt, w } = IMAGES[scene];
  return (
    <div className={`backdrop backdrop--${scene}`} aria-hidden="true" style={LQIP[src] ? { backgroundImage: `url(${LQIP[src]})` } : undefined}>
      <Plate src={src} fullW={w} alt={alt} eager={eager} stage={STAGE[scene]} />
      <div className="backdrop__tint" />
    </div>
  );
}

/** Wrapper used inside a scene to hold the NEXT scene's backdrop. */
export function Gate({ next }: { next: BackdropScene }) {
  return (
    <div className="gate" data-gate aria-hidden="true">
      <Backdrop scene={next} />
    </div>
  );
}
