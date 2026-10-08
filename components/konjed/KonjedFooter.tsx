import Link from "next/link";
import { ASSETS } from "@/lib/konjed/assetMap";
import { getChrome } from "@/lib/server/cms";
import { KonjedLogo } from "./Logo";

export async function KonjedFooter() {
  const FOOTER = (await getChrome()).footer;
  return (
    <footer className="footer">
      <img className="footer__rock" src={ASSETS.world.rock} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <div className="footer__inner">
        <div className="footer__brand">
          <KonjedLogo />
          <p>{FOOTER.brandLine}</p>
        </div>
        <nav className="footer__cols" aria-label="پیوندهای پایین صفحه">
          {FOOTER.columns.map((col) => (
            <div key={col.title}>
              <h2>{col.title}</h2>
              <ul>{col.links.map((l) => <li key={l.href}><Link href={l.href} prefetch={false}>{l.label}</Link></li>)}</ul>
            </div>
          ))}
        </nav>
        <div className="footer__bottom">
          <p className="footer__rights">{FOOTER.rights}</p>
          <p className="footer__credit">
            طراحی و توسعه:{" "}
            <a href="https://shamimhouse.ir" target="_blank" rel="noopener">خانه شمیم</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
