"use client";

// Splash + hand-off for /s/[slug]: wait for the session to settle so the
// landing page mounts with the right section in the DOM, then deep-link —
// members to their Web Twins, guests (and quiz-pending members) to the
// identity reveal CTA. The beat of delay keeps the jump from flashing.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { useSession } from "@/components/auth/SessionProvider";

export default function ShareLanding({ name, color }) {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      router.replace(user && !user.needsQuiz ? "/#livingweb" : "/#identity");
    }, 450);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  const accent = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#ff3a4a";

  return (
    <div style={s("position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 24px; background: radial-gradient(120% 90% at 50% 30%, #14090f 0%, #0a0712 55%, #07060c 100%); text-align: center;")}>
      <div style={s("position: relative; width: clamp(96px, 16vh, 140px); height: clamp(96px, 16vh, 140px);")}>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${accent}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite" }}></span>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${accent}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite 1.2s" }}></span>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 42%, rgba(30,12,20,0.9), rgba(8,6,14,0.95))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <ellipse cx="50" cy="44" rx="9" ry="12" />
            <path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" />
          </svg>
        </div>
      </div>
      <div>
        {name && (
          <p style={s("margin: 0 0 8px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>
            A friend unmasked as <span style={{ color: accent, fontWeight: 600 }}>{name}</span>
          </p>
        )}
        <p style={s("margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(20px, 4vw, 28px); font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #fff;")}>Entering the Web…</p>
      </div>
      <Link href="/" style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.45); text-decoration: none;")} className="link-hover-red">
        Tap here if nothing happens ›
      </Link>
    </div>
  );
}
