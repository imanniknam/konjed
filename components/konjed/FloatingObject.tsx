import type { CSSProperties } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** seconds for one float cycle */
  duration?: number;
  delay?: number;
  /** float amplitude in px */
  amp?: number;
  glow?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  data?: Record<string, string | number>;
  /** story stage (0-5) → deferred download, see lib/perf/stageImages */
  stage?: number;
};

/**
 * Art object with an idle float. The OUTER element is reserved for scroll transforms (GSAP),
 * the INNER image carries the CSS float, so the two never fight over `transform`.
 */
export function FloatingObject({ src, alt = "", className = "", style, duration = 6, delay = 0, amp = 10, glow, width, height, eager, data, stage }: Props) {
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <div className={`float ${className}`} style={style} {...dataAttrs}>
      <img
        {...(stage !== undefined && !eager ? { "data-src": src, "data-stage": stage } : { src, loading: eager ? "eager" : "lazy" })}
        alt={alt} width={width} height={height}
        decoding="async" draggable={false}
        aria-hidden={alt ? undefined : true}
        style={{ "--float-dur": `${duration}s`, "--float-delay": `${delay}s`, "--float-amp": `${amp}px`, "--glow": glow } as CSSProperties}
      />
    </div>
  );
}
