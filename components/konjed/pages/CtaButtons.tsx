"use client";

import type { Cta } from "@/lib/konjed/pages/types";
import { useMe } from "@/lib/client/useMe";
import { KonjedButton } from "../KonjedButton";

/** Closing CTA row; swaps in the signed-in variant («ادامه ماجراجویی») when the visitor has an account. */
export function CtaButtons({ items, authCta }: { items: Cta[]; authCta?: Cta }) {
  const me = useMe();
  const list = me && authCta ? [authCta, ...items.slice(1)] : items;
  return <div className="actions">{list.map((c) => <KonjedButton key={c.label} href={c.href} variant={c.variant ?? "primary"}>{c.label}</KonjedButton>)}</div>;
}
