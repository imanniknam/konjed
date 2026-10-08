import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { toFa } from "@/lib/format";

export const fa = toFa;
export const faDate = (d: string | Date) => new Date(d).toLocaleDateString("fa-IR", { month: "long", day: "numeric" });

export function Block({ title, children, wide, action }: { title: string; children: ReactNode; wide?: boolean; action?: ReactNode }) {
  return (
    <section className={`panel__block ${wide ? "panel__block--wide" : ""}`} aria-label={title}>
      <header className="panel__bh"><h2>{title}</h2>{action}</header>
      {children}
    </section>
  );
}
export function Stats({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return <dl className="pstats">{items.map((i) => <div key={i.label}><dd>{i.value}</dd><dt>{i.label}</dt>{i.hint && <small>{i.hint}</small>}</div>)}</dl>;
}
export function Bar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  return <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>;
}
export const Empty = ({ children }: { children: ReactNode }) => <p className="panel__empty">{children}</p>;
export function LinkBtn({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  return <Link href={href} className={`btn btn--${variant} btn--sm`}><span className="btn__label">{children}</span></Link>;
}
export function Skills({ items }: { items: { skill: string; score: number }[] }) {
  return <ul className="skillbars">{items.map((s) => <li key={s.skill} style={{ "--v": s.score } as CSSProperties}><span>{s.skill}</span><div className="meter"><i style={{ width: `${s.score}%` }} /></div><b>{fa(s.score)}</b></li>)}</ul>;
}
/** Tiny inline trend chart (SVG), enough for the parent's «روند پیشرفت». */
export function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return <Empty>برای نمایش روند، حداقل دو ماه فعالیت لازمه.</Empty>;
  const w = 300, h = 80, step = w / (points.length - 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - (p / 100) * (h - 10) - 5).toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label="نمودار روند پیشرفت"><path d={d} fill="none" stroke="var(--mint-400)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{points.map((p, i) => <circle key={i} cx={i * step} cy={h - (p / 100) * (h - 10) - 5} r="4" fill="var(--sun-400)" />)}</svg>;
}
