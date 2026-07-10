// Shared shell for legal pages (/privacy-policy, /terms-of-use) — dark site
// theme with the Oswald eyebrow + headline treatment. Server component: pages
// pass their sections as children using the exported typographic helpers so
// pasted legal copy picks up consistent styling.
import Link from "next/link";
import { s } from "@/lib/style";

export function LegalSection({ title, children }) {
  return (
    <section style={s("margin: 0 0 clamp(26px, 4vh, 38px);")}>
      <h2 style={s("margin: 0 0 12px; font-family: 'Oswald', sans-serif; font-size: clamp(16px, 2vw, 20px); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #fff;")}>{title}</h2>
      {children}
    </section>
  );
}

export function LegalText({ children }) {
  return <p style={s("margin: 0 0 14px; font-size: 14.5px; line-height: 1.75; color: rgba(226,226,240,0.72);")}>{children}</p>;
}

export function LegalList({ items }) {
  return (
    <ul style={s("margin: 0 0 14px; padding-left: 20px; display: flex; flex-direction: column; gap: 8px;")}>
      {items.map((item, i) => (
        <li key={i} style={s("font-size: 14.5px; line-height: 1.7; color: rgba(226,226,240,0.72);")}>{item}</li>
      ))}
    </ul>
  );
}

export default function LegalPage({ title, effectiveDate, children }) {
  return (
    <div style={s("min-height: 100vh; background: linear-gradient(180deg, #0b0510 0%, #07060c 100%); color: #fff;")}>
      <div style={s("max-width: 820px; margin: 0 auto; box-sizing: border-box; padding: clamp(28px, 6vh, 64px) clamp(20px, 5vw, 40px) clamp(48px, 8vh, 90px);")}>
        {/* back to home */}
        <Link href="/" data-web-hover="true" className="footer-link" style={s("display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.55); transition: color .2s ease;")}>
          <span style={s("color: #ff2f40; font-size: 15px;")}>‹</span> Back to Home
        </Link>

        {/* header */}
        <div style={s("margin: clamp(28px, 5vh, 48px) 0 clamp(28px, 4vh, 40px); border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: clamp(20px, 3vh, 28px);")}>
          <div style={s("display: inline-flex; align-items: center; gap: 10px; margin-bottom: 10px;")}>
            <span style={s("width: 34px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff6b79;")}>Legal</span>
          </div>
          <h1 style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(28px, 5vw, 44px); line-height: 1.05; font-weight: 600; font-style: italic; text-transform: uppercase; color: #fff;")}>{title}</h1>
          {effectiveDate && <p style={s("margin: 14px 0 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.4);")}>Effective Date: {effectiveDate}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
