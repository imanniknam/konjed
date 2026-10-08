"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";

/** «شروع بازی»: records the play, then opens the game (or its page while the build isn't hosted yet). */
export function PlayButton({ slug, className = "btn btn--arcade btn--sm", label = "شروع بازی" }: { slug: string; className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await api<{ playUrl: string | null }>("POST", `/api/games/${slug}/play`);
    setBusy(false);
    if (res.ok && res.data.playUrl) window.open(res.data.playUrl, "_blank", "noopener");
    else router.push(`/games/${slug}`);
  }
  return <button type="button" className={className} onClick={go} disabled={busy}><span className="btn__label">{busy ? "..." : label}</span></button>;
}
