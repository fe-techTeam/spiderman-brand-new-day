/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { createSfx } from "@/lib/sfx";
import { initGlobe } from "@/lib/globe";
import { initParticles } from "@/lib/particles";
import { portalApi } from "@/lib/portal/api";
import { fmtCount } from "@/lib/time";
import { Flag } from "@/components/Flags";
import { useSession } from "@/components/auth/SessionProvider";
import Nav from "@/components/main/Nav";
import WalkthroughModal from "@/components/main/WalkthroughModal";
import TrailerModal from "@/components/main/TrailerModal";

/* ---------------------------------------------------------------- static data */

const WALK_ITEMS = [
  { emoji: "🕷️", line1: "Discover Your", line2: "Spider Identity", desc: "Answer a few questions to unlock your unique Spider-Verse Avatar." },
  { emoji: "🌍", line1: "Find Your", line2: "Spider Twins", desc: "Meet fans around the world who share your Spider identity." },
  { emoji: "💌", line1: "Leave a Message", line2: "For MJ", desc: "Share your thoughts and messages for MJ with the community." },
  { emoji: "🎨", line1: "Share Your", line2: "Fan Creations", desc: "Upload your artwork, edits, videos, and cosplay creations." },
  { emoji: "💬", line1: "Join the", line2: "Conversation", desc: "Discuss theories, easter eggs, and all things Spider-Man." },
  { emoji: "📍", line1: "Track", line2: "Spider-Man", desc: "Follow Spider-Man's latest sightings with Spidey Tracker." },
];

const WEB_TWINS = [
  { name: "Aarav M.", city: "Mumbai, India", flag: "in", identity: "Dreamer", color: "#ff5a6a", delay: "260ms" },
  { name: "Sofia R.", city: "São Paulo, Brazil", flag: "br", identity: "Dreamer", color: "#4d8bff", delay: "360ms" },
  { name: "James C.", city: "London, UK", flag: "uk", identity: "Dreamer", color: "#ffd23f", delay: "460ms" },
  { name: "Yuki T.", city: "Tokyo, Japan", flag: "jp", identity: "Dreamer", color: "#ff5a6a", delay: "560ms" },
  { name: "Mia K.", city: "Sydney, Australia", flag: "au", identity: "Dreamer", color: "#4d8bff", delay: "660ms" },
  { name: "Noah W.", city: "New York, USA", flag: "us", identity: "Dreamer", color: "#ffd23f", delay: "760ms" },
];

const projX = (lon) => ((lon + 180) / 360 * 100).toFixed(1) + "%";
const projY = (lat) => (10 + (78 - lat) / 136 * 80).toFixed(1) + "%";
const MAP_CHIPS = [
  ["New York", "USA", "us", -74, 40.7, true], ["Los Angeles", "USA", "us", -118.2, 34, false],
  ["Mexico City", "Mexico", null, -99.1, 19.4, false], ["São Paulo", "Brazil", "br", -46.6, -23.5, true],
  ["Buenos Aires", "Argentina", null, -58.4, -34.6, false], ["London", "UK", "uk", -0.1, 51.5, true],
  ["Moscow", "Russia", null, 37.6, 55.8, false], ["Lagos", "Nigeria", "ng", 3.4, 6.5, true],
  ["Cairo", "Egypt", null, 31.2, 30, false], ["Dubai", "UAE", null, 55.3, 25.2, false],
  ["Mumbai", "India", "in", 72.8, 19.1, true], ["Beijing", "China", null, 116.4, 39.9, false],
  ["Tokyo", "Japan", "jp", 139.7, 35.7, true], ["Singapore", "Singapore", null, 103.8, 1.35, false],
  ["Sydney", "Australia", "au", 151.2, -33.9, true],
].map(([city, country, fk, lon, lat, labeled]) => ({
  city, country, labeled: !!labeled, flagCode: fk, x: projX(lon), y: projY(lat),
}));

/* landing sections in DOM order — drives the right-side web-rail nav */
const RAIL_SECTIONS = [
  { key: "hero", label: "Brand New Day" },
  { key: "identity", label: "Find Your Identity" },
  { key: "livingweb", label: "The Living Web" },
  { key: "mjwall", label: "MJ Wall" },
  { key: "feed", label: "Spider-Verse Feed" },
  { key: "tracker", label: "Spidey Tracker" },
  { key: "footer", label: "Official Trailer" },
];

/* ---------------------------------------------------------------- component */

export default function Home() {
  const router = useRouter();
  const { user, openAuth, authOpen } = useSession();

  const [walkOpen, setWalkOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mjMessage, setMjMessage] = useState("");
  const [mjSent, setMjSent] = useState(false);
  const [mjSending, setMjSending] = useState(false);
  const [mjError, setMjError] = useState("");
  const [twinMode, setTwinMode] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [stats, setStats] = useState(null);

  // Logged-in members already picked their identity during onboarding — the
  // "Who Are You Under the Mask?" section only shows for guests / quiz-pending.
  const hideIdentity = !!user && !user.needsQuiz;

  // DOM refs
  const stageRef = useRef(null);
  const bgRef = useRef(null);
  const spideyWrapRef = useRef(null);
  const heroStackRef = useRef(null);
  const logoRef = useRef(null);
  const idParticlesRef = useRef(null);
  const globeRef = useRef(null);
  const mjWallRef = useRef(null);
  const mjHeaderRef = useRef(null);
  const mjInputRef = useRef(null);
  const barTopRef = useRef(null);
  const barBottomRef = useRef(null);
  const flashRef = useRef(null);
  const irisRef = useRef(null);

  // imperative bridges + state mirrors (read from event handlers / RAF)
  const goToPageRef = useRef(() => {});
  const revealObsRef = useRef(null);
  const sectionObsRef = useRef(null);
  const mobileBlinkBusyRef = useRef(false);
  const sfxRef = useRef(null);
  const isDesktopRef = useRef(true);
  const walkOpenRef = useRef(false);
  const trailerOpenRef = useRef(false);
  const mobileMenuOpenRef = useRef(false);
  const twinModeRef = useRef(false);
  const authOpenRef = useRef(false);

  isDesktopRef.current = isDesktop;
  walkOpenRef.current = walkOpen;
  trailerOpenRef.current = trailerOpen;
  mobileMenuOpenRef.current = mobileMenuOpen;
  twinModeRef.current = twinMode;
  authOpenRef.current = authOpen;

  /* ============================================================ mount effect */
  useEffect(() => {
    const entryStart = performance.now();
    const entryMs = 5200; // slow cinematic pan-out
    const tgt = { mx: 0, my: 0 };
    const cur = { mx: 0, my: 0 };
    const scrollTgt = { v: 0 };
    const scrollCur = { v: 0 };
    let raf = null;
    let reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mjTopCache = 0;      // document-space top of the MJ section (re-measured on resize)
    let entrySettled = false; // stop re-writing the bg filter once the entrance is done

    const sfx = createSfx();
    sfxRef.current = sfx;

    /* ---- parallax RAF loop (from _kickRAF) ---- */
    const kickRAF = () => {
      if (raf) return;
      const tick = () => {
        cur.mx += (tgt.mx - cur.mx) * 0.08;
        cur.my += (tgt.my - cur.my) * 0.08;
        scrollCur.v += (scrollTgt.v - scrollCur.v) * 0.12;
        const mx = cur.mx, my = cur.my, sy = scrollCur.v;

        const eRaw = Math.min(1, Math.max(0, (performance.now() - entryStart) / entryMs));
        const e = 1 - Math.pow(1 - eRaw, 3);
        const entryScale = 1.45 - 0.45 * e;
        const entryY = (1 - e) * -28;
        if (bgRef.current) {
          const sc = entryScale * (1 + Math.abs(my) * 0.005);
          bgRef.current.style.transform = `translate3d(${(-mx * 14).toFixed(2)}px, ${(-my * 10 - sy * 0.18 + entryY).toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
          if (!entrySettled) {
            bgRef.current.style.filter = `brightness(${(0.55 + 0.45 * e).toFixed(3)}) saturate(${(0.7 + 0.3 * e).toFixed(3)})`;
            entrySettled = eRaw >= 1;
          }
        }
        if (heroStackRef.current) {
          heroStackRef.current.style.transform = `translate3d(0, ${(sy * -0.08).toFixed(2)}px, 0)`;
        }
        if (isDesktopRef.current && mjHeaderRef.current && mjTopCache > 0) {
          // cached offsetTop instead of getBoundingClientRect(): no forced
          // layout inside the frame loop (sections are fixed 100vh, so the
          // offset only moves on resize)
          const secTop = mjTopCache - (window.scrollY || 0);
          const enter = Math.max(-0.4, Math.min(1, 1 - secTop / (window.innerHeight || 800)));
          mjHeaderRef.current.style.transform = `translate3d(0, ${((1 - enter) * 140).toFixed(2)}px, 0)`;
          mjHeaderRef.current.style.opacity = Math.max(0, Math.min(1, enter * 1.6 + 0.2)).toFixed(3);
        } else if (mjHeaderRef.current) {
          mjHeaderRef.current.style.opacity = "1"; // mobile: keep readable (CSS forces transform:none)
        }
        if (logoRef.current) {
          logoRef.current.style.transform = `translate3d(${(-mx * 14).toFixed(2)}px, ${(-my * 8).toFixed(2)}px, 0)`;
        }

        const entryRunning = (performance.now() - entryStart) < entryMs + 50;
        const moving = entryRunning
          || Math.abs(tgt.mx - cur.mx) > 0.001
          || Math.abs(tgt.my - cur.my) > 0.001
          || Math.abs(scrollTgt.v - scrollCur.v) > 0.2;
        raf = moving ? requestAnimationFrame(tick) : null;
      };
      raf = requestAnimationFrame(tick);
    };

    /* ---- pointer / scroll / key / resize ---- */
    const onMove = (ev) => {
      const w = window.innerWidth, h = window.innerHeight;
      tgt.mx = (ev.clientX / w) * 2 - 1;
      tgt.my = (ev.clientY / h) * 2 - 1;
      kickRAF();
    };
    const onLeave = () => { tgt.mx = 0; tgt.my = 0; kickRAF(); };
    const onScroll = () => { scrollTgt.v = window.scrollY || window.pageYOffset || 0; kickRAF(); };
    const onKeyDown = (ev) => {
      if (ev.key !== "Escape") return;
      if (trailerOpenRef.current) setTrailerOpen(false);
      if (mobileMenuOpenRef.current) setMobileMenuOpen(false);
      if (walkOpenRef.current) { sfx.stopHum(); setWalkOpen(false); }
    };
    const onResize = () => {
      const desktop = window.innerWidth >= 760;
      // constant per breakpoint — set here instead of every RAF frame
      if (spideyWrapRef.current) {
        spideyWrapRef.current.style.transform = `translateX(calc(-50% - ${desktop ? 11 : 0}vw - 10px))`;
      }
      if (mjWallRef.current) mjTopCache = mjWallRef.current.offsetTop;
      setIsDesktop((prev) => {
        if (desktop !== prev && !desktop) setMobileMenuOpen(false);
        return desktop;
      });
    };
    onResize();

    // audio unlock on first gesture
    const unlockAudio = () => sfx.ensure();
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    kickRAF();

    /* ---- walkthrough auto-open after the entrance finishes ---- */
    const walkInT = setTimeout(() => {
      // never yank the user out of a scroll: auto-open only while they are
      // still sitting on the hero with nothing else on screen
      if ((window.scrollY || 0) > (window.innerHeight || 800) * 0.5) return;
      if (modalOpen() || paging) return;
      setWalkOpen(true);
      sfx.play("open");
    }, entryMs + 1000);

    /* ---- canvases ---- */
    const globeInst = initGlobe(globeRef.current, { getTwinActive: () => twinModeRef.current });
    const particlesInst = initParticles(idParticlesRef.current);

    /* ---- scroll-triggered Marvel reveals ---- */
    let revealObs = null;
    const groups = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      groups.forEach((g) => g.classList.add("in"));
    } else {
      revealObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const el = en.target;
          if (en.isIntersecting && en.intersectionRatio > 0.4) {
            // add() is a no-op while already "in" — crossing the 1.0 threshold
            // right after 0.4 must not restart the animation mid-play. Leaving
            // (below) removes the class, which re-arms the replay on re-entry.
            el.classList.add("in");
          } else {
            el.classList.remove("in");
          }
        });
      }, { threshold: [0, 0.4, 1] });
      groups.forEach((g) => revealObs.observe(g));
    }
    revealObsRef.current = revealObs;

    /* ---- active-section scroll-spy (drives the nav highlight) ---- */
    let sectionObs = null;
    if ("IntersectionObserver" in window) {
      const ratios = new Map();
      sectionObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => ratios.set(en.target.getAttribute("data-page"), en.intersectionRatio));
        // a section can leave the DOM entirely (identity hides on login) — its
        // stale ratio must not keep winning the vote
        ratios.forEach((_, k) => { if (!document.querySelector(`[data-page="${k}"]`)) ratios.delete(k); });
        let best = null, bestR = 0;
        ratios.forEach((r, k) => { if (r > bestR) { bestR = r; best = k; } });
        if (best && bestR > 0.4) setActiveSection((prev) => (prev === best ? prev : best));
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      document.querySelectorAll("[data-page]").forEach((el) => sectionObs.observe(el));
    }
    sectionObsRef.current = sectionObs;

    /* ---- spidey swing-in + landing thump when the tracker section enters view ---- */
    let spideyObs = null;
    let spideyLandT = null;
    const spideyInitT = setTimeout(() => {
      const wrap = document.querySelector(".tracker-spidey");
      const sec = document.querySelector("section[data-page='tracker']");
      if (!wrap || !sec || !("IntersectionObserver" in window)) { if (wrap) wrap.classList.add("play"); return; }
      spideyObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.35) {
            wrap.classList.remove("play");
            void wrap.offsetWidth; // re-arm the swing-in animation
            wrap.classList.add("play");
            if (spideyLandT) clearTimeout(spideyLandT);
            spideyLandT = setTimeout(() => sfx.play("land"), 1950);
          } else {
            wrap.classList.remove("play");
          }
        });
      }, { threshold: [0, 0.35, 1] });
      spideyObs.observe(sec);
    }, 140);

    /* ---- full-section cinematic pager (desktop only; mobile scrolls natively) ---- */
    let pageIndex = 0, paging = false, gestureLive = false, wheelIdleTimer = null;
    const transStyle = "shutter";
    const pages = () => Array.from(document.querySelectorAll("[data-page]"));
    const modalOpen = () => trailerOpenRef.current || mobileMenuOpenRef.current || walkOpenRef.current || authOpenRef.current;
    // Pick the next section from the real scroll geometry, not the counter —
    // the counter goes stale if the scroll drifts while a popup is open or
    // after an anchor jump, and a stale counter blinks to the wrong section.
    const nextPageIdx = (dir) => {
      const list = pages();
      if (dir > 0) {
        for (let i = 0; i < list.length; i++) if (list[i].getBoundingClientRect().top > 8) return i;
        return -1;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].getBoundingClientRect().top < -8) return i;
      return -1;
    };
    // A gesture ends only after the wheel is idle for 350ms AND no transition is
    // running — a stray gap during the transition can't split one fling into two.
    const endGesture = () => {
      if (paging) { clearTimeout(wheelIdleTimer); wheelIdleTimer = setTimeout(endGesture, 200); return; }
      gestureLive = false;
    };

    const scrollTween = (target, dur, ease, cb) => {
      const startY = window.scrollY;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      const dist = targetY - startY;
      const t0 = performance.now();
      const stepFn = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        // behavior:"instant" — html has scroll-behavior:smooth, so a plain
        // scrollTo() would start its own smooth animation on every step
        window.scrollTo({ top: startY + dist * ease(p), behavior: "instant" });
        kickRAF();
        if (p < 1) requestAnimationFrame(stepFn);
        else if (cb) cb();
      };
      requestAnimationFrame(stepFn);
    };
    const scrollInstant = (target) => {
      // must actually be instant: with CSS smooth-scroll the page would still
      // be gliding when the shutter reopens
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
      kickRAF();
    };
    const revealPage = (el) => {
      if (reduceMotion || !el) return;
      const content = el.querySelector("[data-page-content]") || el;
      content.animate([
        { opacity: 0.15, transform: "translateY(36px) scale(0.99)", filter: "blur(5px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
      ], { duration: 640, delay: 40, easing: "cubic-bezier(.16,.84,.3,1)", fill: "backwards" });
    };
    const transDissolve = (target, done) => {
      revealPage(target);
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      scrollTween(target, 1050, ease, done);
    };
    const transCamera = (target, done) => {
      const content = target.querySelector("[data-page-content]") || target;
      content.animate([
        { transform: "perspective(1400px) rotateX(14deg) translateY(70px) scale(0.94)", opacity: 0.15, filter: "blur(9px)" },
        { transform: "perspective(1400px) rotateX(0deg) translateY(0) scale(1)", opacity: 1, filter: "blur(0)" },
      ], { duration: 950, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards" });
      const c1 = 1.20158, c3 = c1 + 1;
      const ease = (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      scrollTween(target, 780, ease, done);
    };
    const transShutter = (target, done) => {
      const t = barTopRef.current, b = barBottomRef.current;
      const closeMs = 180, openMs = 260; // snappy blink
      const cEase = "cubic-bezier(.5,0,.15,1)";
      if (t && b) {
        t.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: closeMs, easing: cEase, fill: "forwards" });
        b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: closeMs, easing: cEase, fill: "forwards" });
      }
      setTimeout(() => {
        scrollInstant(target);
        revealPage(target);
        if (t && b) {
          t.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: openMs, easing: cEase, fill: "forwards" });
          b.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: openMs, easing: cEase, fill: "forwards" });
        }
        setTimeout(done, openMs);
      }, closeMs + 30);
    };
    const transIris = (target, done) => {
      const ir = irisRef.current;
      const closeMs = 440, openMs = 580;
      const ease = "cubic-bezier(.7,0,.25,1)";
      if (ir) {
        ir.style.display = "block";
        ir.animate([{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)" }], { duration: closeMs, easing: ease, fill: "forwards" });
      }
      setTimeout(() => {
        scrollInstant(target);
        revealPage(target);
        if (ir) {
          const a = ir.animate([{ clipPath: "circle(150% at 50% 50%)" }, { clipPath: "circle(0% at 50% 50%)" }], { duration: openMs, easing: ease, fill: "forwards" });
          a.onfinish = () => { ir.style.display = "none"; };
        }
        setTimeout(done, openMs);
      }, closeMs + 30);
    };
    const transFlash = (target, done) => {
      const f = flashRef.current;
      if (f) f.animate([{ opacity: 0 }, { opacity: 0.92, offset: 0.35 }, { opacity: 0 }], { duration: 540, easing: "ease-out" });
      setTimeout(() => {
        scrollInstant(target);
        const c = target.querySelector("[data-page-content]") || target;
        c.animate([
          { transform: "scale(1.07)", filter: "blur(5px)", opacity: 0.4 },
          { transform: "scale(1)", filter: "blur(0)", opacity: 1 },
        ], { duration: 560, easing: "cubic-bezier(.16,.84,.3,1)", fill: "backwards" });
      }, 170);
      setTimeout(done, 600);
    };

    const goToPage = (idx) => {
      const list = pages();
      idx = Math.max(0, Math.min(list.length - 1, idx));
      const targetEl = list[idx];
      if (!targetEl) return;
      // mobile: no scroll hijack, but menu/rail navigation still blinks the
      // shutter like desktop (a long smooth scroll would fire the observer
      // blink several times on the way down)
      if (!isDesktopRef.current) {
        pageIndex = idx;
        if (reduceMotion) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          mobileBlinkBusyRef.current = true;
          transShutter(targetEl, () => { mobileBlinkBusyRef.current = false; });
        }
        return;
      }
      // already on this section AND actually aligned to it — no transition/blink.
      // (if the scroll sits between sections, the "same" index still needs a snap)
      if (idx === pageIndex && Math.abs(targetEl.getBoundingClientRect().top) < 8) return;
      if (paging) return;
      paging = true;
      pageIndex = idx;
      const done = () => setTimeout(() => {
        paging = false;
        // re-arm the idle window from the end of the transition, so the gesture
        // only ends after a real pause once the blink has finished.
        clearTimeout(wheelIdleTimer);
        wheelIdleTimer = setTimeout(endGesture, 350);
      }, 60);
      const style = reduceMotion ? "dissolve" : transStyle;
      if (style === "camera") transCamera(targetEl, done);
      else if (style === "shutter") transShutter(targetEl, done);
      else if (style === "iris") transIris(targetEl, done);
      else if (style === "flash") transFlash(targetEl, done);
      else transDissolve(targetEl, done);
    };
    goToPageRef.current = goToPage;

    const onWheel = (ev) => {
      if (!isDesktopRef.current) return; // mobile scrolls natively
      if (modalOpen()) return;
      ev.preventDefault();
      // One physical gesture = exactly one section, no matter how hard/far.
      // Every wheel event keeps the gesture "alive"; a trackpad fling's inertial
      // stream (and the transition) stay part of the same gesture. The gesture
      // only ends once the wheel has been idle for 350ms — then the next event
      // starts a fresh gesture and advances again.
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = setTimeout(endGesture, 350);
      if (gestureLive || paging || !ev.deltaY) return;
      gestureLive = true;
      const nxt = nextPageIdx(ev.deltaY > 0 ? 1 : -1);
      if (nxt >= 0) goToPage(nxt); // -1: nothing above the first / below the last
    };
    const onPagerKey = (ev) => {
      if (!isDesktopRef.current || modalOpen() || paging) return;
      if (["ArrowDown", "PageDown"].includes(ev.key)) { ev.preventDefault(); const n = nextPageIdx(1); if (n >= 0) goToPage(n); }
      else if (["ArrowUp", "PageUp"].includes(ev.key)) { ev.preventDefault(); const n = nextPageIdx(-1); if (n >= 0) goToPage(n); }
    };
    let touchStartY = null;
    const onTouchStart = (ev) => { if (isDesktopRef.current) touchStartY = ev.touches[0].clientY; };
    const onTouchMove = (ev) => { if (isDesktopRef.current && !modalOpen()) ev.preventDefault(); };
    const onTouchEnd = (ev) => {
      if (!isDesktopRef.current || modalOpen() || paging || touchStartY == null) return;
      const endY = (ev.changedTouches && ev.changedTouches[0].clientY) || touchStartY;
      const diff = touchStartY - endY;
      if (Math.abs(diff) > 50) { const n = nextPageIdx(diff > 0 ? 1 : -1); if (n >= 0) goToPage(n); }
      touchStartY = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onPagerKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    /* ---- typewriter placeholder for the MJ message field ---- */
    const twFull = "Write your message to MJ...";
    let twI = 0, twDir = 1, twDelay = 600, twTimer = null;
    const twTick = () => {
      const el = document.getElementById("mj-textarea");
      if (el) {
        if (el.value && el.value.length) {
          el.setAttribute("placeholder", "");
        } else {
          twI += twDir;
          if (twI >= twFull.length) { twI = twFull.length; twDir = -1; twDelay = 2000; }
          else if (twI <= 0) { twI = 0; twDir = 1; twDelay = 1000; }
          else { twDelay = twDir > 0 ? 70 : 34; }
          const atFull = twI >= twFull.length;
          el.setAttribute("placeholder", twFull.slice(0, twI) + (twDir > 0 || atFull ? "▌" : ""));
        }
      }
      twTimer = setTimeout(twTick, twDelay || 400);
    };
    twTimer = setTimeout(twTick, 900);

    /* ---- cleanup ---- */
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onPagerKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(walkInT);
      clearTimeout(wheelIdleTimer);
      clearTimeout(twTimer);
      if (revealObs) revealObs.disconnect();
      if (sectionObs) sectionObs.disconnect();
      if (spideyObs) spideyObs.disconnect();
      clearTimeout(spideyInitT);
      if (spideyLandT) clearTimeout(spideyLandT);
      globeInst.destroy();
      particlesInst.destroy();
      sfx.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ambient hum follows the walkthrough open state (from componentDidUpdate) */
  useEffect(() => {
    if (!sfxRef.current) return;
    if (walkOpen) sfxRef.current.startHum();
    else sfxRef.current.stopHum();
  }, [walkOpen]);

  /* the identity section mounts/unmounts with the session — observe any fresh
     [data-reveal]/[data-page] nodes (observe() is a no-op on ones already
     tracked) and re-measure the cached section offsets */
  useEffect(() => {
    document.querySelectorAll("[data-reveal]").forEach((el) => revealObsRef.current && revealObsRef.current.observe(el));
    document.querySelectorAll("[data-page]").forEach((el) => sectionObsRef.current && sectionObsRef.current.observe(el));
    window.dispatchEvent(new Event("resize"));
  }, [hideIdentity]);

  /* the Living Web keeps its revealed (twin) state once the user opens it */
  useEffect(() => {
    try { if (localStorage.getItem("bnd_twins_revealed") === "1") setTwinMode(true); } catch {}
  }, []);

  /* mobile: play the film-shutter blink when a swipe lands on a new section —
     desktop's blink comes from the wheel pager, which is off on phones */
  const prevSectionRef = useRef("hero");
  useEffect(() => {
    if (prevSectionRef.current === activeSection) return;
    prevSectionRef.current = activeSection;
    if (isDesktopRef.current || mobileBlinkBusyRef.current) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = barTopRef.current, b = barBottomRef.current;
    if (!t || !b) return;
    mobileBlinkBusyRef.current = true;
    const closeMs = 140, openMs = 220; // a touch quicker than desktop — no scroll jump under it
    const cEase = "cubic-bezier(.5,0,.15,1)";
    [t, b].forEach((el) => el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: closeMs, easing: cEase, fill: "forwards" }));
    // no effect cleanup on these timers — cancelling the reopen mid-blink
    // (e.g. two quick section changes) would leave the shutter closed
    setTimeout(() => {
      [t, b].forEach((el) => el.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: openMs, easing: cEase, fill: "forwards" }));
      setTimeout(() => { mobileBlinkBusyRef.current = false; }, openMs);
    }, closeMs + 20);
  }, [activeSection]);

  /* lock the page scroll while any popup is up — otherwise the page drifts
     to a halfway point behind the popup and the pager blinks oddly after it
     closes (popups keep their own internal scrolling) */
  useEffect(() => {
    const lock = walkOpen || trailerOpen || mobileMenuOpen || authOpen;
    document.documentElement.style.overflow = lock ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [walkOpen, trailerOpen, mobileMenuOpen, authOpen]);

  /* live data: Living Web stats */
  useEffect(() => {
    let cancelled = false;
    portalApi("/stats")
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ---------------------------------------------------------- derived / handlers */
  const goToForm = () => {
    if (user) {
      router.push(user.needsQuiz ? "/quiz" : "/forum");
      return;
    }
    openAuth("register"); // register/login popup
  };
  // Section indices shift when the identity section is hidden — always resolve
  // a section by its data-page key, never a hardcoded index.
  const goToSection = (key) => {
    const list = Array.from(document.querySelectorAll("[data-page]"));
    const idx = list.findIndex((el) => el.getAttribute("data-page") === key);
    if (idx >= 0) goToPageRef.current(idx);
  };
  const doNav = (action) => {
    if (action === "trailer") setTrailerOpen(true);
    else if (action === "mjwall") router.push("/mj-wall"); // MJ Wall detail page
    else if (action === "tracker") goToSection("tracker"); // Spidey Tracker section
    else router.push("/forum");
  };

  const onMjSubmit = async () => {
    if (!mjMessage.trim()) { mjInputRef.current && mjInputRef.current.focus(); return; }
    if (!user) { openAuth("login"); return; }
    if (mjSending) return;
    setMjSending(true);
    setMjError("");
    try {
      await portalApi("/mj-wall/messages", { method: "POST", body: { body: mjMessage } });
      setMjSent(true);
      sfxRef.current && sfxRef.current.play("click");
      // no local handoff to the wall page — the message is pending moderation
      // and must not show on the wall until an admin approves it
      setTimeout(() => router.push("/mj-wall"), 1400);
    } catch (err) {
      if (err.code === "quiz_required") { window.location.href = "/quiz"; return; }
      setMjError(err.message || "Couldn't send your message. Try again.");
    } finally {
      setMjSending(false);
    }
  };

  // Living Web numbers — the hardcoded copy stays as the loading fallback.
  let webWho = "12,480 Dreamers";
  let webWhere = "34 countries";
  if (stats) {
    if (user?.avatar) {
      const entry = Array.isArray(stats.identities)
        ? stats.identities.find((it) => it.slug === user.avatar.slug)
        : null;
      const identityMembers = entry?.members ?? stats.members;
      webWho = `${fmtCount(identityMembers)} ${user.avatar.name}s`;
    } else {
      webWho = `${fmtCount(stats.members)} members`;
    }
    webWhere = `${stats.countries ?? 0} countries`;
  }
  // Which section (if any) each nav item corresponds to — drives the active highlight.
  const navSections = [null, "mjwall", null, "tracker"];
  const navItems = ["TRAILER", "MJ WALL", "FORUM", "SPIDEY TRACKER"].map((label, i) => {
    const action = ["trailer", "mjwall", "forum", "tracker"][i];
    const active = !!navSections[i] && navSections[i] === activeSection;
    return {
      label, locked: false, active,
      color: active ? "#ff5a6a" : "#fff", cursor: "pointer", title: "",
      onClick: (e) => { e.preventDefault(); doNav(action); },
      onMobileClick: (e) => { e.preventDefault(); setMobileMenuOpen(false); doNav(action); },
    };
  });

  const walkVis = {
    scrim: walkOpen ? "0.78" : "0",
    blur: walkOpen ? "10px" : "0px",
    pe: walkOpen ? "auto" : "none",
    // fully hide once the close transition ends — an invisible fixed overlay
    // with backdrop-filter still costs every scrolled frame
    vis: walkOpen ? "visible" : "hidden",
    visDelay: walkOpen ? "0s" : "1500ms",
    opacity: walkOpen ? "1" : "0",
    transform: walkOpen
      ? "perspective(1600px) rotateX(0deg) translateY(0) scale(1)"
      : "perspective(1600px) rotateX(22deg) translateY(90px) scale(0.72)",
    filter: walkOpen ? "blur(0)" : "blur(14px)",
  };
  const walkItems = WALK_ITEMS.map((w, i) => ({ ...w, delay: (walkOpen ? 620 + i * 150 : 0) + "ms" }));

  const spideyWidth = isDesktop ? "clamp(300px, 32vw, 560px)" : "62vw";
  const logoWidth = isDesktop ? "min(720px, 42vw)" : "82vw";
  const railSections = hideIdentity ? RAIL_SECTIONS.filter((sec) => sec.key !== "identity") : RAIL_SECTIONS;
  const railIdx = Math.max(0, railSections.findIndex((sec) => sec.key === activeSection));

  const onWalkHover = () => sfxRef.current && sfxRef.current.play("hover");

  return (
    <div ref={stageRef} style={s("position: relative; width: 100%; min-height: 100vh; background: #0a0a0c; overflow-x: hidden;")}>

      {/* ================= HERO ================= */}
      <div data-page="hero" style={s("position: relative; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always;")}>
        {/* BG LAYER */}
        <div ref={bgRef} style={s("position: absolute; inset: 0; z-index: 1; will-change: transform; transform-origin: 50% 15%;")}>
          <Image src="/assets/bg.jpg" alt="" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "50% 0%", userSelect: "none", pointerEvents: "none" }} />
        </div>

        {/* SUN GLOW */}
        <div style={s("position: absolute; top: 4%; left: 19%; width: 520px; height: 520px; z-index: 2; border-radius: 50%; background: radial-gradient(circle, rgba(255,236,200,0.55) 0%, rgba(255,180,90,0.15) 40%, transparent 70%); filter: blur(8px); animation: bnd-glow-breath 4500ms ease-in-out infinite; pointer-events: none;")}></div>

        {/* WEB OVERLAY */}
        <div style={s("position: absolute; top: clamp(40px, 5vh, 70px); left: 50%; transform: translateX(calc(-50% - 13vw)); width: min(1216px, 63vw); z-index: 20; pointer-events: none;")}>
          <img src="/assets/web.png" alt="" style={s("width: 100%; height: auto; display: block; filter: blur(1.6px); opacity: 0.65; animation: bnd-spidey-bob 5s ease-in-out infinite; animation-delay: -1s;")} />
        </div>

        {/* SPIDEY */}
        <div ref={spideyWrapRef} style={s("position: absolute; top: clamp(105px, 12vh, 165px); left: 50%; z-index: 15; pointer-events: none; transform: translateX(calc(-50% - 11vw - 10px));")}>
          <div style={s(`position: relative; width: ${spideyWidth}; aspect-ratio: 588/600; will-change: transform; animation: bnd-spidey-bob 5s ease-in-out infinite; animation-delay: -1s;`)}>
            <img src="/assets/spiderman.png" alt="Spider-Man" style={s("width: 100%; height: 100%; display: block; filter: drop-shadow(0 30px 50px rgba(0,0,0,0.55)) drop-shadow(0 8px 18px rgba(255,120,40,0.18));")} />
          </div>
        </div>

        {/* HERO TYPE STACK (logo) */}
        <div ref={heroStackRef} style={s("position: absolute; left: 0; right: 0; bottom: clamp(40px, 7vh, 96px); z-index: 10; display: flex; flex-direction: column; align-items: center; pointer-events: none; will-change: transform;")}>
          <div style={s("position: relative; z-index: 1; width: 100%; display: flex; justify-content: center;")}>
            <div ref={logoRef} style={s(`position: relative; width: ${logoWidth}; will-change: transform; animation: bnd-logo-punch 1200ms 750ms cubic-bezier(.16,.84,.3,1) both;`)}>
              <img src="/assets/logo.png" alt="Spider-Man: Brand New Day" style={s("width: 100%; height: auto; display: block; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(214,2,26,0.25));")} />
            </div>
          </div>
        </div>
      </div>

      {/* ================= FIND YOUR IDENTITY ================= */}
      {!hideIdentity && (
      <section data-page="identity" data-screen-label="Find Your Identity" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a0512; background-image: url('/assets/identity-bg.jpg'); background-size: auto 100%; background-position: center; background-repeat: no-repeat; display: flex; align-items: center; justify-content: center;")}>
        <div style={s("position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,4,14,0.55) 0%, rgba(8,4,14,0.12) 30%, rgba(6,4,12,0.35) 62%, rgba(4,3,8,0.88) 100%); pointer-events: none;")}></div>
        <div style={s("position: absolute; top: 0; left: 0; right: 0; height: 46px; background: linear-gradient(180deg, #000 0%, transparent 100%); opacity: 0.85; pointer-events: none; z-index: 4;")}></div>
        <div style={s("position: absolute; bottom: 0; left: 0; right: 0; height: 46px; background: linear-gradient(0deg, #000 0%, transparent 100%); opacity: 0.7; pointer-events: none; z-index: 4;")}></div>

        <canvas ref={idParticlesRef} style={s("position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.55;")}></canvas>

        {/* AAA HUD frame */}
        <div style={s("position: absolute; top: clamp(120px, 20vh, 210px); left: 50%; transform: translateX(-50%); width: min(680px, 82vw); bottom: clamp(120px, 20vh, 200px); pointer-events: none; z-index: 5;")}>
          <span style={s("position: absolute; top: 0; left: 0; width: 38px; height: 38px; border-top: 2px solid rgba(255,60,74,0.7); border-left: 2px solid rgba(255,60,74,0.7);")}></span>
          <span style={s("position: absolute; top: 0; right: 0; width: 38px; height: 38px; border-top: 2px solid rgba(120,160,255,0.6); border-right: 2px solid rgba(120,160,255,0.6);")}></span>
          <span style={s("position: absolute; bottom: 0; left: 0; width: 38px; height: 38px; border-bottom: 2px solid rgba(120,160,255,0.6); border-left: 2px solid rgba(120,160,255,0.6);")}></span>
          <span style={s("position: absolute; bottom: 0; right: 0; width: 38px; height: 38px; border-bottom: 2px solid rgba(255,60,74,0.7); border-right: 2px solid rgba(255,60,74,0.7);")}></span>
          <span style={s("position: absolute; top: 8px; right: 8px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(120,160,255,0.8); text-align: right;")}>Identity Scan // Active</span>
          {/* full-height track carries the scan travel as a transform (composited);
              the 2px line keeps only the glitch — animating `top` re-laid-out every frame */}
          <div style={s("position: absolute; inset: 0; will-change: transform; animation: bnd-id-scan 5.5s cubic-bezier(.5,0,.5,1) infinite;")}>
            <span style={s("position: absolute; left: 0; right: 0; height: 2px; top: 0; background: linear-gradient(90deg, transparent, rgba(255,60,74,0.9), rgba(120,160,255,0.7), transparent); box-shadow: 0 0 18px rgba(255,60,74,0.6); animation: bnd-id-glitch 0.22s steps(2) infinite;")}></span>
          </div>
        </div>

        <div data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 6; width: 100%; max-width: 1000px; padding: 0 clamp(24px, 6vw, 80px); display: flex; flex-direction: column; align-items: center; text-align: center;")}>
          <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 12px; margin-bottom: clamp(14px, 2.2vh, 22px);")}>
            <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-size: clamp(10px, 1.2vw, 12px); letter-spacing: 0.42em; text-transform: uppercase; color: #ff6b79;")}>Your Story Begins</span>
            <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
          </div>
          <h2 className="bnd-head" style={s("animation-delay: 190ms; margin: 0; font-size: clamp(30px, 5.2vw, 70px); line-height: 0.94; font-weight: 500; letter-spacing: 0.005em; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22); text-wrap: balance;")}>Who Are You <span style={{ color: "#ff2f40" }}>Under the Mask?</span></h2>
          <p className="bnd-line" style={s("animation-delay: 430ms; margin: clamp(14px, 2.4vh, 22px) auto clamp(26px, 4vh, 40px); max-width: 560px; font-size: clamp(13px, 1.35vw, 16px); line-height: 1.6; color: rgba(232,232,244,0.82); text-shadow: 0 2px 12px rgba(0,0,0,0.7); text-wrap: pretty;")}>Every Spider-Man carries something different. Answer a few questions and discover the identity that has always been yours.</p>
          <button onClick={() => { sfxRef.current && sfxRef.current.play("click"); goToForm(); }} onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-cta bnd-line" style={s("animation-delay: 590ms; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); box-shadow: 0 14px 36px rgba(214,2,26,0.4);")}>
              <span className="bnd-cta-inner" style={s("display: block; padding: 14px 38px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); color: #fff; font-family: 'Oswald', 'Acumin Pro', sans-serif; font-weight: 500; font-size: clamp(13px, 1.4vw, 15px); letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.4);")}><span className="bnd-cta-sheen"></span>Reveal My Identity</span>
            </span>
          </button>
          <div className="bnd-line" style={s("animation-delay: 700ms; margin-top: clamp(14px, 2.2vh, 20px); display: inline-flex; align-items: center; gap: 7px; font-size: clamp(9px, 1vw, 11px); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(226,226,240,0.5);")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
            Takes less than a minute
          </div>
        </div>
      </section>
      )}

      {/* ================= THE LIVING WEB ================= */}
      <section data-page="livingweb" data-screen-label="The Living Web" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background: radial-gradient(120% 100% at 50% 26%, #0b1226 0%, #070711 55%, #040409 100%);")}>
        <div style={s("position: absolute; top: 12%; bottom: 12%; left: 45%; transform: translateX(-50%); width: 84%; z-index: 1;")}>
          <canvas ref={globeRef} style={s("position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.95; pointer-events: none;")}></canvas>
        </div>
        <div style={s("position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,4,9,0.9) 0%, rgba(4,4,9,0.35) 26%, transparent 42%, transparent 60%, rgba(4,4,9,0.4) 78%, rgba(4,4,9,0.86) 100%); pointer-events: none;")}></div>
        <div style={s("position: absolute; inset: 0; background: linear-gradient(180deg, rgba(4,4,9,0.5) 0%, transparent 20%, transparent 62%, rgba(4,4,9,0.9) 100%); pointer-events: none;")}></div>

        {/* city marker chips */}
        <div style={s("position: absolute; top: 12%; bottom: 12%; left: 45%; transform: translateX(-50%); width: 84%; z-index: 3; pointer-events: none;")}>
          {MAP_CHIPS.map((c, i) => (
            <div key={i} style={s(`position: absolute; left: ${c.x}; top: ${c.y}; transform: translate(-50%, -50%); pointer-events: none;`)}>
              {c.labeled ? (
                <div style={s("display: inline-flex; align-items: center; gap: 8px; padding: 6px 11px; border-radius: 9px; background: rgba(10,12,24,0.82); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 6px 18px rgba(0,0,0,0.5); backdrop-filter: blur(4px); white-space: nowrap;")}>
                  <span style={s("flex-shrink: 0; width: 22px; height: 15px; border-radius: 2px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,0.15);")}><Flag code={c.flagCode} /></span>
                  <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #fff;")}>{c.country}</span>
                </div>
              ) : (
                <span title={c.city} style={s("display: block; width: 11px; height: 11px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #ff7280, #d6021a); box-shadow: 0 0 10px 3px rgba(255,60,74,0.65), 0 0 0 1px rgba(255,255,255,0.2);")}></span>
              )}
            </div>
          ))}
        </div>

        {!twinMode && (
          <>
            {/* centered header */}
            <div data-page-content data-reveal className="bnd-reveal" style={s("position: absolute; left: 0; right: 0; bottom: clamp(52px, 9vh, 96px); z-index: 6; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 24px;")}>
              <h2 className="bnd-head" style={s("animation-delay: 120ms; margin: 0; font-family: 'Oswald', sans-serif; font-style: italic; font-size: clamp(22px, 3.4vw, 46px); line-height: 1; font-weight: 600; letter-spacing: 0.01em; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6); white-space: nowrap;")}>The Web grows a little <span style={{ color: "#ff2f40" }}>every second.</span></h2>
              <p className="bnd-line" style={s("animation-delay: 310ms; margin: 12px 0 0; font-size: clamp(11px, 1.3vw, 15px); line-height: 1.5; color: rgba(226,226,240,0.72); white-space: nowrap;")}>While you were finding your identity, thousands of others were finding theirs too.</p>
              <button className="bnd-line bnd-cta" onClick={() => { sfxRef.current && sfxRef.current.play("click"); setTwinMode(true); try { localStorage.setItem("bnd_twins_revealed", "1"); } catch {} }} onMouseEnter={onWalkHover} data-web-hover="true" style={s("animation-delay: 460ms; margin-top: clamp(16px, 2.4vh, 24px); border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
                <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                  <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 30px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: clamp(12px, 1.3vw, 14px); letter-spacing: 0.18em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Find your Web Twins <span style={{ fontSize: "15px" }}>→</span></span>
                </span>
              </button>
            </div>
          </>
        )}

        {/* TWIN MODE */}
        {twinMode && (
          <div className="bnd-reveal in" style={s("position: absolute; inset: 0; z-index: 7; box-sizing: border-box; padding: clamp(84px, 13vh, 128px) clamp(24px, 5vw, 70px) clamp(34px, 6vh, 60px); display: flex; flex-direction: column;")}>
            <button onClick={() => setTwinMode(false)} data-web-hover="true" style={s("position: absolute; top: clamp(84px, 12vh, 118px); left: clamp(24px, 5vw, 70px); display: inline-flex; align-items: center; gap: 8px; background: transparent; border: 0; color: rgba(255,255,255,0.7); font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;")}>‹ Back to the Web</button>

            <div style={s("text-align: center; margin-bottom: clamp(18px, 3vh, 34px);")}>
              <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px;")}>
                <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Your Web Twin</span>
                <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff2f40, transparent);")}></span>
              </div>
              <h2 className="bnd-head" style={s("animation-delay: 170ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 4.6vw, 60px); line-height: 0.96; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6);")}>You're a <span style={{ color: "#ff2f40" }}>Dreamer</span></h2>
              <p className="bnd-line" style={s("animation-delay: 340ms; margin: 12px auto 0; max-width: 600px; font-size: clamp(13px, 1.4vw, 16px); line-height: 1.6; color: rgba(226,226,240,0.75); text-wrap: pretty;")}>You share your identity with <span style={{ color: "#fff", fontWeight: 600 }}>{webWho}</span> across <span style={{ color: "#ffd23f", fontWeight: 600 }}>{webWhere}</span>. Here are a few of your Web Twins.</p>
            </div>

            <div style={s("flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;")}>
              <div style={s("display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(12px, 1.4vw, 18px); width: min(1080px, 100%);")}>
                {WEB_TWINS.map((tw, i) => (
                  <div key={i} className="bnd-line bnd-card twin-card" data-web-hover="true" style={s(`animation-delay: ${tw.delay}; position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.3), rgba(255,40,60,0.32)); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); transition: transform 380ms cubic-bezier(.16,.84,.3,1), box-shadow 380ms ease, background 380ms ease;`)}>
                    <div className="bnd-card-body" style={s("height: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 15px; padding: clamp(14px, 1.9vh, 20px) clamp(15px, 1.5vw, 20px); background: linear-gradient(150deg, rgba(16,20,38,0.95), rgba(9,10,20,0.96)); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); transition: background 380ms ease;")}>
                      <div style={s("flex-shrink: 0; position: relative; width: clamp(52px, 6vw, 64px); height: clamp(52px, 6vw, 64px); border-radius: 14px; background: radial-gradient(circle at 40% 32%, #2a1420, #0c0a16); border: 1px solid rgba(255,60,74,0.4); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 18px rgba(0,0,0,0.6), 0 0 16px rgba(255,40,60,0.2);")}>
                        <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }} fill="none" stroke={tw.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="50" cy="44" rx="9" ry="12" /><path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" /></svg>
                        <span style={s("position: absolute; bottom: -5px; right: -5px; width: 20px; height: 14px; border-radius: 3px; overflow: hidden; box-shadow: 0 0 0 1.5px #0c0a16;")}><Flag code={tw.flag} /></span>
                      </div>
                      <div style={s("min-width: 0; line-height: 1.25;")}>
                        <div style={s("font-family: 'Oswald', sans-serif; font-size: clamp(15px, 1.6vw, 18px); font-weight: 500; color: #fff; letter-spacing: 0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>{tw.name}</div>
                        <div style={s("font-size: 11.5px; color: rgba(226,226,240,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>{tw.city}</div>
                        <div style={s("margin-top: 7px; display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; background: rgba(255,40,60,0.12); border: 1px solid rgba(255,60,74,0.35);")}>
                          <span style={s(`width: 5px; height: 5px; border-radius: 50%; background: ${tw.color}; box-shadow: 0 0 6px ${tw.color};`)}></span>
                          <span style={s("font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #ff8a96;")}>{tw.identity}</span>
                        </div>
                        <div className="tw-reveal" style={s("margin-top: 8px; display: flex; align-items: center; gap: 6px; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #8ab4ff;")}>View Web Twin <span style={{ fontSize: "13px" }}>›</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================= MJ WALL ================= */}
      <section ref={mjWallRef} id="mj-wall-section" data-page="mjwall" data-screen-label="MJ Wall" style={s("position: relative; z-index: 22; min-height: 100vh; height: 100vh; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a1430; background-image: url('/assets/mj-bg.jpg'); background-size: cover; background-position: center; display: flex; align-items: center; overflow: hidden;")}>
        <div id="mj-scrim" style={s("position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,10,26,0) 35%, rgba(8,10,26,0.45) 62%, rgba(8,10,26,0.72) 100%); pointer-events: none;")}></div>

        <div ref={mjHeaderRef} id="mj-inner" data-page-content style={s("position: relative; width: 100%; max-width: 1320px; margin: 0 auto; padding: clamp(60px, 10vh, 130px) clamp(24px, 6vw, 96px); display: flex; justify-content: flex-end; will-change: transform;")}>
          <div data-reveal className="bnd-reveal" id="mj-prompt" style={s("width: min(520px, 100%);")}>
            <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 12px; margin-bottom: 18px;")}>
              <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff1f33, transparent);")}></span>
              <span style={s("font-size: 12px; letter-spacing: 0.36em; text-transform: uppercase; color: #ff5a6a;")}>The MJ Wall</span>
            </div>
            <h2 className="bnd-head" style={s("animation-delay: 180ms; margin: 0; font-size: clamp(30px, 4.4vw, 56px); line-height: 1.02; font-weight: 700; letter-spacing: -0.01em; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); text-wrap: balance;")}>MJ forgot the best part of her story. <span style={{ color: "#ff4655" }}>Let's remind her!</span></h2>
            <p className="bnd-line" style={s("animation-delay: 410ms; margin: 18px 0 0; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(255,255,255,0.82); text-shadow: 0 2px 10px rgba(0,0,0,0.6); text-wrap: pretty;")}>If you could remind MJ of one thing about Peter, what would it be?</p>

            {mjSent ? (
              <div style={s("margin-top: 28px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: bnd-word-rise 500ms cubic-bezier(.2,.7,.2,1) both;")}>
                <div style={s("display: inline-flex; align-items: center; gap: 12px; font-size: clamp(20px, 2.4vw, 28px); font-weight: 700; color: #fff;")}>
                  <span style={s("width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 20px;")}>✓</span>
                  Sent!
                </div>
                <p style={s("margin: 0; font-size: 14px; color: rgba(255,255,255,0.72); text-shadow: 0 2px 8px rgba(0,0,0,0.6);")}>Your memory joins the wall once approved.</p>
                <button onClick={() => { setMjSent(false); setMjMessage(""); setTimeout(() => mjInputRef.current && mjInputRef.current.focus(), 60); }} style={s("background: transparent; border: 0; color: #ff5a6a; font: inherit; letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; cursor: pointer; padding: 4px 0;")}>Write another ›</button>
              </div>
            ) : (
              <div style={s("margin-top: 28px;")}>
                <div style={s("position: relative; padding: 3px; background: linear-gradient(180deg, #ff3a4a 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);")}>
                  <textarea
                    ref={mjInputRef}
                    id="mj-textarea"
                    value={mjMessage}
                    onChange={(e) => setMjMessage(e.target.value.slice(0, 280))}
                    maxLength={280}
                    rows={4}
                    style={s("display: block; width: 100%; box-sizing: border-box; resize: none; padding: 18px 22px; border: 0; outline: 0; background: #060e2a; color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.7), 0 0 18px rgba(255,255,255,0.35); font-family: inherit; font-size: 15px; line-height: 1.5; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}
                  ></textarea>
                </div>
                <div style={s("margin-top: 20px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap;")}>
                  <button onClick={onMjSubmit} disabled={mjSending} style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${mjSending ? "default" : "pointer"}; opacity: ${mjSending ? "0.7" : "1"}; font-family: inherit;`)}>
                    <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #1f4cd6 0%, #0b2a8a 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 10px 28px rgba(0,0,0,0.4);")}>
                      <span style={s("display: block; padding: 15px 34px; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #6b2a00; font-weight: 700; font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,0.35);")}>Add to the wall</span>
                    </span>
                  </button>
                  <Link href="/mj-wall" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.85); text-decoration: none; text-shadow: 0 2px 8px rgba(0,0,0,0.6); transition: color 200ms ease;")}>View all messages <span style={{ fontSize: "15px" }}>›</span></Link>
                </div>
                {mjError && <p style={s("font-size: 12px; color: #ff6b79; margin-top: 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.6);")}>{mjError}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= SPIDER-VERSE FEED ================= */}
      <section data-page="feed" data-screen-label="Spider-Verse Feed" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #050308; background-image: radial-gradient(90% 90% at 50% 52%, rgba(5,3,8,0.35) 0%, rgba(5,3,8,0.7) 55%, rgba(4,2,6,0.9) 100%), url('/assets/forum-bg.jpg'); background-size: cover, cover; background-position: center, center; display: flex;")}>
        <img src="/assets/web.png" alt="" style={s("position: absolute; top: -10%; left: -8%; width: min(680px, 46vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />

        {/* Marvel-style ambient FX layer */}
        <div style={s("position: absolute; inset: 0; z-index: 2; overflow: hidden; pointer-events: none;")}>
          {/* pulsing red energy blooms */}
          <div style={s("position: absolute; top: 22%; right: 14%; width: 40vw; height: 40vw; border-radius: 50%; background: radial-gradient(circle, rgba(214,2,26,0.28) 0%, rgba(214,2,26,0.06) 42%, transparent 70%); filter: blur(10px); animation: bnd-forum-glow 6s ease-in-out infinite;")}></div>
          <div style={s("position: absolute; bottom: 8%; left: 16%; width: 30vw; height: 30vw; border-radius: 50%; background: radial-gradient(circle, rgba(31,76,214,0.2) 0%, rgba(31,76,214,0.05) 45%, transparent 70%); filter: blur(12px); animation: bnd-forum-glow 7.5s ease-in-out infinite 1.5s;")}></div>
          {/* drifting energy motes */}
          <span style={s("position: absolute; left: 18%; bottom: 20%; width: 4px; height: 4px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 10px 2px rgba(255,60,74,0.7); animation: bnd-mote 7s ease-in-out infinite;")}></span>
          <span style={s("position: absolute; left: 34%; bottom: 12%; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px 2px rgba(255,255,255,0.6); animation: bnd-mote 9s ease-in-out infinite 1.2s;")}></span>
          <span style={s("position: absolute; left: 52%; bottom: 26%; width: 5px; height: 5px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 12px 3px rgba(255,60,74,0.7); animation: bnd-mote 8s ease-in-out infinite 2.4s;")}></span>
          <span style={s("position: absolute; left: 68%; bottom: 16%; width: 3px; height: 3px; border-radius: 50%; background: #9db4ff; box-shadow: 0 0 9px 2px rgba(120,150,255,0.7); animation: bnd-mote 10s ease-in-out infinite 0.6s;")}></span>
          <span style={s("position: absolute; left: 80%; bottom: 30%; width: 4px; height: 4px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px 2px rgba(255,255,255,0.6); animation: bnd-mote 8.5s ease-in-out infinite 3s;")}></span>
          <span style={s("position: absolute; left: 26%; bottom: 8%; width: 3px; height: 3px; border-radius: 50%; background: #ff5a6a; box-shadow: 0 0 9px 2px rgba(255,60,74,0.6); animation: bnd-mote 11s ease-in-out infinite 4s;")}></span>
          {/* slow scan sheen */}
          <div style={s("position: absolute; left: 0; right: 0; top: 0; height: 34%; background: linear-gradient(180deg, transparent, rgba(120,150,255,0.06), transparent); mix-blend-mode: screen; animation: bnd-forum-scan 9s ease-in-out infinite;")}></div>
        </div>

        <div data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 4; width: 100%; max-width: 820px; margin: 0 auto; box-sizing: border-box; padding: clamp(78px, 12vh, 118px) clamp(24px, 5vw, 80px); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 0;")}>
          <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 16px;")}>
            <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Spider-Verse Feed</span>
            <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff2f40, transparent);")}></span>
          </div>
          <h2 className="bnd-head" style={s("animation-delay: 170ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 5vw, 66px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6);")}>This is what the Web <span style={{ color: "#ff2f40" }}>actually looks like.</span></h2>
          <p className="bnd-line" style={s("animation-delay: 340ms; margin: 18px auto 0; max-width: 600px; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(226,226,240,0.74); text-wrap: pretty;")}>Real people, real identities, real stories — an entire community living under the mask. Step inside and add your voice.</p>
          <Link href="/forum" data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 470ms; margin-top: clamp(28px, 4.5vh, 44px); text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
              <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 12px; padding: 16px 44px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Enter the Forum <span style={{ fontSize: "17px" }}>→</span></span>
            </span>
          </Link>
        </div>
      </section>

      {/* ================= SPIDEY TRACKER ================= */}
      <section data-page="tracker" data-screen-label="Spidey Tracker" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a1330; background-image: radial-gradient(120% 100% at 22% 30%, rgba(6,10,22,0.35) 0%, rgba(5,8,20,0.72) 60%, rgba(4,6,14,0.9) 100%), url('/assets/tracker-map-bg.jpg'); background-size: cover, cover; background-position: center, center; display: flex; align-items: center;")}>
        <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -14%; right: -8%; width: min(640px, 42vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />
        <div data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 4; width: 100%; max-width: 1280px; margin: 0 auto; box-sizing: border-box; padding: clamp(78px, 12vh, 120px) clamp(24px, 5vw, 80px) clamp(40px, 7vh, 70px); display: flex; align-items: center; justify-content: space-between; gap: clamp(30px, 5vw, 70px); flex-wrap: wrap;")}>
          <div style={s("flex: 1; min-width: 300px; max-width: 560px;")}>
            <img src="/assets/tracker-logo.png" alt="Spidey Tracker" className="bnd-line" style={s("animation-delay: 70ms; display: block; width: clamp(240px, 26vw, 360px); height: auto; margin-bottom: 22px; filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));")} />
            <h2 className="bnd-head" style={s("animation-delay: 180ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 3.4vw, 46px); line-height: 1.02; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6);")}>You don't have to look far…<br /><span style={{ color: "#ff2f40" }}>he might already be around the corner.</span></h2>
            <p className="bnd-line" style={s("animation-delay: 370ms; margin: 20px 0 0; font-size: clamp(14px, 1.5vw, 18px); line-height: 1.6; color: rgba(226,226,240,0.74); text-wrap: pretty;")}>Somewhere, he has already left a mark.</p>
            <a href="https://spideytracker.net/intl/in/" target="_blank" rel="noopener noreferrer" onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 500ms; display: inline-block; margin-top: clamp(26px, 4vh, 40px); text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
                <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 12px; padding: 15px 40px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Open Spidey Tracker <span style={{ fontSize: "17px", lineHeight: 1 }}>↗</span></span>
              </span>
            </a>
          </div>

          {/* radar */}
          <div className="bnd-line" style={s("animation-delay: 300ms; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: clamp(14px, 2vh, 24px); margin-right: clamp(20px, 5vw, 90px);")}>
            <div style={s("position: relative; width: clamp(280px, 35vw, 460px); aspect-ratio: 1;")}>
              {/* swinging spidey (77-frame idle on a web line) */}
              <div className="tracker-spidey" style={s("position: absolute; left: 50%; margin-left: -40px; top: -62px; width: 80px; z-index: 8; display: flex; flex-direction: column; align-items: center; pointer-events: none;")}>
                <div className="spidey-inner" style={s("transform-origin: top center; display: flex; flex-direction: column; align-items: center;")}>
                  <div style={s("width: 2px; height: clamp(46px, 7vh, 84px); background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(210,225,255,0.55));")}></div>
                  <div style={s("width: 80px; height: 124px; background: url('/assets/spidey-strip.png') 0 0 / 6160px 124px no-repeat; animation: bnd-spidey-frames 2.3s steps(77) infinite; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.5));")}></div>
                </div>
                {/* drop-in dust burst (fires as spidey lands) */}
                <div className="spidey-dust" style={s("position: absolute; left: 50%; bottom: 6px; width: 0; height: 0;")}>
                  <span style={s("--dx: -34px; --dy: 26px; animation-delay: 600ms; position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(220,230,255,0.9); box-shadow: 0 0 6px rgba(200,220,255,0.7);")}></span>
                  <span style={s("--dx: 30px; --dy: 22px; animation-delay: 650ms; position: absolute; width: 3px; height: 3px; border-radius: 50%; background: rgba(220,230,255,0.85);")}></span>
                  <span style={s("--dx: -18px; --dy: 34px; animation-delay: 650ms; position: absolute; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,90,106,0.7); box-shadow: 0 0 7px rgba(255,60,74,0.6);")}></span>
                  <span style={s("--dx: 22px; --dy: 32px; animation-delay: 730ms; position: absolute; width: 3px; height: 3px; border-radius: 50%; background: rgba(220,230,255,0.8);")}></span>
                  <span style={s("--dx: -40px; --dy: 14px; animation-delay: 570ms; position: absolute; width: 3px; height: 3px; border-radius: 50%; background: rgba(200,215,255,0.75);")}></span>
                  <span style={s("--dx: 44px; --dy: 12px; animation-delay: 670ms; position: absolute; width: 4px; height: 4px; border-radius: 50%; background: rgba(220,230,255,0.85);")}></span>
                </div>
              </div>
              <img src="/assets/radar.png" alt="" style={s("position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 40px rgba(0,0,0,0.5));")} />
              <div style={s("position: absolute; inset: 4%; border-radius: 50%; border: 1px solid rgba(77,139,255,0.5); animation: bnd-radar-ring 3.4s ease-out infinite;")}></div>
              <div style={s("position: absolute; inset: 4%; border-radius: 50%; border: 1px solid rgba(77,139,255,0.4); animation: bnd-radar-ring 3.4s ease-out infinite 1.7s;")}></div>
              <div style={s("position: absolute; inset: 6%; border-radius: 50%; overflow: hidden; mix-blend-mode: screen;")}>
                <div style={s("position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(90,170,255,0.85) 0deg, rgba(77,139,255,0.4) 22deg, rgba(77,139,255,0.14) 44deg, transparent 66deg, transparent 360deg); filter: drop-shadow(0 0 10px rgba(77,139,255,0.5)); animation: bnd-radar-sweep 4s linear infinite;")}></div>
              </div>
              <span style={s("position: absolute; top: 30%; left: 62%; width: 13px; height: 13px; border-radius: 50%; background: #ff2f40; box-shadow: 0 0 15px 4px rgba(255,47,64,0.7); animation: bnd-blip 2s ease-in-out infinite;")}></span>
              <span style={s("position: absolute; top: 64%; left: 38%; width: 11px; height: 11px; border-radius: 50%; background: #35ff7a; box-shadow: 0 0 13px 3px rgba(53,255,122,0.7); animation: bnd-blip 2.4s ease-in-out infinite 0.6s;")}></span>
              <span style={s("position: absolute; top: 46%; left: 72%; width: 10px; height: 10px; border-radius: 50%; background: #35ff7a; box-shadow: 0 0 12px 3px rgba(53,255,122,0.7); animation: bnd-blip 2.8s ease-in-out infinite 1.1s;")}></span>
              <span style={s("position: absolute; bottom: -22px; left: 0; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(53,255,122,0.6);")}>Lat 40.71 · Lon -74.00</span>
              <span style={s("position: absolute; top: -22px; right: 0; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(53,255,122,0.6);")}>Signal Detected</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer data-page="footer" data-screen-label="Footer" style={s("position: relative; z-index: 22; scroll-snap-align: start; scroll-snap-stop: always; min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(180deg, #0b0510 0%, #07060c 100%); overflow: hidden;")}>
        <div style={s("position: absolute; top: 0; left: 20%; width: 46vw; height: 220px; background: radial-gradient(circle, rgba(214,2,26,0.14) 0%, transparent 70%); filter: blur(12px); pointer-events: none;")}></div>

        {/* trailer showcase */}
        <div data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; gap: clamp(28px, 5vw, 72px); flex-wrap: wrap; max-width: 1240px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: clamp(96px, 15vh, 160px) clamp(24px, 5vw, 80px) clamp(56px, 9vh, 96px);")}>
          {/* left copy */}
          <div style={s("flex: 1 1 380px; min-width: 300px; max-width: 560px;")}>
            <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 16px;")}>
              <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
              <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Official Trailer</span>
            </div>
            <h2 className="bnd-head" style={s("animation-delay: 170ms; margin: 0 0 18px; font-family: 'Oswald', sans-serif; font-size: clamp(28px, 4vw, 52px); line-height: 1.02; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6);")}>Every Brand New Day<br /><span style={{ color: "#ff2f40" }}>starts here.</span></h2>
            <p className="bnd-line" style={s("animation-delay: 310ms; margin: 0 0 clamp(24px, 4vh, 38px); font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(226,226,240,0.72); max-width: 460px;")}>Watch the official trailer and step into the Spider-Verse. In cinemas July 30.</p>
          </div>

          {/* right large thumbnail */}
          <button onClick={() => { sfxRef.current && sfxRef.current.play("click"); setTrailerOpen(true); }} onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-line trailer-card" style={s("animation-delay: 370ms; flex: 0 1 400px; min-width: 260px; max-width: 400px; position: relative; border: 0; padding: 2px; background: linear-gradient(150deg, rgba(255,40,60,0.6), rgba(31,76,214,0.45)); clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px); cursor: pointer; transition: transform 340ms cubic-bezier(.16,.84,.3,1), box-shadow 340ms ease;")}>
            <div style={s("position: relative; aspect-ratio: 16/9; overflow: hidden; clip-path: polygon(21px 0, 100% 0, 100% calc(100% - 21px), calc(100% - 21px) 100%, 0 100%, 0 21px); background: #0a0713;")}>
              <img src="/assets/trailer-thumb.jpg" alt="Spider-Man: Brand New Day — Official Trailer" style={s("position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;")} />
              <div style={s("position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(120,20,30,0.25) 0%, rgba(6,4,12,0.55) 100%); pointer-events: none;")}></div>
              <span style={s("position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: clamp(68px, 8vw, 96px); height: clamp(68px, 8vw, 96px); border-radius: 50%; border: 2px solid rgba(255,60,74,0.9); background: rgba(20,6,10,0.4); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(255,60,74,0.5), inset 0 0 20px rgba(255,60,74,0.2); pointer-events: none;")}>
                <span style={s("position: absolute; inset: -9px; border-radius: 50%; border: 2px solid rgba(255,60,74,0.4); animation: bnd-radar-ring 2.8s ease-out infinite;")}></span>
                <svg width="30%" height="30%" viewBox="0 0 24 24" fill="#fff" style={s("margin-left: 8%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));")}><path d="M5 3l16 9-16 9z" /></svg>
              </span>
            </div>
          </button>
        </div>

        {/* footer columns */}
        <div style={s("position: relative; z-index: 2; width: 100%; border-top: 1px solid rgba(255,255,255,0.08);")}>
          <div style={s("max-width: 1240px; margin: 0 auto; box-sizing: border-box; padding: clamp(34px, 5vh, 56px) clamp(24px, 5vw, 80px) clamp(20px, 3vh, 32px); display: grid; grid-template-columns: 1.4fr 1fr; gap: clamp(24px, 6vw, 90px); align-items: start;")} className="footer-cols">

            {/* about + social */}
            <div>
              <h4 style={s("margin: 0 0 16px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5a6a;")}>About the Movie <span style={{ color: "#ff2f40" }}>•</span></h4>
              <p style={s("margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.62); max-width: 320px;")}>Anyone can wear the mask. Step into the Spider-Verse and find your place in the Web.</p>
              <div style={s("display: flex; gap: 10px;")}>
                {[
                  ["X", <path key="p" d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5-6.6L5.5 22H2.4l7.8-8.9L1.5 2h6.9l4.6 6.1L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z" />],
                  ["Instagram", <g key="g"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" /></g>],
                  ["YouTube", <g key="g"><path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 002 8.2 31 31 0 001.6 12 31 31 0 002 15.8a3 3 0 002.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 002.1-2.1c.3-1.9.4-3.8.4-3.8s0-1.9-.4-3.8z" /><path d="M10 15l5-3-5-3v6z" fill="#0b0510" /></g>],
                  ["TikTok", <path key="p" d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.7c-1.2 0-2.4-.4-3.5-1.1v5.9c0 3.1-2.3 5.6-5.4 5.6S5.7 17.5 5.7 14.4c0-3 2.2-5.4 5.2-5.5v2.8c-1.4.1-2.4 1.2-2.4 2.7 0 1.5 1.1 2.7 2.6 2.7s2.6-1.2 2.6-2.9V3h2.8z" />],
                  ["Facebook", <path key="p" d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z" />],
                ].map(([name, icon]) => (
                  <a key={name} href="#" onClick={(e) => e.preventDefault()} aria-label={name} data-web-hover="true" className="footer-social" style={s("width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); transition: background .2s ease, border-color .2s ease, color .2s ease;")}>
                    <span style={s("width: 18px; height: 18px; display: block;")}><svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "100%", height: "100%", display: "block" }}>{icon}</svg></span>
                  </a>
                ))}
              </div>
            </div>

            {/* explore */}
            <div>
              <h4 style={s("margin: 0 0 16px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5a6a;")}>Explore <span style={{ color: "#ff2f40" }}>•</span></h4>
              <div style={s("display: flex; flex-direction: column; gap: 4px; max-width: 220px;")}>
                <a href="#" onClick={(e) => { e.preventDefault(); setTrailerOpen(true); }} data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}><span>Trailer</span><span style={s("color: #ff2f40; font-size: 15px;")}>›</span></a>
                <Link href="/mj-wall" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}><span>MJ Wall</span><span style={s("color: #ff2f40; font-size: 15px;")}>›</span></Link>
                <a href="#" onClick={(e) => { e.preventDefault(); goToForm(); }} data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}><span>Fan Hub</span><span style={s("color: #ff2f40; font-size: 15px;")}>›</span></a>
                <Link href="/forum" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}><span>Forum</span><span style={s("color: #ff2f40; font-size: 15px;")}>›</span></Link>
                <a href="https://spideytracker.net/intl/in/" target="_blank" rel="noopener noreferrer" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}><span>Spidey Tracker</span><span style={s("color: #ff2f40; font-size: 15px;")}>›</span></a>
              </div>
            </div>

          </div>

          {/* bottom bar */}
          <div style={s("max-width: 1240px; margin: 0 auto; box-sizing: border-box; padding: 18px clamp(24px, 5vw, 80px) clamp(22px, 3vh, 34px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;")}>
            <div style={s("font-size: 11.5px; letter-spacing: 0.05em; color: rgba(255,255,255,0.4);")}>© 2026 Columbia Pictures Industries, Inc. All rights reserved. &nbsp;·&nbsp; This film is not yet rated.</div>
            <div style={s("display: flex; gap: 24px; flex-wrap: wrap;")}>
              <a href="#" onClick={(e) => e.preventDefault()} data-web-hover="true" className="footer-link" style={s("text-decoration: none; font-size: 11.5px; letter-spacing: 0.06em; color: rgba(255,255,255,0.5); transition: color .2s ease;")}>Privacy Policy</a>
              <a href="#" onClick={(e) => e.preventDefault()} data-web-hover="true" className="footer-link" style={s("text-decoration: none; font-size: 11.5px; letter-spacing: 0.06em; color: rgba(255,255,255,0.5); transition: color .2s ease;")}>Terms of Use</a>
              <a href="#" onClick={(e) => e.preventDefault()} data-web-hover="true" className="footer-link" style={s("text-decoration: none; font-size: 11.5px; letter-spacing: 0.06em; color: rgba(255,255,255,0.5); transition: color .2s ease;")}>Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ============ WEB RAIL: right-side section nav (desktop only) ============ */}
      {isDesktop && (
        <nav aria-label="Page sections" style={s("position: fixed; right: clamp(12px, 1.8vw, 28px); top: 50%; transform: translateY(-50%); z-index: 44;")}>
          <div style={s("position: relative; display: flex; flex-direction: column; align-items: center;")}>
            {/* web strand */}
            <span aria-hidden="true" style={s("position: absolute; top: 6px; bottom: 6px; left: 50%; width: 1px; margin-left: -0.5px; background: linear-gradient(180deg, transparent, rgba(255,255,255,0.16) 12%, rgba(255,255,255,0.16) 88%, transparent); pointer-events: none;")}></span>
            {/* the little spider rides the strand to the active section —
                same spidey silhouette as the site cursor, just smaller */}
            <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: `${railIdx * 34 + 8}px`, transform: "translateX(-50%)", transition: "top 600ms cubic-bezier(.22,1,.36,1)", pointerEvents: "none", zIndex: 2, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.45))" }}>
              <img src="/assets/cursor-spider.svg" alt="" width="18" height="18" style={{ display: "block" }} />
            </span>
            {railSections.map((sec, i) => (
              <button
                key={sec.key}
                onClick={() => { sfxRef.current && sfxRef.current.play("click"); goToSection(sec.key); }}
                data-web-hover="true"
                className="bnd-rail-item"
                aria-label={sec.label}
                aria-current={i === railIdx ? "true" : undefined}
                style={s("position: relative; width: 32px; height: 34px; border: 0; padding: 0; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center;")}
              >
                <span className="bnd-rail-dot" style={s(`width: 7px; height: 7px; border-radius: 50%; background: ${i === railIdx ? "transparent" : "rgba(255,255,255,0.3)"}; box-shadow: ${i === railIdx ? "none" : "0 0 0 1px rgba(255,255,255,0.1)"};`)}></span>
                <span className="bnd-rail-label" style={s("position: absolute; right: 100%; margin-right: 12px; top: 50%; white-space: nowrap; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.82); background: rgba(8,8,14,0.75); border: 1px solid rgba(255,255,255,0.1); padding: 5px 11px; border-radius: 6px; backdrop-filter: blur(4px); pointer-events: none;")}>{sec.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* CINEMATIC TRANSITION OVERLAY */}
      <div style={s("position: fixed; inset: 0; z-index: 95; pointer-events: none;")}>
        <div ref={barTopRef} style={s("position: absolute; top: 0; left: 0; right: 0; height: 51vh; background: linear-gradient(180deg, #050507 0%, #0b0b12 100%); transform: scaleY(0); transform-origin: top; box-shadow: 0 3px 0 rgba(255,31,51,0.55); will-change: transform;")}></div>
        <div ref={barBottomRef} style={s("position: absolute; bottom: 0; left: 0; right: 0; height: 51vh; background: linear-gradient(0deg, #050507 0%, #0b0b12 100%); transform: scaleY(0); transform-origin: bottom; box-shadow: 0 -3px 0 rgba(255,31,51,0.55); will-change: transform;")}></div>
        <div ref={flashRef} style={s("position: absolute; inset: 0; background: radial-gradient(circle at 50% 45%, #ffffff 0%, rgba(255,255,255,0.85) 100%); opacity: 0;")}></div>
        <div ref={irisRef} style={s("position: absolute; inset: 0; display: none; background: radial-gradient(circle at 50% 50%, #0b0b14 0%, #050507 70%); clip-path: circle(0% at 50% 50%); align-items: center; justify-content: center;")}>
          <img src="/assets/web.png" alt="" style={s("position: absolute; top: 50%; left: 50%; width: 120vh; transform: translate(-50%, -50%); opacity: 0.18; mix-blend-mode: screen;")} />
        </div>
      </div>

      {/* NAV + MODALS */}
      <Nav
        isDesktop={isDesktop}
        mobileMenuVisible={!isDesktop && mobileMenuOpen}
        navItems={navItems}
        onGoHome={() => goToPageRef.current(0)}
        onGetStarted={goToForm}
        onToggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
        onMobileSwingIn={() => { setMobileMenuOpen(false); goToForm(); }}
      />

      <WalkthroughModal
        walk={walkVis}
        items={walkItems}
        onClose={() => { sfxRef.current && sfxRef.current.stopHum(); setWalkOpen(false); }}
        onJoin={() => { sfxRef.current && sfxRef.current.play("click"); sfxRef.current && sfxRef.current.stopHum(); setWalkOpen(false); goToForm(); }}
        onHover={onWalkHover}
      />

      {trailerOpen && (
        <TrailerModal onClose={() => setTrailerOpen(false)} onStopProp={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}
