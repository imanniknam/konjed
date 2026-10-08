"use client";

import { useEffect, useState } from "react";

export type Me = { id: string; role: "student" | "coach" | "parent" | "admin"; displayName: string } | null;
let cache: Me | undefined;
const listeners = new Set<(m: Me) => void>();

/** Current user for client UI (nav, CTAs). `undefined` while loading. Pages themselves are guarded on the server. */
export function useMe(): Me | undefined {
  const [me, setMe] = useState<Me | undefined>(cache);
  useEffect(() => {
    listeners.add(setMe);
    if (cache === undefined) fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { cache = j.data?.user ?? null; listeners.forEach((l) => l(cache!)); }).catch(() => { cache = null; setMe(null); });
    return () => { listeners.delete(setMe); };
  }, []);
  return me;
}
export const resetMe = () => { cache = undefined; listeners.forEach((l) => l(null)); };
export const panelHref = (role: string) => (role === "admin" ? "/panel/admin" : `/panel/${role}/dashboard`);
