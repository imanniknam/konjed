"use client";

import Link from "next/link";
import { useRef } from "react";

type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "arcade";
  size?: "md" | "lg" | "sm";
  magnetic?: boolean;
  className?: string;
  tabIndex?: number;
  "aria-label"?: string;
};

/** Tactile button: pressed-in on :active, subtle magnetic pull on fine pointers. */
export function KonjedButton({ href, children, variant = "primary", size = "md", magnetic = true, className = "", ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (!magnetic || e.pointerType !== "mouse" || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    ref.current.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
  };
  const reset = () => { if (ref.current) ref.current.style.translate = ""; };

  return (
    <Link ref={ref} href={href} onPointerMove={onMove} onPointerLeave={reset} onBlur={reset}
      className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      <span className="btn__label">{children}</span>
    </Link>
  );
}
