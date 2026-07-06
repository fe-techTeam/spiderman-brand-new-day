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
import { Flag } from "@/components/Flags";
import Nav from "@/components/main/Nav";
import WalkthroughModal from "@/components/main/WalkthroughModal";
import TrailerModal from "@/components/main/TrailerModal";
import AuthModal from "@/components/main/AuthModal";

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
  ["Moscow", "Russia", null, 37.6, 55.8, false], ["Lagos", "Nigeria", null, 3.4, 6.5, true],
  ["Cairo", "Egypt", null, 31.2, 30, false], ["Dubai", "UAE", null, 55.3, 25.2, false],
  ["Mumbai", "India", "in", 72.8, 19.1, true], ["Beijing", "China", null, 116.4, 39.9, false],
  ["Tokyo", "Japan", "jp", 139.7, 35.7, true], ["Singapore", "Singapore", null, 103.8, 1.35, false],
  ["Sydney", "Australia", "au", 151.2, -33.9, true],
].map(([city, country, fk, lon, lat, labeled]) => ({
  city, country, labeled: !!labeled, flagCode: fk, x: projX(lon), y: projY(lat),
}));

const FORUM_COMMUNITIES = [
  { handle: "w/Dreamers", color: "#ff5a6a", members: "48.2k" },
  { handle: "w/Protectors", color: "#ffd23f", members: "61.7k" },
  { handle: "w/Rebels", color: "#4d8bff", members: "33.9k" },
  { handle: "w/Prodigies", color: "#7ee787", members: "27.4k" },
  { handle: "w/SpideySpotted", color: "#ff9f43", members: "72.1k" },
];

const FORUM_THREADS = [
  { votes: "4.2k", community: "w/Protectors", author: "u/mayaokafor", time: "3h", title: "Great power, great responsibility — my abuela said it before the movies did.", snippet: "She's been saying it my whole life. Watching the new film, it finally clicked why she never let me forget it.", comments: "312", tag: "Trending", color: "#ffd23f", delay: "160ms" },
  { votes: "2.4k", community: "w/Dreamers", author: "u/leomartins", time: "5h", title: "First time seeing someone like me on the poster. Suited up and didn't take it off all day.", snippet: "Anyone can wear the mask. I never believed that until this week. Now I can't unsee it.", comments: "182", tag: "Hot", color: "#ff5a6a", delay: "240ms" },
  { votes: "2.1k", community: "w/Rebels", author: "u/graceliu", time: "8h", title: "Everyone kept telling me who Spider-Man should be. So I drew who he is to ME.", snippet: "Dropped the full sketchbook in the comments. Not everyone swings the same way — and that's the point.", comments: "168", tag: "Art", color: "#4d8bff", delay: "320ms" },
  { votes: "1.9k", community: "w/SpideySpotted", author: "u/diegoalvarez", time: "11h", title: "Spotted a web-tag on 7th street this morning. Anyone else seeing these pop up?", snippet: "Third one this week in my neighbourhood. Someone's leaving marks all over the city. Compiling a map — link inside.", comments: "204", tag: "Sighting", color: "#ff9f43", delay: "400ms" },
];

/* ---------------------------------------------------------------- component */

export default function Home() {
  const router = useRouter();

  const [walkOpen, setWalkOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mjMessage, setMjMessage] = useState("");
  const [mjSent, setMjSent] = useState(false);
  const [twinMode, setTwinMode] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

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
  const sfxRef = useRef(null);
  const isDesktopRef = useRef(true);
  const walkOpenRef = useRef(false);
  const trailerOpenRef = useRef(false);
  const authOpenRef = useRef(false);
  const mobileMenuOpenRef = useRef(false);
  const twinModeRef = useRef(false);

  isDesktopRef.current = isDesktop;
  walkOpenRef.current = walkOpen;
  trailerOpenRef.current = trailerOpen;
  authOpenRef.current = authOpen;
  mobileMenuOpenRef.current = mobileMenuOpen;
  twinModeRef.current = twinMode;

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
          bgRef.current.style.filter = `brightness(${(0.55 + 0.45 * e).toFixed(3)}) saturate(${(0.7 + 0.3 * e).toFixed(3)})`;
        }
        if (heroStackRef.current) {
          heroStackRef.current.style.transform = `translate3d(0, ${(sy * -0.08).toFixed(2)}px, 0)`;
        }
        if (isDesktopRef.current && mjWallRef.current && mjHeaderRef.current) {
          const secTop = mjWallRef.current.getBoundingClientRect().top;
          const enter = Math.max(-0.4, Math.min(1, 1 - secTop / (window.innerHeight || 800)));
          mjHeaderRef.current.style.transform = `translate3d(0, ${((1 - enter) * 140).toFixed(2)}px, 0)`;
          mjHeaderRef.current.style.opacity = Math.max(0, Math.min(1, enter * 1.6 + 0.2)).toFixed(3);
        } else if (mjHeaderRef.current) {
          mjHeaderRef.current.style.opacity = "1"; // mobile: keep readable (CSS forces transform:none)
        }
        if (logoRef.current) {
          logoRef.current.style.transform = `translate3d(${(-mx * 14).toFixed(2)}px, ${(-my * 8).toFixed(2)}px, 0)`;
        }
        if (spideyWrapRef.current) {
          const offX = isDesktopRef.current ? 11 : 0;
          spideyWrapRef.current.style.transform = `translateX(calc(-50% - ${offX}vw - 10px))`;
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
      if (authOpenRef.current) setAuthOpen(false);
      if (mobileMenuOpenRef.current) setMobileMenuOpen(false);
      if (walkOpenRef.current) { sfx.stopHum(); setWalkOpen(false); }
    };
    const onResize = () => {
      const desktop = window.innerWidth >= 760;
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
    const walkInT = setTimeout(() => { setWalkOpen(true); sfx.play("open"); }, entryMs + 1000);

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
            el.classList.remove("in");
            void el.offsetWidth; // re-arm so it replays on each entry
            el.classList.add("in");
          } else {
            el.classList.remove("in");
          }
        });
      }, { threshold: [0, 0.4, 1] });
      groups.forEach((g) => revealObs.observe(g));
    }

    /* ---- active-section scroll-spy (drives the nav highlight) ---- */
    let sectionObs = null;
    if ("IntersectionObserver" in window) {
      const ratios = new Map();
      sectionObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => ratios.set(en.target.getAttribute("data-page"), en.intersectionRatio));
        let best = null, bestR = 0;
        ratios.forEach((r, k) => { if (r > bestR) { bestR = r; best = k; } });
        if (best && bestR > 0.4) setActiveSection((prev) => (prev === best ? prev : best));
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      document.querySelectorAll("[data-page]").forEach((el) => sectionObs.observe(el));
    }

    /* ---- full-section cinematic pager (desktop only; mobile scrolls natively) ---- */
    let pageIndex = 0, paging = false, gestureLive = false, wheelIdleTimer = null;
    const transStyle = "shutter";
    const pages = () => Array.from(document.querySelectorAll("[data-page]"));
    const lastIndex = () => Math.max(0, pages().length - 1);
    const modalOpen = () => trailerOpenRef.current || authOpenRef.current || mobileMenuOpenRef.current || walkOpenRef.current;
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
        window.scrollTo(0, startY + dist * ease(p));
        kickRAF();
        if (p < 1) requestAnimationFrame(stepFn);
        else if (cb) cb();
      };
      requestAnimationFrame(stepFn);
    };
    const scrollInstant = (target) => {
      window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
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
      // mobile: natural smooth scroll, no hijack
      if (!isDesktopRef.current) {
        pageIndex = idx;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // already on this section (e.g. clamped at a boundary) — no transition/blink
      if (idx === pageIndex) return;
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
      if (gestureLive || paging) return;
      gestureLive = true;
      if (ev.deltaY > 0) { if (pageIndex < lastIndex()) goToPage(pageIndex + 1); } // nothing below the last
      else if (ev.deltaY < 0) { if (pageIndex > 0) goToPage(pageIndex - 1); }        // nothing above the first
    };
    const onPagerKey = (ev) => {
      if (!isDesktopRef.current || modalOpen() || paging) return;
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(ev.key)) { ev.preventDefault(); goToPage(pageIndex + 1); }
      else if (["ArrowUp", "PageUp"].includes(ev.key)) { ev.preventDefault(); goToPage(pageIndex - 1); }
    };
    let touchStartY = null;
    const onTouchStart = (ev) => { if (isDesktopRef.current) touchStartY = ev.touches[0].clientY; };
    const onTouchMove = (ev) => { if (isDesktopRef.current && !modalOpen()) ev.preventDefault(); };
    const onTouchEnd = (ev) => {
      if (!isDesktopRef.current || modalOpen() || paging || touchStartY == null) return;
      const endY = (ev.changedTouches && ev.changedTouches[0].clientY) || touchStartY;
      const diff = touchStartY - endY;
      if (Math.abs(diff) > 50) goToPage(pageIndex + (diff > 0 ? 1 : -1));
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

  /* ---------------------------------------------------------- derived / handlers */
  const goToForm = () => setAuthOpen(true); // register/login popup
  const doNav = (action) => {
    if (action === "trailer") setTrailerOpen(true);
    else if (action === "mjwall") goToPageRef.current(3); // MJ Wall section
    else if (action === "forum") router.push("/forum");
    else goToForm(); // fanhub
  };
  // Which section (if any) each nav item corresponds to — drives the active highlight.
  const navSections = [null, "mjwall", null, null];
  const navItems = ["TRAILER", "MJ WALL", "FAN HUB", "FORUM"].map((label, i) => {
    const action = ["trailer", "mjwall", "fanhub", "forum"][i];
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
    opacity: walkOpen ? "1" : "0",
    transform: walkOpen
      ? "perspective(1600px) rotateX(0deg) translateY(0) scale(1)"
      : "perspective(1600px) rotateX(22deg) translateY(90px) scale(0.72)",
    filter: walkOpen ? "blur(0)" : "blur(14px)",
  };
  const walkItems = WALK_ITEMS.map((w, i) => ({ ...w, delay: (walkOpen ? 620 + i * 150 : 0) + "ms" }));

  const spideyWidth = isDesktop ? "clamp(300px, 32vw, 560px)" : "62vw";
  const logoWidth = isDesktop ? "min(720px, 42vw)" : "82vw";

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
          <span style={s("position: absolute; left: 0; right: 0; height: 2px; top: 0; background: linear-gradient(90deg, transparent, rgba(255,60,74,0.9), rgba(120,160,255,0.7), transparent); box-shadow: 0 0 18px rgba(255,60,74,0.6); animation: bnd-id-scan 5.5s cubic-bezier(.5,0,.5,1) infinite, bnd-id-glitch 0.22s steps(2) infinite;")}></span>
        </div>

        <div data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 6; width: 100%; max-width: 1000px; padding: 0 clamp(24px, 6vw, 80px); display: flex; flex-direction: column; align-items: center; text-align: center;")}>
          <div className="bnd-line" style={s("animation-delay: 120ms; display: inline-flex; align-items: center; gap: 12px; margin-bottom: clamp(14px, 2.2vh, 22px);")}>
            <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #ff5a6a);")}></span>
            <span style={s("font-size: clamp(10px, 1.2vw, 12px); letter-spacing: 0.42em; text-transform: uppercase; color: #ff6b79;")}>Your Story Begins</span>
            <span style={s("width: 40px; height: 1px; background: linear-gradient(90deg, #ff5a6a, transparent);")}></span>
          </div>
          <h2 className="bnd-head" style={s("animation-delay: 320ms; margin: 0; font-size: clamp(30px, 5.2vw, 70px); line-height: 0.94; font-weight: 500; letter-spacing: 0.005em; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22); text-wrap: balance;")}>Who Are You <span style={{ color: "#ff2f40" }}>Under the Mask?</span></h2>
          <p className="bnd-line" style={s("animation-delay: 720ms; margin: clamp(14px, 2.4vh, 22px) auto clamp(26px, 4vh, 40px); max-width: 560px; font-size: clamp(13px, 1.35vw, 16px); line-height: 1.6; color: rgba(232,232,244,0.82); text-shadow: 0 2px 12px rgba(0,0,0,0.7); text-wrap: pretty;")}>Every Spider-Man carries something different. Answer a few questions and discover the identity that has always been yours.</p>
          <button onClick={() => { sfxRef.current && sfxRef.current.play("click"); goToForm(); }} onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-cta bnd-line" style={s("animation-delay: 980ms; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); box-shadow: 0 14px 36px rgba(214,2,26,0.4);")}>
              <span className="bnd-cta-inner" style={s("display: block; padding: 14px 38px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); color: #fff; font-family: 'Oswald', 'Acumin Pro', sans-serif; font-weight: 500; font-size: clamp(13px, 1.4vw, 15px); letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.4);")}><span className="bnd-cta-sheen"></span>Reveal My Identity</span>
            </span>
          </button>
          <div className="bnd-line" style={s("animation-delay: 1160ms; margin-top: clamp(14px, 2.2vh, 20px); display: inline-flex; align-items: center; gap: 7px; font-size: clamp(9px, 1vw, 11px); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(226,226,240,0.5);")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
            Takes less than a minute
          </div>
        </div>
      </section>

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
              <h2 className="bnd-head" style={s("animation-delay: 200ms; margin: 0; font-family: 'Oswald', sans-serif; font-style: italic; font-size: clamp(22px, 3.4vw, 46px); line-height: 1; font-weight: 600; letter-spacing: 0.01em; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6); white-space: nowrap;")}>The Web grows a little <span style={{ color: "#ff2f40" }}>every second.</span></h2>
              <p className="bnd-line" style={s("animation-delay: 520ms; margin: 12px 0 0; font-size: clamp(11px, 1.3vw, 15px); line-height: 1.5; color: rgba(226,226,240,0.72); white-space: nowrap;")}>While you were finding your identity, thousands of others were finding theirs too.</p>
              <button className="bnd-line bnd-cta" onClick={() => { sfxRef.current && sfxRef.current.play("click"); setTwinMode(true); }} onMouseEnter={onWalkHover} data-web-hover="true" style={s("animation-delay: 760ms; margin-top: clamp(16px, 2.4vh, 24px); border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
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
              <div className="bnd-line" style={s("animation-delay: 120ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px;")}>
                <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Your Web Twin</span>
                <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff2f40, transparent);")}></span>
              </div>
              <h2 className="bnd-head" style={s("animation-delay: 280ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 4.6vw, 60px); line-height: 0.96; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6);")}>You're a <span style={{ color: "#ff2f40" }}>Dreamer</span></h2>
              <p className="bnd-line" style={s("animation-delay: 560ms; margin: 12px auto 0; max-width: 600px; font-size: clamp(13px, 1.4vw, 16px); line-height: 1.6; color: rgba(226,226,240,0.75); text-wrap: pretty;")}>You share your identity with <span style={{ color: "#fff", fontWeight: 600 }}>12,480 Dreamers</span> across <span style={{ color: "#ffd23f", fontWeight: 600 }}>34 countries</span>. Here are a few of your Web Twins.</p>
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
            <div className="bnd-line" style={s("animation-delay: 120ms; display: inline-flex; align-items: center; gap: 12px; margin-bottom: 18px;")}>
              <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff1f33, transparent);")}></span>
              <span style={s("font-size: 12px; letter-spacing: 0.36em; text-transform: uppercase; color: #ff5a6a;")}>The MJ Wall</span>
            </div>
            <h2 className="bnd-head" style={s("animation-delay: 300ms; margin: 0; font-size: clamp(30px, 4.4vw, 56px); line-height: 1.02; font-weight: 700; letter-spacing: -0.01em; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); text-wrap: balance;")}>MJ forgot the best part of her story. <span style={{ color: "#ff4655" }}>Let's remind her!</span></h2>
            <p className="bnd-line" style={s("animation-delay: 680ms; margin: 18px 0 0; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(255,255,255,0.82); text-shadow: 0 2px 10px rgba(0,0,0,0.6); text-wrap: pretty;")}>If you could remind MJ of one thing about Peter, what would it be?</p>

            {mjSent ? (
              <div style={s("margin-top: 28px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: bnd-word-rise 500ms cubic-bezier(.2,.7,.2,1) both;")}>
                <div style={s("display: inline-flex; align-items: center; gap: 12px; font-size: clamp(20px, 2.4vw, 28px); font-weight: 700; color: #fff;")}>
                  <span style={s("width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 20px;")}>✓</span>
                  Sent!
                </div>
                <p style={s("margin: 0; font-size: 14px; color: rgba(255,255,255,0.72); text-shadow: 0 2px 8px rgba(0,0,0,0.6);")}>Your memory is now part of the wall. Thanks for helping MJ remember.</p>
                <button onClick={() => { setMjSent(false); setMjMessage(""); setTimeout(() => mjInputRef.current && mjInputRef.current.focus(), 60); }} style={s("background: transparent; border: 0; color: #ff5a6a; font: inherit; letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; cursor: pointer; padding: 4px 0;")}>Write another ›</button>
              </div>
            ) : (
              <div style={s("margin-top: 28px;")}>
                <div style={s("position: relative; padding: 3px; background: linear-gradient(180deg, #ff3a4a 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);")}>
                  <textarea
                    ref={mjInputRef}
                    id="mj-textarea"
                    value={mjMessage}
                    onChange={(e) => setMjMessage(e.target.value)}
                    rows={4}
                    style={s("display: block; width: 100%; box-sizing: border-box; resize: none; padding: 18px 22px; border: 0; outline: 0; background: #000; color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.7), 0 0 18px rgba(255,255,255,0.35); font-family: inherit; font-size: 15px; line-height: 1.5; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}
                  ></textarea>
                </div>
                <div style={s("margin-top: 20px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap;")}>
                  <button onClick={() => { if (!mjMessage.trim()) { mjInputRef.current && mjInputRef.current.focus(); return; } setMjSent(true); }} style={s("position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}>
                    <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #1f4cd6 0%, #0b2a8a 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 10px 28px rgba(0,0,0,0.4);")}>
                      <span style={s("display: block; padding: 15px 34px; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #6b2a00; font-weight: 700; font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,0.35);")}>Add to the wall</span>
                    </span>
                  </button>
                  <Link href="/mj-wall" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.85); text-decoration: none; text-shadow: 0 2px 8px rgba(0,0,0,0.6); transition: color 200ms ease;")}>View all messages <span style={{ fontSize: "15px" }}>›</span></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= SPIDER-VERSE FEED ================= */}
      <section data-page="feed" data-screen-label="Spider-Verse Feed" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background: radial-gradient(120% 90% at 78% 6%, #1a0510 0%, #0a0713 52%, #050308 100%); display: flex;")}>
        <img src="/assets/web.png" alt="" style={s("position: absolute; top: -10%; left: -8%; width: min(680px, 46vw); opacity: 0.06; mix-blend-mode: screen; pointer-events: none;")} />
        <div data-reveal className="bnd-reveal" style={s("position: relative; z-index: 4; width: 100%; max-width: 1240px; margin: 0 auto; box-sizing: border-box; padding: clamp(78px, 12vh, 118px) clamp(24px, 5vw, 80px) clamp(28px, 5vh, 52px); display: flex; flex-direction: column; min-height: 0;")}>
          <div style={s("display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; flex-wrap: wrap; margin-bottom: clamp(16px, 2.4vh, 26px);")}>
            <div style={s("max-width: 660px;")}>
              <div className="bnd-line" style={s("animation-delay: 120ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px;")}>
                <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, transparent, #ff2f40);")}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Spider-Verse Feed</span>
              </div>
              <h2 className="bnd-head" style={s("animation-delay: 280ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(26px, 3.8vw, 50px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6);")}>This is what the Web <span style={{ color: "#ff2f40" }}>actually looks like.</span></h2>
              <p className="bnd-line" style={s("animation-delay: 560ms; margin: 10px 0 0; font-size: clamp(13px, 1.4vw, 16px); line-height: 1.55; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>Real people, real identities, real stories. Jump into a thread and add your voice.</p>
            </div>
            <Link href="/forum" data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 640ms; text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
              <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 28px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Enter the Forum <span style={{ fontSize: "15px" }}>→</span></span>
              </span>
            </Link>
          </div>

          {/* community pills */}
          <div className="bnd-line" style={s("animation-delay: 700ms; display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: clamp(14px, 2vh, 20px);")}>
            {FORUM_COMMUNITIES.map((c) => (
              <Link key={c.handle} href="/forum" data-web-hover="true" className="feed-pill" style={s("text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; transition: border-color 220ms ease, background 220ms ease;")}>
                <span style={s(`width: 8px; height: 8px; border-radius: 50%; background: ${c.color}; box-shadow: 0 0 8px ${c.color};`)}></span>
                <span style={s("font-family: 'Oswald', sans-serif; font-size: 13px; letter-spacing: 0.06em; color: #fff;")}>{c.handle}</span>
                <span style={s("font-size: 10px; letter-spacing: 0.1em; color: rgba(255,255,255,0.45);")}>{c.members}</span>
              </Link>
            ))}
          </div>

          {/* trending threads */}
          <div style={s("flex: 1; min-height: 0; overflow-y: auto; padding-right: 6px; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: clamp(10px, 1.4vh, 14px);")}>
            {FORUM_THREADS.map((t, i) => (
              <Link key={i} href="/forum" data-web-hover="true" className="bnd-line bnd-card feed-thread" style={s(`animation-delay: ${t.delay}; text-decoration: none; position: relative; padding: 1px; background: linear-gradient(150deg, rgba(120,150,220,0.24), rgba(255,40,60,0.28)); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); transition: transform 340ms cubic-bezier(.16,.84,.3,1), box-shadow 340ms ease;`)}>
                <div className="bnd-card-body" style={s("display: flex; align-items: stretch; gap: 0; background: linear-gradient(150deg, rgba(16,18,34,0.96), rgba(9,10,20,0.97)); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                  <div style={s("flex-shrink: 0; width: clamp(56px, 6vw, 72px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: rgba(255,40,60,0.06); border-right: 1px solid rgba(255,255,255,0.06);")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff5a6a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 8h-4v6h-6v-6H5z" /></svg>
                    <span style={s("font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: #fff; line-height: 1;")}>{t.votes}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-8h-4V5h-6v6H5z" /></svg>
                  </div>
                  <div style={s("flex: 1; min-width: 0; padding: 14px 18px;")}>
                    <div style={s("display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 11px; color: rgba(255,255,255,0.5);")}>
                      <span style={s("display: inline-flex; align-items: center; gap: 5px;")}><span style={s(`width: 6px; height: 6px; border-radius: 50%; background: ${t.color}; box-shadow: 0 0 6px ${t.color};`)}></span><span style={s("font-family: 'Oswald', sans-serif; letter-spacing: 0.04em; color: rgba(255,255,255,0.8);")}>{t.community}</span></span>
                      <span style={{ opacity: 0.5 }}>·</span><span>{t.author}</span>
                      <span style={{ opacity: 0.5 }}>·</span><span>{t.time}</span>
                    </div>
                    <div style={s("font-family: 'Oswald', sans-serif; font-size: clamp(15px, 1.7vw, 19px); font-weight: 500; color: #fff; line-height: 1.15; margin-bottom: 5px;")}>{t.title}</div>
                    <p style={s("margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: rgba(226,226,240,0.66); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;")}>{t.snippet}</p>
                    <div style={s("display: flex; align-items: center; gap: 18px; font-size: 11.5px; letter-spacing: 0.04em; color: rgba(255,255,255,0.5);")}>
                      <span style={s("display: inline-flex; align-items: center; gap: 6px;")}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 01-11.9 7.6L3 21l1.9-6.1A8.4 8.4 0 1121 11.5z" /></svg>{t.comments} comments</span>
                      <span style={s("display: inline-flex; align-items: center; gap: 6px; color: rgba(255,90,106,0.8);")}><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>{t.tag}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <div style={s("display: flex; justify-content: center; padding: clamp(8px, 1.4vh, 16px) 0 4px;")}>
              <Link href="/forum" data-web-hover="true" className="link-hover-red" style={s("text-decoration: none; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.6); transition: color 200ms ease;")}>See more stories ›</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SPIDEY TRACKER ================= */}
      <section data-page="tracker" data-screen-label="Spidey Tracker" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background: radial-gradient(120% 100% at 22% 30%, #0d1420 0%, #080a12 52%, #050608 100%); display: flex; align-items: center;")}>
        <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -14%; right: -8%; width: min(640px, 42vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />
        <div data-reveal className="bnd-reveal" style={s("position: relative; z-index: 4; width: 100%; max-width: 1280px; margin: 0 auto; box-sizing: border-box; padding: clamp(78px, 12vh, 120px) clamp(24px, 5vw, 80px) clamp(40px, 7vh, 70px); display: flex; align-items: center; justify-content: space-between; gap: clamp(30px, 5vw, 70px); flex-wrap: wrap;")}>
          <div style={s("flex: 1; min-width: 300px; max-width: 560px;")}>
            <img src="/assets/tracker-logo.png" alt="Spidey Tracker" className="bnd-line" style={s("animation-delay: 120ms; display: block; width: clamp(240px, 26vw, 360px); height: auto; margin-bottom: 22px; filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));")} />
            <h2 className="bnd-head" style={s("animation-delay: 300ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 3.4vw, 46px); line-height: 1.02; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6);")}>You don't have to look far…<br /><span style={{ color: "#ff2f40" }}>he might already be around the corner.</span></h2>
            <p className="bnd-line" style={s("animation-delay: 620ms; margin: 20px 0 0; font-size: clamp(14px, 1.5vw, 18px); line-height: 1.6; color: rgba(226,226,240,0.74); text-wrap: pretty;")}>Somewhere, he has already left a mark.</p>
            <a href="https://spideytracker.net/intl/in/" target="_blank" rel="noopener noreferrer" onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 840ms; display: inline-block; margin-top: clamp(26px, 4vh, 40px); text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
                <span className="bnd-cta-inner" style={s("display: inline-flex; align-items: center; gap: 12px; padding: 15px 40px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}><span className="bnd-cta-sheen"></span>Open Spidey Tracker <span style={{ fontSize: "17px", lineHeight: 1 }}>↗</span></span>
              </span>
            </a>
          </div>

          {/* radar */}
          <div className="bnd-line" style={s("animation-delay: 500ms; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: clamp(14px, 2vh, 24px);")}>
            <div style={s("position: relative; width: clamp(250px, 31vw, 400px); aspect-ratio: 1;")}>
              <img src="/assets/radar.png" alt="" style={s("position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 40px rgba(0,0,0,0.5));")} />
              <div style={s("position: absolute; inset: 4%; border-radius: 50%; border: 1px solid rgba(53,255,122,0.5); animation: bnd-radar-ring 3.4s ease-out infinite;")}></div>
              <div style={s("position: absolute; inset: 4%; border-radius: 50%; border: 1px solid rgba(53,255,122,0.4); animation: bnd-radar-ring 3.4s ease-out infinite 1.7s;")}></div>
              <div style={s("position: absolute; inset: 6%; border-radius: 50%; overflow: hidden; mix-blend-mode: screen;")}>
                <div style={s("position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(from 0deg, rgba(53,255,122,0.42) 0deg, rgba(53,255,122,0.12) 26deg, transparent 60deg, transparent 360deg); animation: bnd-radar-sweep 4.5s linear infinite;")}></div>
              </div>
              <span style={s("position: absolute; top: 30%; left: 62%; width: 10px; height: 10px; border-radius: 50%; background: #ff2f40; box-shadow: 0 0 12px 3px rgba(255,47,64,0.7); animation: bnd-blip 2s ease-in-out infinite;")}></span>
              <span style={s("position: absolute; top: 64%; left: 38%; width: 8px; height: 8px; border-radius: 50%; background: #35ff7a; box-shadow: 0 0 10px 2px rgba(53,255,122,0.7); animation: bnd-blip 2.4s ease-in-out infinite 0.6s;")}></span>
              <span style={s("position: absolute; top: 46%; left: 72%; width: 7px; height: 7px; border-radius: 50%; background: #35ff7a; box-shadow: 0 0 10px 2px rgba(53,255,122,0.7); animation: bnd-blip 2.8s ease-in-out infinite 1.1s;")}></span>
              <span style={s("position: absolute; bottom: -22px; left: 0; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(53,255,122,0.6);")}>Lat 40.71 · Lon -74.00</span>
              <span style={s("position: absolute; top: -22px; right: 0; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(53,255,122,0.6);")}>Signal Detected</span>
            </div>
          </div>
        </div>
      </section>

      {/* CINEMATIC TRANSITION OVERLAY */}
      <div style={s("position: fixed; inset: 0; z-index: 95; pointer-events: none;")}>
        <div ref={barTopRef} style={s("position: absolute; top: 0; left: 0; right: 0; height: 51vh; background: linear-gradient(180deg, #050507 0%, #0b0b12 100%); transform: scaleY(0); transform-origin: top; box-shadow: 0 3px 0 rgba(255,31,51,0.55);")}></div>
        <div ref={barBottomRef} style={s("position: absolute; bottom: 0; left: 0; right: 0; height: 51vh; background: linear-gradient(0deg, #050507 0%, #0b0b12 100%); transform: scaleY(0); transform-origin: bottom; box-shadow: 0 -3px 0 rgba(255,31,51,0.55);")}></div>
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
        onGetStarted={() => setAuthOpen(true)}
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

      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onHover={onWalkHover} />
      )}
    </div>
  );
}
