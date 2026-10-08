import type { CSSProperties, ImgHTMLAttributes } from "react";
import { avifSrcSet, srcSet as webpSrcSet } from "@/lib/konjed/assetMap";

/**
 * Image primitives for the story pages.
 *  - `Plate`: a big scene image. AVIF ladder first, WebP fallback (old iOS), responsive by `sizes`.
 *  - `Img`: a sprite / small image (WebP is negotiated server-side for any .png).
 * `stage` (0-5) defers the download: the browser gets no URL until `lib/perf/stageImages` activates it,
 * so a visitor on a slow link only pays for the scene they are actually in (+ the next one, in idle time).
 */
type Common = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "loading"> & { stage?: number; alt?: string };

export function Img({ src, stage, alt = "", ...rest }: Common & { src: string; srcSet?: string }) {
  const { srcSet, ...more } = rest as { srcSet?: string };
  if (stage === undefined) return <img src={src} srcSet={srcSet} alt={alt} loading="lazy" decoding="async" {...(more as object)} />;
  return <img data-src={src} data-srcset={srcSet} data-stage={stage} alt={alt} decoding="async" {...(more as object)} />;
}

export function Plate({ src, fullW, sizes = "100vw", stage, eager, alt = "", className, style, ...rest }: Common & {
  src: string; fullW: number; sizes?: string; eager?: boolean; className?: string; style?: CSSProperties;
}) {
  const avif = avifSrcSet(src);
  const webp = webpSrcSet(src, fullW);
  const fallback = src.replace(/\.webp$/, "-md.webp");
  if (eager || stage === undefined) {
    return (
      <picture>
        {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
        <img className={className} style={style} src={fallback} srcSet={webp} sizes={sizes} alt={alt} decoding="async" {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })} {...(rest as object)} />
      </picture>
    );
  }
  return (
    <picture>
      {avif && <source type="image/avif" data-srcset={avif} sizes={sizes} />}
      <img className={className} style={style} data-src={fallback} data-srcset={webp} sizes={sizes} data-stage={stage} alt={alt} decoding="async" {...(rest as object)} />
    </picture>
  );
}
