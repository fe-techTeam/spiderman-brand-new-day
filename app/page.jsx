/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { s } from "@/lib/style";
import { dismissKeyboard } from "@/lib/dismissKeyboard";
import { createSfx } from "@/lib/sfx";
import { initGlobe } from "@/lib/globe";
import { initParticles } from "@/lib/particles";
import { portalApi } from "@/lib/portal/api";
import { Flag, DotMarker } from "@/components/Flags";
import { useSession } from "@/components/auth/SessionProvider";
import Nav from "@/components/main/Nav";
import WalkthroughModal from "@/components/main/WalkthroughModal";
import TrailerModal from "@/components/main/TrailerModal";
// MusicPlayer is mounted once in the root layout so it persists across routes.

/* ---------------------------------------------------------------- static data */

const WALK_ITEMS = [
  { icon: "/assets/icon-spider-id.png", line1: "Discover Your", line2: "Spider Identity", desc: "Answer a few questions to unlock your unique Spider World Avatar.", action: "identity" },
  { icon: "/assets/icon-find-spider.png", line1: "Find Your", line2: "Spider Twins", desc: "Meet fans around the world who share your Spider identity.", action: "twins" },
  { icon: "/assets/icon-message.png", line1: "Leave a Message", line2: "For MJ", desc: "Share your thoughts and messages for MJ with the community.", action: "mjwall" },
  { icon: "/assets/icon-trailer.svg", line1: "Watch the", line2: "Official Trailer", desc: "Step into the Spider World — experience the Brand New Day trailer.", action: "trailer" },
  { icon: "/assets/icon-conversation.png", line1: "Join the", line2: "Conversation", desc: "Discuss theories, easter eggs, and all things Spider-Man.", action: "forum" },
  { icon: "/assets/icon-track.png", line1: "Track", line2: "Spider-Man", desc: "Follow Spider-Man's latest sightings with Spidey Tracker.", action: "tracker" },
];

const projX = (lon) => (((lon + 180) / 360) * 100).toFixed(1) + "%";
const projY = (lat) => (10 + ((78 - lat) / 136) * 80).toFixed(1) + "%";
const MAP_CHIPS = [
  ["New York", "USA", "us", -74, 40.7, true],
  ["Los Angeles", "USA", "us", -118.2, 34, false],
  ["Mexico City", "Mexico", null, -99.1, 19.4, false],
  ["São Paulo", "Brazil", "br", -46.6, -23.5, true],
  ["Buenos Aires", "Argentina", null, -58.4, -34.6, false],
  ["London", "UK", "uk", -0.1, 51.5, true],
  ["Moscow", "Russia", null, 37.6, 55.8, false],
  ["Lagos", "Nigeria", "ng", 3.4, 6.5, true],
  ["Cairo", "Egypt", null, 31.2, 30, false],
  ["Dubai", "UAE", null, 55.3, 25.2, false],
  ["Mumbai", "India", "in", 72.8, 19.1, true],
  ["Beijing", "China", null, 116.4, 39.9, false],
  ["Tokyo", "Japan", "jp", 139.7, 35.7, true],
  ["Singapore", "Singapore", null, 103.8, 1.35, false],
  ["Sydney", "Australia", "au", 151.2, -33.9, true],
].map(([city, country, fk, lon, lat, labeled]) => ({
  city,
  country,
  labeled: !!labeled,
  flagCode: fk,
  x: projX(lon),
  y: projY(lat),
}));

/* twins roster: stylized mini-flags exist for a handful of countries — map the
   free-text users.country (geo-ip names) onto them; DotMarker covers the rest */
const FLAG_BY_COUNTRY = {
  india: "in",
  "united states": "us",
  usa: "us",
  "united states of america": "us",
  "united kingdom": "uk",
  uk: "uk",
  england: "uk",
  "great britain": "uk",
  japan: "jp",
  brazil: "br",
  "south africa": "za",
  nigeria: "ng",
  australia: "au",
};
const countryFlag = (c) => (c ? FLAG_BY_COUNTRY[String(c).trim().toLowerCase()] || null : null);
const TWIN_PAGE = 5; // roster rows revealed per scroll step

/* Hero background: real art direction via <picture>. The old JS swap
   (isDesktop ? bg : bg-mobile) SSR'd the DESKTOP art to every phone — the heavy
   wide image downloaded and painted first, then swapped to the portrait banner
   after hydration (double fetch + a flash of the wrong crop). The browser now
   picks the source itself on first paint, and re-picks live on rotation.
   loading=eager + fetchPriority=high stand in for `preload`: a preload link can
   only carry one srcset, which would force the wrong art onto half the devices. */
const HERO_BG_COMMON = { alt: "", fill: true, sizes: "100vw", loading: "eager", fetchPriority: "high" };
const {
  props: { srcSet: HERO_BG_DESKTOP_SET },
} = getImageProps({ ...HERO_BG_COMMON, src: "/assets/bg.jpg" });
const {
  props: { srcSet: HERO_BG_MOBILE_SET, ...HERO_BG_IMG },
} = getImageProps({ ...HERO_BG_COMMON, src: "/assets/bg-mobile.jpg" });

/* landing sections in DOM order — drives the right-side web-rail nav */
const RAIL_SECTIONS = [
  { key: "hero", label: "Brand New Day" },
  { key: "identity", label: "Find Your Identity" },
  { key: "livingweb", label: "The Living Web" },
  { key: "mjwall", label: "MJ Wall" },
  { key: "feed", label: "Spider World Feed" },
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
  const [twinData, setTwinData] = useState(null); // { count, twins[] } once /api/twins answers
  const [twinsVisible, setTwinsVisible] = useState(TWIN_PAGE);
  const [activeSection, setActiveSection] = useState("hero");

  // Logged-in members already picked their identity during onboarding — the
  // "Who Are You Under the Mask?" section only shows for guests / quiz-pending.
  const hideIdentity = !!user && !user.needsQuiz;
  // The Living Web ("The Web grows a little every second" / Web Twins) is the
  // inverse: members only — guests never see the section at all.
  const showLivingWeb = !!user;

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

  /* Scroll-snap + smooth-scroll are landing-page mechanics — turn them on for
     <html> only while this page is mounted, so they never bleed onto the Forum,
     MJ Wall, quiz, etc. (a mandatory-snap <html> made those routes open a
     snap-point down). */
  useEffect(() => {
    document.documentElement.classList.add("bnd-snap");
    return () => document.documentElement.classList.remove("bnd-snap");
  }, []);

  /* NOTE: the mobile "section veil" (black out every section except the active
     one) is gone. It existed to hide the sliver of a neighbour that showed when
     a 100dvh snap rested a few px off — but on iOS the veiled sliver itself
     read as a black band under the toolbar. Sections are 100lvh on phones now
     (globals.css): their heights no longer change with the toolbar, so snap
     offsets never move and there is no sliver to hide. */

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
    let mjTopCache = 0; // document-space top of the MJ section (re-measured on resize)
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
        const mx = cur.mx,
          my = cur.my,
          // Scroll parallax is DESKTOP-ONLY (and off for reduced-motion). The
          // hero bg has no overscan once the entry scale settles at 1, so
          // shifting it -0.18×scrollY during a native mobile swipe peeled the
          // art off the section's bottom edge — a black band right where the
          // next section slides in. Desktop never shows mid-scroll states (the
          // shutter covers scrollInstant) EXCEPT the reduced-motion dissolve
          // tween, which parallax must sit out anyway. (mx/my stay 0 on touch.)
          sy = isDesktopRef.current && !reduceMotion ? scrollCur.v : 0;

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

        const entryRunning = performance.now() - entryStart < entryMs + 50;
        const moving = entryRunning || Math.abs(tgt.mx - cur.mx) > 0.001 || Math.abs(tgt.my - cur.my) > 0.001 || Math.abs(scrollTgt.v - scrollCur.v) > 0.2;
        raf = moving ? requestAnimationFrame(tick) : null;
      };
      raf = requestAnimationFrame(tick);
    };

    /* ---- pointer / scroll / key / resize ---- */
    const onMove = (ev) => {
      const w = window.innerWidth,
        h = window.innerHeight;
      tgt.mx = (ev.clientX / w) * 2 - 1;
      tgt.my = (ev.clientY / h) * 2 - 1;
      kickRAF();
    };
    const onLeave = () => {
      tgt.mx = 0;
      tgt.my = 0;
      kickRAF();
    };
    const onScroll = () => {
      scrollTgt.v = window.scrollY || window.pageYOffset || 0;
      kickRAF();
    };
    const onKeyDown = (ev) => {
      if (ev.key !== "Escape") return;
      if (trailerOpenRef.current) setTrailerOpen(false);
      if (mobileMenuOpenRef.current) setMobileMenuOpen(false);
      if (walkOpenRef.current) {
        sfx.stopHum();
        setWalkOpen(false);
      }
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

    /* ---- canvases (the globe lives in its own effect — its section is
       members-only and mounts/unmounts with the session) ---- */
    const particlesInst = initParticles(idParticlesRef.current);

    /* ---- scroll-triggered Marvel reveals ---- */
    let revealObs = null;
    const groups = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      groups.forEach((g) => g.classList.add("in"));
    } else {
      revealObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            const el = en.target;
            if (en.isIntersecting && en.intersectionRatio > 0.4) {
              // add() is a no-op while already "in" — crossing the 1.0 threshold
              // right after 0.4 must not restart the animation mid-play.
              el.classList.add("in");
            } else if (!en.isIntersecting) {
              // re-arm the replay ONLY on a full exit. Removing at the same 0.4
              // line that adds meant any ratio jitter around the threshold (iOS
              // recomputes ratios as the toolbar shows/hides) toggled the class
              // and made the section content flicker up and down mid-scroll.
              el.classList.remove("in");
            }
          });
        },
        { threshold: [0, 0.4, 1] },
      );
      groups.forEach((g) => revealObs.observe(g));
    }
    revealObsRef.current = revealObs;

    /* ---- active-section scroll-spy (drives the nav highlight) ---- */
    let sectionObs = null;
    if ("IntersectionObserver" in window) {
      const ratios = new Map();
      sectionObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => ratios.set(en.target.getAttribute("data-page"), en.intersectionRatio));
          // a section can leave the DOM entirely (identity hides on login) — its
          // stale ratio must not keep winning the vote
          ratios.forEach((_, k) => {
            if (!document.querySelector(`[data-page="${k}"]`)) ratios.delete(k);
          });
          let best = null,
            bestR = 0;
          ratios.forEach((r, k) => {
            if (r > bestR) {
              bestR = r;
              best = k;
            }
          });
          if (best && bestR > 0.4) setActiveSection((prev) => (prev === best ? prev : best));
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      document.querySelectorAll("[data-page]").forEach((el) => sectionObs.observe(el));
    }
    sectionObsRef.current = sectionObs;

    /* ---- spidey swing-in + landing thump when the tracker section enters view ---- */
    let spideyObs = null;
    let spideyLandT = null;
    const spideyInitT = setTimeout(() => {
      const wrap = document.querySelector(".tracker-spidey");
      const sec = document.querySelector("section[data-page='tracker']");
      if (!wrap || !sec || !("IntersectionObserver" in window)) {
        if (wrap) wrap.classList.add("play");
        return;
      }
      spideyObs = new IntersectionObserver(
        (entries) => {
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
        },
        { threshold: [0, 0.35, 1] },
      );
      spideyObs.observe(sec);
    }, 140);

    /* ---- full-section cinematic pager (desktop only; mobile scrolls natively) ---- */
    let pageIndex = 0,
      paging = false;
    // Wheel gating by MOMENTUM DECAY, not by a time gap (fullpage.js-style). No
    // single time threshold can separate a fling's inertial tail from a fresh
    // scroll — a too-short gap double-advances on the tail, a too-long one jams
    // fast scrolling. Magnitude does separate them: a deliberate flick/notch
    // keeps the recent average at/above the wider window, while inertia decays
    // monotonically (recent average drops below the wider one). So ACTIVE fast
    // scrolling keeps advancing (no lag/lockout) yet one fling = one section.
    let wheelSamples = []; // trailing |deltaY| magnitudes
    let wheelLastTs = 0;
    let wheelBlockUntil = 0; // post-transition cooldown — see onWheel
    const avgTail = (arr, n) => {
      const start = Math.max(0, arr.length - n);
      let sum = 0;
      for (let i = start; i < arr.length; i++) sum += arr[i];
      return sum / (arr.length - start || 1);
    };
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
      // be gliding when the shutter reopens. iOS Safari also runs snap physics
      // on PROGRAMMATIC jumps — with scroll-snap-stop: always it clamps any
      // hop past the adjacent section (menu/logo jumps landed one section over
      // or reverted) — so snapping is suspended for the hop. Restoring it on a
      // fixed two-frame delay proved TOO EARLY on real phones: WebKit re-ran
      // the snap from still-in-flight momentum state and yanked the page back
      // to the origin (nav/logo jumps blinked but never moved). The position is
      // now re-pinned every frame until it has held the target for two
      // consecutive frames (20-frame safety valve), and only then does snapping
      // return — by then the target top IS the nearest snap point, so the
      // restore has nowhere to fling the page.
      const html = document.documentElement;
      html.style.scrollSnapType = "none";
      // suspend the CSS smooth-scroll too: belt-and-braces so no engine can
      // turn a pin into a glide while the watch loop measures "did it hold"
      html.style.scrollBehavior = "auto";
      const restore = () => {
        html.style.scrollSnapType = "";
        html.style.scrollBehavior = "";
      };
      const pin = () => window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
      pin();
      let stuck = 0,
        frames = 0;
      const watch = () => {
        // target can leave the DOM mid-watch (identity section hides on login)
        if (!target.isConnected) {
          restore();
          return;
        }
        if (Math.abs(target.getBoundingClientRect().top) > 1) {
          pin();
          stuck = 0;
        } else stuck++;
        // 60-frame safety valve (~1s): the old 20 ran out mid-toolbar-animation
        // on iOS, restoring snap while the position was still off — the
        // mandatory re-snap then yanked the page back to where it came from
        if (stuck >= 2 || ++frames > 60) restore();
        else requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
      kickRAF();
    };
    const revealPage = (el) => {
      if (reduceMotion || !el) return;
      const content = el.querySelector("[data-page-content]") || el;
      content.animate(
        [
          { opacity: 0.15, transform: "translateY(36px) scale(0.99)", filter: "blur(5px)" },
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
        ],
        { duration: 640, delay: 40, easing: "cubic-bezier(.16,.84,.3,1)", fill: "backwards" },
      );
    };
    const transDissolve = (target, done) => {
      revealPage(target);
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      scrollTween(target, 1050, ease, done);
    };
    const transCamera = (target, done) => {
      const content = target.querySelector("[data-page-content]") || target;
      content.animate(
        [
          { transform: "perspective(1400px) rotateX(14deg) translateY(70px) scale(0.94)", opacity: 0.15, filter: "blur(9px)" },
          { transform: "perspective(1400px) rotateX(0deg) translateY(0) scale(1)", opacity: 1, filter: "blur(0)" },
        ],
        { duration: 950, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards" },
      );
      const c1 = 1.20158,
        c3 = c1 + 1;
      const ease = (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      scrollTween(target, 780, ease, done);
    };
    const transShutter = (target, done) => {
      const t = barTopRef.current,
        b = barBottomRef.current;
      // phones get a slower, weightier blink (+200ms total per design
      // feedback — it also buys scrollInstant's pin-watch more cover time);
      // desktop keeps the snappy timing
      const closeMs = isDesktopRef.current ? 180 : 280,
        openMs = isDesktopRef.current ? 260 : 360;
      const cEase = "cubic-bezier(.5,0,.15,1)";
      if (t && b) {
        t.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: closeMs, easing: cEase, fill: "forwards" });
        b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: closeMs, easing: cEase, fill: "forwards" });
      }
      setTimeout(() => {
        // a throw in the jump (target unmounting mid-flight, engine quirks)
        // must never stop the bars from reopening or `done` from running —
        // `paging` would wedge true and every later nav/menu jump would no-op
        try {
          scrollInstant(target);
          revealPage(target);
        } catch {}
        if (t && b) {
          t.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: openMs, easing: cEase, fill: "forwards" });
          b.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], { duration: openMs, easing: cEase, fill: "forwards" });
        }
        setTimeout(() => {
          try {
            // iOS: momentum/snap physics still running when the blink fired can
            // drag the page off the target after scrollInstant — re-pin it
            if (Math.abs(target.getBoundingClientRect().top) > 8) scrollInstant(target);
          } catch {}
          done();
        }, openMs);
      }, closeMs + 30);
    };
    const transIris = (target, done) => {
      const ir = irisRef.current;
      const closeMs = 440,
        openMs = 580;
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
          a.onfinish = () => {
            ir.style.display = "none";
          };
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
        c.animate(
          [
            { transform: "scale(1.07)", filter: "blur(5px)", opacity: 0.4 },
            { transform: "scale(1)", filter: "blur(0)", opacity: 1 },
          ],
          { duration: 560, easing: "cubic-bezier(.16,.84,.3,1)", fill: "backwards" },
        );
      }, 170);
      setTimeout(done, 600);
    };

    const goToPage = (idx) => {
      const list = pages();
      idx = Math.max(0, Math.min(list.length - 1, idx));
      const targetEl = list[idx];
      if (!targetEl) return;
      // mobile: swipes and menu taps both land here — shutter-blink to the
      // target section (reduced motion falls back to a smooth scroll)
      if (!isDesktopRef.current) {
        if (paging) return;
        // already sitting exactly on the target: a blink with no movement
        // reads as a glitchy flicker (tapping the nav logo on the hero did)
        if (Math.abs(targetEl.getBoundingClientRect().top) < 8) {
          pageIndex = idx;
          return;
        }
        pageIndex = idx;
        if (reduceMotion) {
          // instant, not smooth: kinder to reduced-motion users, and iOS clamps
          // multi-section smooth scrolls to one snap stop anyway
          scrollInstant(targetEl);
        } else {
          paging = true;
          mobileBlinkBusyRef.current = true;
          transShutter(targetEl, () => {
            paging = false;
            mobileBlinkBusyRef.current = false;
          });
        }
        return;
      }
      // already on this section AND actually aligned to it — no transition/blink.
      // (if the scroll sits between sections, the "same" index still needs a snap)
      if (idx === pageIndex && Math.abs(targetEl.getBoundingClientRect().top) < 8) return;
      if (paging) return;
      paging = true;
      pageIndex = idx;
      const done = () =>
        setTimeout(() => {
          paging = false;
          // Brief wheel cooldown after the transition lands: a flick's inertia
          // can still read as "not decaying" right here and chain a second
          // advance. 350ms pushes the check into the tail where the decay
          // filter catches it; sustained deliberate scrolling just pages a
          // beat calmer, and keyboard/touch paths don't consult this.
          wheelBlockUntil = performance.now() + 350;
        }, 60);
      const style = reduceMotion ? "dissolve" : transStyle;
      if (style === "camera") transCamera(targetEl, done);
      else if (style === "shutter") transShutter(targetEl, done);
      else if (style === "iris") transIris(targetEl, done);
      else if (style === "flash") transFlash(targetEl, done);
      else transDissolve(targetEl, done);
    };
    goToPageRef.current = goToPage;

    /* deep link from the identity reveal (/#livingweb etc.): jump straight to
       the section — the walkthrough auto-open guard sees the scroll and skips */
    const hashKey = (window.location.hash || "").slice(1);
    if (hashKey) {
      const hashTarget = document.querySelector(`[data-page="${hashKey}"]`);
      if (hashTarget)
        setTimeout(() => {
          scrollInstant(hashTarget);
          pageIndex = pages().indexOf(hashTarget);
        }, 60);
    }

    const onWheel = (ev) => {
      if (!isDesktopRef.current) return; // mobile scrolls natively
      if (modalOpen()) return;
      // inner scrollers (the twins roster) keep native wheel scrolling
      if (ev.target && ev.target.closest && ev.target.closest("[data-scrollable]")) return;
      ev.preventDefault();
      if (!ev.deltaY) return;
      const now = performance.now();
      // A real pause (>200ms of silence) starts a fresh gesture buffer so the
      // next scroll reads as a clean spike, not a continuation of the last one.
      if (wheelSamples.length && now - wheelLastTs > 200) wheelSamples.length = 0;
      wheelLastTs = now;
      wheelSamples.push(Math.abs(ev.deltaY));
      if (wheelSamples.length > 80) wheelSamples.shift(); // bound the buffer
      if (paging || now < wheelBlockUntil) return; // swallow during the blink + landing cooldown
      // Advance only when the movement is NOT decaying: recent average (last ~10
      // events) at/above the wider window (last ~60). A fresh flick/notch spikes,
      // so recent≥wide → advance; a single fling's tail shrinks, so recent<wide →
      // ignored (kills the double-advance). Sustained fast scrolling keeps
      // recent≈wide → keeps advancing once per transition (kills the lag).
      if (avgTail(wheelSamples, 10) < avgTail(wheelSamples, 60)) return;
      // The global check misses inertia's EARLY decay right after a transition:
      // the wide window is dragged down by the gesture's quiet ramp-up, so the
      // peak-heavy recent still reads "sustained" and chains a second advance.
      // Compare the last 5 events against the 5 just before them instead —
      // active input holds level (steady decay runs ~0.47 per 5 events, well
      // under the 0.85 line; hand wobble stays above it).
      const older = wheelSamples.slice(-10, -5);
      if (older.length >= 3 && avgTail(older, 5) * 0.85 > avgTail(wheelSamples, 5)) return;
      // A gesture's opening events must show real intent: small deltas right
      // after a buffer reset are a momentum tail's last sparse breaths (>200ms
      // apart), not a new scroll — without this they'd read as a fresh gesture
      // and chain an extra advance. Real gestures clear 8px within 3 events
      // (a mouse notch is ~120 on its first); tail crumbs stay under it.
      if (wheelSamples.length <= 3 && Math.abs(ev.deltaY) < 8) return;
      const nxt = nextPageIdx(ev.deltaY > 0 ? 1 : -1);
      if (nxt < 0) return; // nothing above the first / below the last
      goToPage(nxt);
    };
    const onPagerKey = (ev) => {
      if (!isDesktopRef.current || modalOpen() || paging) return;
      // typing in a field (the MJ composer): arrows move the caret, not the pager
      const t = ev.target;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (["ArrowDown", "PageDown"].includes(ev.key)) {
        ev.preventDefault();
        const n = nextPageIdx(1);
        if (n >= 0) goToPage(n);
      } else if (["ArrowUp", "PageUp"].includes(ev.key)) {
        ev.preventDefault();
        const n = nextPageIdx(-1);
        if (n >= 0) goToPage(n);
      }
    };
    /* Phones scroll 100% NATIVELY. The old JS pager (preventDefault + its own
       flip) fought iOS momentum and CSS snap — swipes randomly died in one
       direction or the other. CSS does the paging instead: every section has
       scroll-snap-align: start + scroll-snap-stop: always, which native
       physics respect reliably (one swipe advances one section; areas taller
       than the viewport scroll freely inside). The shutter still blinks via
       the scroll-spy reaction effect (bars only, no scrolling). Desktop
       touchscreens keep the pager: their wheel path already owns the scroll. */
    let touchStartY = null;
    const onTouchStart = (ev) => {
      touchStartY = ev.touches[0].clientY;
    };
    const onTouchMove = (ev) => {
      if (!isDesktopRef.current) return; // phones: native scroll + CSS snap
      if (modalOpen() || touchStartY == null) return;
      // inner scrollers (the twins roster) keep native touch scrolling
      if (ev.target && ev.target.closest && ev.target.closest("[data-scrollable]")) return;
      ev.preventDefault();
    };
    const onTouchEnd = (ev) => {
      if (!isDesktopRef.current) {
        touchStartY = null;
        return;
      }
      if (modalOpen() || paging || touchStartY == null) {
        touchStartY = null;
        return;
      }
      const endY = (ev.changedTouches && ev.changedTouches[0].clientY) || touchStartY;
      const diff = touchStartY - endY;
      touchStartY = null;
      if (Math.abs(diff) > 50) {
        const n = nextPageIdx(diff > 0 ? 1 : -1);
        if (n >= 0) goToPage(n);
      }
    };

    /* ---- mobile shutter blink: fire the instant a native swipe crosses into a
       new section, read straight from scroll geometry. The activeSection scroll-
       spy (which drives the nav highlight) only flips at 40% visibility — ~1s
       after the snap settles — so driving the blink off it lagged the swipe.
       center-of-viewport flips as soon as you're past halfway, right when a
       shutter should fire. rAF-throttled so it costs one check per frame. ---- */
    let blinkSection = null,
      blinkRAF = 0;
    const nearestSection = () => {
      const mid = (window.innerHeight || 800) / 2;
      const list = pages();
      for (const el of list) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) return el.getAttribute("data-page");
      }
      return list[0] ? list[0].getAttribute("data-page") : null;
    };
    const onMobileBlinkScroll = () => {
      if (isDesktopRef.current || blinkRAF) return;
      blinkRAF = requestAnimationFrame(() => {
        blinkRAF = 0;
        const cur = nearestSection();
        if (cur === blinkSection) return;
        const first = blinkSection === null;
        blinkSection = cur;
        // first paint arms the tracker; a programmatic goToPage blink (menu taps,
        // hash/rail jumps) already flags mobileBlinkBusyRef so we don't double-fire
        if (first || mobileBlinkBusyRef.current || reduceMotion) return;
        const t = barTopRef.current,
          b = barBottomRef.current;
        if (!t || !b) return;
        const frames = [{ transform: "scaleY(0)" }, { transform: "scaleY(1)", offset: 0.45 }, { transform: "scaleY(0)" }];
        const opts = { duration: 580, easing: "cubic-bezier(.5,0,.15,1)" }; // +200ms per design feedback (was 380)
        t.animate(frames, opts);
        b.animate(frames, opts);
      });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onPagerKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onMobileBlinkScroll, { passive: true });

    /* ---- typewriter placeholder for the MJ message field ---- */
    const twFull = "Write your message to MJ...";
    let twI = 0,
      twDir = 1,
      twDelay = 600,
      twTimer = null;
    const twTick = () => {
      const el = document.getElementById("mj-textarea");
      if (el) {
        if (el.value && el.value.length) {
          el.setAttribute("placeholder", "");
        } else {
          twI += twDir;
          if (twI >= twFull.length) {
            twI = twFull.length;
            twDir = -1;
            twDelay = 2000;
          } else if (twI <= 0) {
            twI = 0;
            twDir = 1;
            twDelay = 1000;
          } else {
            twDelay = twDir > 0 ? 70 : 34;
          }
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
      window.removeEventListener("scroll", onMobileBlinkScroll);
      if (raf) cancelAnimationFrame(raf);
      if (blinkRAF) cancelAnimationFrame(blinkRAF);
      clearTimeout(walkInT);
      clearTimeout(twTimer);
      if (revealObs) revealObs.disconnect();
      if (sectionObs) sectionObs.disconnect();
      if (spideyObs) spideyObs.disconnect();
      clearTimeout(spideyInitT);
      if (spideyLandT) clearTimeout(spideyLandT);
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

  /* the identity + Living Web sections mount/unmount with the session —
     observe any fresh [data-reveal]/[data-page] nodes (observe() is a no-op on
     ones already tracked) and re-measure the cached section offsets */
  useEffect(() => {
    document.querySelectorAll("[data-reveal]").forEach((el) => revealObsRef.current && revealObsRef.current.observe(el));
    document.querySelectorAll("[data-page]").forEach((el) => sectionObsRef.current && sectionObsRef.current.observe(el));
    window.dispatchEvent(new Event("resize"));
  }, [hideIdentity, showLivingWeb]);

  /* the Living Web keeps its revealed (twin) state once the user opens it */
  useEffect(() => {
    try {
      if (localStorage.getItem("bnd_twins_revealed") === "1") setTwinMode(true);
    } catch {}
  }, []);

  /* twin roster — the count plus up to 50 random members sharing the avatar */
  useEffect(() => {
    if (!twinMode || !user) return;
    let on = true;
    setTwinData(null);
    setTwinsVisible(TWIN_PAGE);
    portalApi("/twins")
      .then((d) => {
        if (on) setTwinData({ count: d.count || 0, twins: Array.isArray(d.twins) ? d.twins : [] });
      })
      .catch(() => {
        if (on) setTwinData({ count: 0, twins: [], failed: true });
      });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinMode, user?.id]);

  /* the Living Web section is members-only, so its canvas mounts/unmounts with
     the session — (re)initialize the globe whenever the section appears */
  useEffect(() => {
    if (!showLivingWeb) return;
    const globeInst = initGlobe(globeRef.current, { getTwinActive: () => twinModeRef.current });
    return () => globeInst.destroy();
  }, [showLivingWeb]);

  /* phones scroll natively (CSS snap pages the sections) — the shutter blink is
     driven imperatively from scroll geometry inside the mount effect (see
     "mobile shutter blink"), NOT from the activeSection scroll-spy: that spy only
     flips at 40% visibility, ~1s after the snap settles, so the blink lagged the
     swipe badly. Reading the center-of-viewport section fires it mid-swipe. */

  /* lock the page scroll while any popup is up — otherwise the page drifts
     to a halfway point behind the popup and the pager blinks oddly after it
     closes (popups keep their own internal scrolling) */
  useEffect(() => {
    const lock = walkOpen || trailerOpen || mobileMenuOpen || authOpen;
    document.documentElement.style.overflow = lock ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [walkOpen, trailerOpen, mobileMenuOpen, authOpen]);

  /* NOTE: the /stats fetch that fed "you share your identity with N members
     across M countries" left with the parked twins reveal — it returns when
     real twin matching ships. */

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
    else if (action === "mjwall")
      router.push("/mj-wall"); // MJ Wall detail page
    else if (action === "tracker")
      goToSection("tracker"); // Spidey Tracker section
    else router.push("/forum");
  };

  // pending post-send redirect to the wall — cancelled by "Write another" and on unmount
  const mjRedirectTRef = useRef(null);
  useEffect(() => () => clearTimeout(mjRedirectTRef.current), []);

  const onMjSubmit = async () => {
    if (!mjMessage.trim()) {
      mjInputRef.current && mjInputRef.current.focus();
      return;
    }
    if (!user) {
      openAuth("login");
      return;
    }
    if (mjSending) return;
    dismissKeyboard(); // retract the mobile keyboard the moment they send
    setMjSending(true);
    setMjError("");
    try {
      await portalApi("/mj-wall/messages", { method: "POST", body: { body: mjMessage } });
      setMjSent(true);
      sfxRef.current && sfxRef.current.play("click");
      // no local handoff to the wall page — the message is pending moderation
      // and must not show on the wall until an admin approves it
      mjRedirectTRef.current = setTimeout(() => router.push("/mj-wall"), 1400);
    } catch (err) {
      if (err.code === "quiz_required") {
        window.location.href = "/quiz";
        return;
      }
      setMjError(err.message || "Couldn't send your message. Try again.");
    } finally {
      setMjSending(false);
    }
  };

  /* twin-mode card: identity accents + the reveal-screen tilt/glare effect
     (same DOM-driven handlers as /quiz — no re-renders per pointer move) */
  const heroColor = user?.avatar?.color || "#ff2f40";
  const heroGlow = heroColor + "55";
  const twinTiltRef = useRef(null);
  const twinGlareRef = useRef(null);
  const onTwinTilt = (e) => {
    const el = twinTiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(px * 16).toFixed(2)}deg) rotateX(${(-py * 16).toFixed(2)}deg) scale(1.04)`;
    if (twinGlareRef.current) {
      twinGlareRef.current.style.opacity = "1";
      twinGlareRef.current.style.background = `radial-gradient(circle at ${((px + 0.5) * 100).toFixed(1)}% ${((py + 0.5) * 100).toFixed(1)}%, rgba(255,255,255,0.3), transparent 42%)`;
    }
  };
  const onTwinTiltOut = () => {
    if (twinTiltRef.current) twinTiltRef.current.style.transform = "rotateY(0) rotateX(0) scale(1)";
    if (twinGlareRef.current) twinGlareRef.current.style.opacity = "0";
  };
  /* roster scroll-pagination: nearing the bottom reveals the next TWIN_PAGE rows */
  const onTwinsScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 56) return;
    setTwinsVisible((v) => (twinData && v < twinData.twins.length ? Math.min(v + TWIN_PAGE, twinData.twins.length) : v));
  };

  // Which section (if any) each nav item corresponds to — drives the active highlight.
  const navSections = [null, "mjwall", null, "tracker"];
  const navItems = ["TRAILER", "MJ WALL", "FORUM", "SPIDEY TRACKER"].map((label, i) => {
    const action = ["trailer", "mjwall", "forum", "tracker"][i];
    const active = !!navSections[i] && navSections[i] === activeSection;
    return {
      label,
      locked: false,
      active,
      color: active ? "#ff5a6a" : "#fff",
      cursor: "pointer",
      title: "",
      onClick: (e) => {
        e.preventDefault();
        doNav(action);
      },
      onMobileClick: (e) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        doNav(action);
      },
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
    transform: walkOpen ? "perspective(1600px) rotateX(0deg) translateY(0) scale(1)" : "perspective(1600px) rotateX(22deg) translateY(90px) scale(0.72)",
    filter: walkOpen ? "blur(0)" : "blur(14px)",
  };
  // Every walkthrough card is a real CTA. Two hide with session state: members
  // who already have their identity lose "Discover Your Spider Identity", and
  // members who already revealed their twins lose "Find Your Spider Twins".
  const walkItems = WALK_ITEMS.filter((w) => !(hideIdentity && w.action === "identity") && !(user && twinMode && w.action === "twins")).map((w, i) => ({
    ...w,
    delay: (walkOpen ? 620 + i * 150 : 0) + "ms",
    onClick: () => {
      sfxRef.current && sfxRef.current.play("click");
      sfxRef.current && sfxRef.current.stopHum();
      setWalkOpen(false);
      if (w.action === "trailer") setTrailerOpen(true);
      else if (w.action === "identity") goToForm();
      else if (w.action === "twins") {
        if (user) goToSection("livingweb");
        else openAuth("register");
      } else doNav(w.action); // mjwall → /mj-wall, forum → /forum, tracker → section
    },
  }));

  // combined spidey+web art: spidey himself is ~47% of the image width, so
  // these run ~2× the old spidey-only widths to keep him the same size
  // (desktop shrunk 10% + raised 35px per design feedback)
  const spideyWidth = isDesktop ? "clamp(576px, 59.4vw, 1035px)" : "130vw";
  const spideyTop = isDesktop ? "calc(clamp(48px, 8vh, 96px) - 35px)" : "clamp(48px, 8vh, 96px)";
  const logoWidth = isDesktop ? "min(720px, 42vw)" : "82vw";
  const railSections = RAIL_SECTIONS.filter((sec) => !(hideIdentity && sec.key === "identity") && !(!showLivingWeb && sec.key === "livingweb"));
  const railIdx = Math.max(
    0,
    railSections.findIndex((sec) => sec.key === activeSection),
  );

  const onWalkHover = () => sfxRef.current && sfxRef.current.play("hover");

  // stage overflow-x is clip (not hidden) — hidden makes the div a
  // programmatic horizontal scroller, and focusing an element that pokes past
  // the edge (iOS) scrolls it sideways with no way to pan back, cutting every
  // section off. clip forbids scrolling entirely.
  return (
    <div ref={stageRef} style={s("position: relative; width: 100%; min-height: 100vh; background: #0a0a0c; overflow-x: clip;")}>
      {/* ================= HERO ================= */}
      <div data-page="hero" style={s("position: relative; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always;")}>
        {/* BG LAYER — phones get the dedicated portrait banner (its rooftop
            figure IS the hero there, so the desktop decorations hide too) */}
        <div ref={bgRef} style={s("position: absolute; inset: 0; z-index: 1; will-change: transform; transform-origin: 50% 15%;")}>
          {/* 760px matches the isDesktop JS breakpoint */}
          <picture>
            <source media="(min-width: 760px)" srcSet={HERO_BG_DESKTOP_SET} />
            <img {...HERO_BG_IMG} alt="" srcSet={HERO_BG_MOBILE_SET} style={{ ...HERO_BG_IMG.style, objectFit: "cover", objectPosition: "50% 0%", userSelect: "none", pointerEvents: "none" }} />
          </picture>
        </div>

        {/* SUN GLOW (desktop art only — the mobile banner bakes in its own flare) */}
        <div className="bnd-hero-deco" style={s("position: absolute; top: 4%; left: 19%; width: 520px; height: 520px; z-index: 2; border-radius: 50%; background: radial-gradient(circle, rgba(255,236,200,0.55) 0%, rgba(255,180,90,0.15) 40%, transparent 70%); filter: blur(8px); animation: bnd-glow-breath 4500ms ease-in-out infinite; pointer-events: none;")}></div>

        {/* SPIDEY + WEB (one combined artwork — also floats on phones; only the
            glow decoration hides there). Spidey fills ~47% of the art's width,
            so the container runs ~2× the old spidey width to keep him the same
            on-screen size. */}
        <div ref={spideyWrapRef} className="bnd-hero-deco bnd-hero-spidey" style={s(`position: absolute; top: ${spideyTop}; left: 50%; z-index: 15; pointer-events: none; transform: translateX(calc(-50% - 11vw - 10px));`)}>
          {/* the isDesktop-driven inline sizes here and on the logo below default
              to DESKTOP on the server — globals.css !important rules (mobile
              media query, same values as the JS) keep the first phone paint
              correct until hydration takes over */}
          <div className="bnd-hero-spidey-art" style={s(`position: relative; width: ${spideyWidth}; aspect-ratio: 1210/877; will-change: transform; animation: bnd-spidey-bob 5s ease-in-out infinite; animation-delay: -1s;`)}>
            <img src="/assets/spidey-web-hero.png" alt="Spider-Man" style={s("width: 100%; height: 100%; display: block; filter: drop-shadow(0 30px 50px rgba(0,0,0,0.55)) drop-shadow(0 8px 18px rgba(255,120,40,0.18));")} />
          </div>
        </div>

        {/* HERO TYPE STACK (logo) */}
        <div ref={heroStackRef} className="bnd-hero-stack" style={s("position: absolute; left: 0; right: 0; bottom: clamp(40px, 7vh, 96px); z-index: 10; display: flex; flex-direction: column; align-items: center; pointer-events: none; will-change: transform;")}>
          <div style={s("position: relative; z-index: 1; width: 100%; display: flex; justify-content: center;")}>
            <div ref={logoRef} className="bnd-hero-logo" style={s(`position: relative; width: ${logoWidth}; will-change: transform; animation: bnd-logo-punch 1200ms 750ms cubic-bezier(.16,.84,.3,1) both;`)}>
              <img src="/assets/logo.png" alt="Spider-Man: Brand New Day" style={s("width: 100%; height: auto; display: block; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(214,2,26,0.25));")} />
            </div>
          </div>
        </div>
      </div>

      {/* ================= FIND YOUR IDENTITY ================= */}
      {!hideIdentity && (
        <section
          data-page="identity"
          data-screen-label="Find Your Identity"
          style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a0512; background-image: url('/assets/who-are-you-desktop.jpeg'); background-size: cover; background-position: center; background-repeat: no-repeat; display: flex; align-items: center; justify-content: center;")}
        >
          <div style={s("position: absolute; inset: 0; background: linear-gradient(180deg, rgba(6,3,10,0.5) 0%, rgba(6,3,10,0.2) 30%, rgba(5,3,10,0.36) 62%, rgba(3,2,6,0.72) 100%); pointer-events: none;")}></div>
          <div style={s("position: absolute; inset: 0; background: radial-gradient(120% 90% at 50% 40%, rgba(120,20,34,0.1) 0%, rgba(20,10,30,0.18) 60%, rgba(6,4,14,0.3) 100%); mix-blend-mode: multiply; pointer-events: none;")}></div>
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
            <h2 className="bnd-head" style={s("animation-delay: 190ms; margin: 0; font-size: clamp(30px, 5.2vw, 70px); line-height: 0.94; font-weight: 500; letter-spacing: 0.005em; color: #fff; text-shadow: 0 6px 40px rgba(0,0,0,0.7), 0 0 70px rgba(214,2,26,0.22); text-wrap: balance;")}>
              Who Are You <span style={{ color: "#ff2f40" }}>Under the Mask?</span>
            </h2>
            <p className="bnd-line" style={s("animation-delay: 430ms; margin: clamp(14px, 2.4vh, 22px) auto clamp(26px, 4vh, 40px); max-width: 560px; font-size: clamp(13px, 1.35vw, 16px); line-height: 1.6; color: rgba(232,232,244,0.82); text-shadow: 0 2px 12px rgba(0,0,0,0.7); text-wrap: pretty;")}>
              Every Spider-Man carries something different. Answer a few questions and discover the identity that has always been yours.
            </p>
            <button
              onClick={() => {
                sfxRef.current && sfxRef.current.play("click");
                goToForm();
              }}
              onMouseEnter={onWalkHover}
              data-web-hover="true"
              className="bnd-cta bnd-line"
              style={s("animation-delay: 590ms; position: relative; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}
            >
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); box-shadow: 0 14px 36px rgba(214,2,26,0.4);")}>
                <span
                  className="bnd-cta-inner"
                  style={s(
                    "display: block; padding: 14px 38px; background: linear-gradient(180deg, #ff3a4a 0%, #c00014 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); color: #fff; font-family: 'Oswald', 'Acumin Pro', sans-serif; font-weight: 500; font-size: clamp(13px, 1.4vw, 15px); letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.4);",
                  )}
                >
                  <span className="bnd-cta-sheen"></span>Reveal My Identity
                </span>
              </span>
            </button>
            <div className="bnd-line" style={s("animation-delay: 700ms; margin-top: clamp(14px, 2.2vh, 20px); display: inline-flex; align-items: center; gap: 7px; font-size: clamp(9px, 1vw, 11px); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(226,226,240,0.5);")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              Takes less than a minute
            </div>
          </div>
        </section>
      )}

      {/* ================= THE LIVING WEB (members only) ================= */}
      {showLivingWeb && (
        <section data-page="livingweb" data-screen-label="The Living Web" style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background: radial-gradient(120% 100% at 50% 26%, #0b1226 0%, #070711 55%, #040409 100%);")}>
          <div className="lw-map" style={s("position: absolute; top: 12%; bottom: 12%; left: 45%; transform: translateX(-50%); width: 84%; z-index: 1;")}>
            {/* kept well under 1 — at 0.95 the map outshone the chips/header/cards on top */}
            <canvas ref={globeRef} style={s("position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.5; pointer-events: none;")}></canvas>
          </div>
          <div style={s("position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4,4,9,0.9) 0%, rgba(4,4,9,0.35) 26%, transparent 42%, transparent 60%, rgba(4,4,9,0.4) 78%, rgba(4,4,9,0.86) 100%); pointer-events: none;")}></div>
          <div style={s("position: absolute; inset: 0; background: linear-gradient(180deg, rgba(4,4,9,0.5) 0%, transparent 20%, transparent 62%, rgba(4,4,9,0.9) 100%); pointer-events: none;")}></div>

          {/* city marker chips */}
          <div className="lw-map" style={s("position: absolute; top: 12%; bottom: 12%; left: 45%; transform: translateX(-50%); width: 84%; z-index: 3; pointer-events: none;")}>
            {MAP_CHIPS.map((c, i) => (
              <div key={i} style={s(`position: absolute; left: ${c.x}; top: ${c.y}; transform: translate(-50%, -50%); pointer-events: none;`)}>
                {/* twin view: names/flags off the background — every city is a plain ping */}
                {c.labeled && !(twinMode && user) ? (
                  <div style={s("display: inline-flex; align-items: center; gap: 8px; padding: 6px 11px; border-radius: 9px; background: rgba(10,12,24,0.82); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 6px 18px rgba(0,0,0,0.5); backdrop-filter: blur(4px); white-space: nowrap;")}>
                    <span style={s("flex-shrink: 0; width: 22px; height: 15px; border-radius: 2px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,0.15);")}>
                      <Flag code={c.flagCode} />
                    </span>
                    <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #fff;")}>{c.country}</span>
                  </div>
                ) : (
                  <span title={c.city} style={s("display: block; width: 8px; height: 8px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, rgba(255,114,128,0.8), rgba(214,2,26,0.7)); box-shadow: 0 0 6px 1px rgba(255,60,74,0.28), 0 0 0 1px rgba(255,255,255,0.1);")}></span>
                )}
              </div>
            ))}
          </div>

          {!(twinMode && user) && (
            <>
              {/* centered header */}
              <div data-page-content data-reveal className="bnd-reveal" style={s(`position: absolute; left: 0; right: 0; ${isDesktop ? "bottom: clamp(52px, 9vh, 96px);" : "top: 0; bottom: 0; justify-content: center;"} z-index: 6; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 24px;`)}>
                <h2 className="bnd-head" style={s("animation-delay: 120ms; margin: 0; font-family: 'Oswald', sans-serif; font-style: italic; font-size: clamp(22px, 3.4vw, 46px); line-height: 1; font-weight: 600; letter-spacing: 0.01em; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6); white-space: nowrap;")}>
                  The Web grows a little <span style={{ color: "#ff2f40" }}>every second.</span>
                </h2>
                <p className="bnd-line" style={s("animation-delay: 310ms; margin: 12px 0 0; font-size: clamp(11px, 1.3vw, 15px); line-height: 1.5; color: rgba(226,226,240,0.72); white-space: nowrap;")}>
                  While you were finding your identity, thousands of others were finding theirs too.
                </p>
                <button
                  className="bnd-line bnd-cta"
                  onClick={() => {
                    sfxRef.current && sfxRef.current.play("click");
                    if (!user) {
                      openAuth("register");
                      return;
                    }
                    setTwinMode(true);
                    try {
                      localStorage.setItem("bnd_twins_revealed", "1");
                    } catch {}
                  }}
                  onMouseEnter={onWalkHover}
                  data-web-hover="true"
                  style={s("animation-delay: 460ms; margin-top: clamp(16px, 2.4vh, 24px); border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}
                >
                  <span style={s("display: block; padding: 2px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px);")}>
                    <span
                      className="bnd-cta-inner"
                      style={s("display: inline-flex; align-items: center; gap: 10px; padding: 13px 30px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: clamp(12px, 1.3vw, 14px); letter-spacing: 0.18em; text-transform: uppercase;")}
                    >
                      <span className="bnd-cta-sheen"></span>Find your Web Twins <span style={{ fontSize: "15px" }}>→</span>
                    </span>
                  </span>
                </button>
              </div>
            </>
          )}

          {/* TWIN MODE — members only. Left: your assigned collectible card with
            the Spidey Code above it (same treatment as the quiz reveal).
            Right: the live twins roster — how many members share the identity,
            a scroll-paginated random 50 of them, and the retake-quiz CTA. */}
          {twinMode && user && (
            <div className="bnd-reveal in" style={s(`position: absolute; inset: 0; z-index: 7; box-sizing: border-box; padding: ${isDesktop ? "clamp(76px, 11vh, 110px) clamp(24px, 5vw, 70px) clamp(22px, 4vh, 36px)" : "64px 18px 14px"}; display: flex; align-items: center; justify-content: center;`)}>
              <div style={s(`width: 100%; max-width: 1100px; display: flex; flex-direction: ${isDesktop ? "row" : "column"}; align-items: center; justify-content: center; gap: ${isDesktop ? "clamp(40px, 6vw, 96px)" : "16px"};`)}>
                {/* ---- your identity: Spidey Code over the collectible card ---- */}
                <div style={s("flex-shrink: 0; display: flex; flex-direction: column; align-items: center; min-width: 0;")}>
                  <div className="bnd-line" style={s(`animation-delay: 80ms; display: inline-flex; align-items: center; gap: 10px; margin-bottom: ${isDesktop ? "clamp(14px, 2.2vh, 22px)" : "10px"}; flex-wrap: wrap; justify-content: center;`)}>
                    <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, transparent, ${heroColor})` }}></span>
                    <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>Spidey Code</span>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: "0.2em", color: heroColor, textShadow: `0 0 12px ${heroGlow}` }}>{user.spideyCode || "—"}</span>
                    <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, ${heroColor}, transparent)` }}></span>
                  </div>

                  {user.avatar?.card ? (
                    /* the assigned collectible card, with the reveal-screen effect
                     (entry punch, ambient glow, float, pointer tilt + glare) */
                    <div style={s("perspective: 1200px; animation: ri-card-in 1s cubic-bezier(.16,.84,.3,1) both;")}>
                      <div ref={twinTiltRef} onMouseMove={onTwinTilt} onMouseLeave={onTwinTiltOut} style={s("position: relative; display: inline-block; will-change: transform; transition: transform .3s cubic-bezier(.16,.84,.3,1);")}>
                        <div style={{ position: "absolute", inset: "-6% -6% -2%", borderRadius: 22, background: `radial-gradient(circle at 50% 40%, ${heroGlow} 0%, transparent 68%)`, filter: "blur(22px)", animation: "ri-pulse-glow 4.5s ease-in-out infinite", pointerEvents: "none" }}></div>
                        <img src={user.avatar.card} alt={user.avatar.name} style={s(`position: relative; display: block; height: ${isDesktop ? "min(46vh, 440px)" : "min(22vh, 190px)"}; max-width: 80vw; width: auto; filter: drop-shadow(0 30px 60px rgba(0,0,0,0.6)); animation: ri-card-float 6s ease-in-out infinite;`)} />
                        <div ref={twinGlareRef} style={s("position: absolute; inset: 0; border-radius: 18px; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.28), transparent 45%); opacity: 0; pointer-events: none; transition: opacity .3s ease;")}></div>
                      </div>
                    </div>
                  ) : (
                    /* emblem fallback while this identity has no card art yet */
                    <div style={s(`position: relative; width: ${isDesktop ? "clamp(120px, 18vh, 170px)" : "clamp(90px, 14vh, 130px)"}; height: ${isDesktop ? "clamp(120px, 18vh, 170px)" : "clamp(90px, 14vh, 130px)"};`)}>
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${heroColor}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite" }}></span>
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${heroColor}`, opacity: 0.4, animation: "ri-ring 2.4s ease-out infinite 1.2s" }}></span>
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 42%, rgba(30,12,20,0.9), rgba(8,6,14,0.95))", display: "flex", alignItems: "center", justifyContent: "center", "--gl": heroGlow, animation: "ri-emblem 3.4s ease-in-out infinite" }}>
                        <svg viewBox="0 0 100 100" style={{ width: "58%", height: "58%" }} fill="none" stroke={heroColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="50" cy="44" rx="9" ry="12" />
                          <path d="M50 32V16M42 36 22 26M58 36l20-10M43 52 27 66M57 52l16 14M50 56v20" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* ---- the twins roster ---- */}
                <div className="bnd-line" style={s(`animation-delay: 260ms; width: ${isDesktop ? "min(440px, 44vw)" : "min(440px, 100%)"}; min-width: 0;`)}>
                  <div style={{ padding: 1, background: `linear-gradient(160deg, ${heroGlow}, rgba(255,255,255,0.09) 55%, rgba(255,255,255,0.04))`, clipPath: "polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
                    <div style={s(`background: linear-gradient(165deg, rgba(13,13,24,0.92), rgba(7,7,14,0.95)); clip-path: polygon(17px 0, 100% 0, 100% calc(100% - 17px), calc(100% - 17px) 100%, 0 100%, 0 17px); padding: ${isDesktop ? "20px 22px 16px" : "14px 14px 12px"}; backdrop-filter: blur(6px);`)}>
                      {/* live eyebrow */}
                      <div style={s("display: inline-flex; align-items: center; gap: 8px; margin-bottom: 10px;")}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: heroColor, boxShadow: `0 0 8px ${heroGlow}`, animation: "bnd-blip 2s ease-in-out infinite" }}></span>
                        <span style={s("font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>The Living Web · Matches</span>
                      </div>

                      {/* the count — the headline of the reveal */}
                      <div style={s("display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;")}>
                        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: isDesktop ? 46 : 34, lineHeight: 1, color: heroColor, textShadow: `0 0 24px ${heroGlow}` }}>{twinData ? twinData.count : "—"}</span>
                        <span style={s("font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: #fff;")}>Web Twin{twinData && twinData.count === 1 ? "" : "s"} found</span>
                      </div>
                      <p style={s(`margin: 8px 0 0; font-size: ${isDesktop ? "13.5px" : "12.5px"}; line-height: 1.55; color: rgba(226,226,240,0.66); text-wrap: pretty;`)}>
                        Members around the world who unmasked as <span style={{ color: heroColor, fontWeight: 600 }}>{user.avatar?.name || "your identity"}</span> — the same Spider as you.
                      </p>

                      {/* roster — 5 rows tall, scrolling reveals 5 more at a time */}
                      {!twinData ? (
                        <div style={s("padding: 24px 0 16px; display: flex; align-items: center; gap: 10px; font-family: 'Oswald', sans-serif; font-size: 11px; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.5);")}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: heroColor, boxShadow: `0 0 8px ${heroGlow}`, animation: "bnd-blip 1.2s ease-in-out infinite" }}></span>
                          Searching the Web…
                        </div>
                      ) : twinData.twins.length === 0 ? (
                        <p style={s("margin: 16px 0 12px; font-size: 13.5px; line-height: 1.6; color: rgba(226,226,240,0.72); text-wrap: pretty;")}>{twinData.failed ? "The Web glitched — try again in a moment." : "You're the first of your kind. Every legend starts alone — twins will appear as more fans unmask."}</p>
                      ) : (
                        <div data-scrollable="true" onScroll={onTwinsScroll} style={s(`margin-top: 14px; max-height: ${isDesktop ? "min(300px, 34vh)" : "min(24vh, 210px)"}; overflow-y: auto; overscroll-behavior: contain; padding-right: 6px;`)}>
                          {twinData.twins.slice(0, twinsVisible).map((t, i) => {
                            const fc = countryFlag(t.country);
                            return (
                              <div key={`${t.username}-${i}`} className="lw-twin-row" style={{ animationDelay: `${(i % TWIN_PAGE) * 70}ms`, display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", marginBottom: 8, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(180deg, ${heroGlow}, rgba(10,8,16,0.9))`, border: `1px solid ${heroColor}66`, color: "#fff", fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", textTransform: "uppercase" }}>{t.username[0]}</span>
                                <span style={s("flex: 1; min-width: 0; font-size: 14px; color: rgba(255,255,255,0.92); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>u/{t.username}</span>
                                <span style={s("flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; max-width: 46%;")}>
                                  <span style={s("flex-shrink: 0; width: 20px; height: 13px; border-radius: 2px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,0.14);")}>{fc ? <Flag code={fc} /> : <DotMarker />}</span>
                                  <span style={s("font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;")}>{t.country || "-"}</span>
                                </span>
                              </div>
                            );
                          })}
                          {twinsVisible < twinData.twins.length && <div style={s("padding: 2px 0 8px; text-align: center; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.38);")}>Scroll for more ↓</div>}
                        </div>
                      )}

                      {/* footer: shown-of counter + retake CTA */}
                      <div style={s("margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;")}>
                        {twinData && twinData.twins.length > 0 && (
                          <span style={s("font-family: 'Oswald', sans-serif; font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.45);")}>
                            {Math.min(twinsVisible, twinData.twins.length)} of {twinData.twins.length} shown{twinData.count > twinData.twins.length ? ` · ${twinData.count} total` : ""}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            sfxRef.current && sfxRef.current.play("click");
                            router.push("/quiz?retake=1");
                          }}
                          data-web-hover="true"
                          className="bnd-cta"
                          style={s("margin-left: auto; border: 0; padding: 0; background: transparent; cursor: pointer; font-family: inherit;")}
                        >
                          <span
                            className="bnd-cta-inner"
                            style={s("display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;")}
                          >
                            <span className="bnd-cta-sheen"></span>↻ Retake Identity Quiz
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= MJ WALL ================= */}
      <section ref={mjWallRef} id="mj-wall-section" data-page="mjwall" data-screen-label="MJ Wall" style={s("position: relative; z-index: 22; min-height: 100vh; height: 100vh; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a1430; background-image: url('/assets/mj-bg.jpg'); background-size: cover; background-position: center; display: flex; align-items: center; overflow: hidden;")}>
        <div id="mj-scrim" style={s("position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,10,26,0) 35%, rgba(8,10,26,0.45) 62%, rgba(8,10,26,0.72) 100%); pointer-events: none;")}></div>

        <div ref={mjHeaderRef} id="mj-inner" data-page-content style={s("position: relative; width: 100%; max-width: 1320px; margin: 0 auto; box-sizing: border-box; padding: clamp(60px, 10vh, 130px) clamp(24px, 6vw, 96px); display: flex; justify-content: flex-end; will-change: transform;")}>
          <div data-reveal className="bnd-reveal" id="mj-prompt" style={s("width: min(520px, 100%);")}>
            <div className="bnd-line" style={s("animation-delay: 70ms; display: inline-flex; align-items: center; gap: 12px; margin-bottom: 18px;")}>
              <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff1f33, transparent);")}></span>
              <span style={s("font-size: 12px; letter-spacing: 0.36em; text-transform: uppercase; color: #ff5a6a;")}>The MJ Wall</span>
            </div>
            <h2 className="bnd-head" style={s("animation-delay: 180ms; margin: 0; font-size: clamp(30px, 4.4vw, 56px); line-height: 1.02; font-weight: 700; letter-spacing: -0.01em; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6); text-wrap: balance;")}>
              MJ forgot the best part of her story. <span style={{ color: "#ff4655" }}>Let's remind her!</span>
            </h2>
            <p className="bnd-line" style={s("animation-delay: 410ms; margin: 18px 0 0; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(255,255,255,0.82); text-shadow: 0 2px 10px rgba(0,0,0,0.6); text-wrap: pretty;")}>
              If you could remind MJ of one thing about Peter, what would it be?
            </p>

            {mjSent ? (
              <div style={s("margin-top: 28px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; animation: bnd-word-rise 500ms cubic-bezier(.2,.7,.2,1) both;")}>
                <div style={s("display: inline-flex; align-items: center; gap: 12px; font-size: clamp(20px, 2.4vw, 28px); font-weight: 700; color: #fff;")}>
                  <span style={s("width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); color: #6b2a00; display: flex; align-items: center; justify-content: center; font-size: 20px;")}>✓</span>
                  Sent!
                </div>
                <p style={s("margin: 0; font-size: 14px; color: rgba(255,255,255,0.72); text-shadow: 0 2px 8px rgba(0,0,0,0.6);")}>Your memory joins the wall once approved.</p>
                <button
                  onClick={() => {
                    clearTimeout(mjRedirectTRef.current);
                    setMjSent(false);
                    setMjMessage("");
                    setTimeout(() => mjInputRef.current && mjInputRef.current.focus(), 60);
                  }}
                  style={s("background: transparent; border: 0; color: #ff5a6a; font: inherit; letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; cursor: pointer; padding: 4px 0;")}
                >
                  Write another ›
                </button>
              </div>
            ) : (
              <div id="mj-composer" style={s("margin-top: 28px;")}>
                <div style={s("position: relative; padding: 3px; background: linear-gradient(180deg, #ff3a4a 0%, #8b000d 100%); clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);")}>
                  <textarea
                    ref={mjInputRef}
                    id="mj-textarea"
                    data-scrollable="true"
                    value={mjMessage}
                    onChange={(e) => setMjMessage(e.target.value.slice(0, 280))}
                    maxLength={280}
                    rows={4}
                    style={s("display: block; width: 100%; box-sizing: border-box; resize: none; padding: 18px 22px; border: 0; outline: 0; background: #060e2a; color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.7), 0 0 18px rgba(255,255,255,0.35); font-family: inherit; font-size: 15px; line-height: 1.5; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);")}
                  ></textarea>
                </div>
                <div id="mj-actions" style={s("margin-top: 20px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap;")}>
                  <button onClick={onMjSubmit} disabled={mjSending} style={s(`position: relative; border: 0; padding: 0; background: transparent; cursor: ${mjSending ? "default" : "pointer"}; opacity: ${mjSending ? "0.7" : "1"}; font-family: inherit;`)}>
                    <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #1f4cd6 0%, #0b2a8a 100%); clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); box-shadow: 0 10px 28px rgba(0,0,0,0.4);")}>
                      <span style={s("display: block; padding: 15px 34px; background: linear-gradient(180deg, #ffd23f 0%, #f7a91d 100%); clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); color: #6b2a00; font-weight: 700; font-size: 14px; letter-spacing: 0.24em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,0.35);")}>Add to the wall</span>
                    </span>
                  </button>
                  <Link href="/mj-wall" data-web-hover="true" className="link-hover-red" style={s("display: inline-flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.85); text-decoration: none; text-shadow: 0 2px 8px rgba(0,0,0,0.6); transition: color 200ms ease;")}>
                    View all messages <span style={{ fontSize: "15px" }}>›</span>
                  </Link>
                </div>
                {mjError && <p style={s("font-size: 12px; color: #ff6b79; margin-top: 4px; text-shadow: 0 2px 8px rgba(0,0,0,0.6);")}>{mjError}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= SPIDER WORLD FEED ================= */}
      <section
        data-page="feed"
        data-screen-label="Spider World Feed"
        style={s("position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #050308; background-image: radial-gradient(90% 90% at 50% 52%, rgba(5,3,8,0.35) 0%, rgba(5,3,8,0.7) 55%, rgba(4,2,6,0.9) 100%), url('/assets/forum-bg.jpg'); background-size: cover, cover; background-position: center, center; display: flex;")}
      >
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
            <span style={s("font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.34em; text-transform: uppercase; color: #ff5a6a;")}>Spider World Feed</span>
            <span style={s("width: 42px; height: 2px; background: linear-gradient(90deg, #ff2f40, transparent);")}></span>
          </div>
          <h2 className="bnd-head" style={s("animation-delay: 170ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(30px, 5vw, 66px); line-height: 0.98; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6);")}>
            This is what the Web <span style={{ color: "#ff2f40" }}>actually looks like.</span>
          </h2>
          <p className="bnd-line" style={s("animation-delay: 340ms; margin: 18px auto 0; max-width: 600px; font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(226,226,240,0.74); text-wrap: pretty;")}>
            Real people, real identities, real stories — an entire community living under the mask. Step inside and add your voice.
          </p>
          <Link href="/forum" data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 470ms; margin-top: clamp(28px, 4.5vh, 44px); text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
            <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
              <span
                className="bnd-cta-inner"
                style={s("display: inline-flex; align-items: center; gap: 12px; padding: 16px 44px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}
              >
                <span className="bnd-cta-sheen"></span>Enter the Forum <span style={{ fontSize: "17px" }}>→</span>
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* ================= SPIDEY TRACKER ================= */}
      <section
        data-page="tracker"
        data-screen-label="Spidey Tracker"
        style={s(
          "position: relative; z-index: 22; height: 100vh; overflow: hidden; scroll-snap-align: start; scroll-snap-stop: always; background-color: #0a1330; background-image: radial-gradient(120% 100% at 22% 30%, rgba(6,10,22,0.35) 0%, rgba(5,8,20,0.72) 60%, rgba(4,6,14,0.9) 100%), url('/assets/tracker-map-bg.jpg'); background-size: cover, cover; background-position: center, center; display: flex; align-items: center;",
        )}
      >
        <img src="/assets/web.png" alt="" style={s("position: absolute; bottom: -14%; right: -8%; width: min(640px, 42vw); opacity: 0.05; mix-blend-mode: screen; pointer-events: none;")} />
        <div id="tracker-inner" data-page-content data-reveal className="bnd-reveal" style={s("position: relative; z-index: 4; width: 100%; max-width: 1280px; margin: 0 auto; box-sizing: border-box; padding: clamp(78px, 12vh, 120px) clamp(24px, 5vw, 80px) clamp(40px, 7vh, 70px); display: flex; align-items: center; justify-content: space-between; gap: clamp(30px, 5vw, 70px); flex-wrap: wrap;")}>
          {/* on phones #tracker-copy dissolves (display: contents) so the radar can
              slot between the copy and the CTA — see the tracker mobile CSS */}
          <div id="tracker-copy" style={s("flex: 1; min-width: 300px; max-width: 560px;")}>
            <img src="/assets/tracker-logo.png" alt="Spidey Tracker" className="bnd-line" style={s("animation-delay: 70ms; display: block; width: clamp(240px, 26vw, 360px); height: auto; margin-bottom: 22px; filter: drop-shadow(0 6px 20px rgba(0,0,0,0.5));")} />
            <h2 className="bnd-head" style={s("animation-delay: 180ms; margin: 0; font-family: 'Oswald', sans-serif; font-size: clamp(24px, 3.4vw, 46px); line-height: 1.02; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 34px rgba(0,0,0,0.6);")}>
              You don't have to look far…
              <br />
              <span style={{ color: "#ff2f40" }}>he might already be around the corner.</span>
            </h2>
            <p className="bnd-line" style={s("animation-delay: 370ms; margin: 20px 0 0; font-size: clamp(14px, 1.5vw, 18px); line-height: 1.6; color: rgba(226,226,240,0.74); text-wrap: pretty;")}>
              Somewhere, he has already left a mark.
            </p>
            <a id="tracker-cta" href="https://spideytracker.net/intl/in/" target="_blank" rel="noopener noreferrer" onMouseEnter={onWalkHover} data-web-hover="true" className="bnd-line bnd-cta" style={s("animation-delay: 500ms; display: inline-block; margin-top: clamp(26px, 4vh, 40px); text-decoration: none; border: 0; padding: 0; background: transparent; cursor: pointer;")}>
              <span style={s("display: block; padding: 3px; background: linear-gradient(180deg, #ff2233, #8b000d); clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);")}>
                <span
                  className="bnd-cta-inner"
                  style={s("display: inline-flex; align-items: center; gap: 12px; padding: 15px 40px; background: linear-gradient(180deg, #ff3a4a, #c00014); clip-path: polygon(13px 0, 100% 0, 100% calc(100% - 13px), calc(100% - 13px) 100%, 0 100%, 0 13px); color: #fff; font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.2em; text-transform: uppercase;")}
                >
                  <span className="bnd-cta-sheen"></span>Open Spidey Tracker <span style={{ fontSize: "17px", lineHeight: 1 }}>↗</span>
                </span>
              </span>
            </a>
          </div>

          {/* radar */}
          <div id="tracker-radar" className="bnd-line" style={s("animation-delay: 300ms; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: clamp(14px, 2vh, 24px); margin-right: clamp(20px, 5vw, 90px);")}>
            <div id="tracker-radar-art" style={s("position: relative; width: clamp(280px, 35vw, 460px); aspect-ratio: 1;")}>
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
            <h2 className="bnd-head" style={s("animation-delay: 170ms; margin: 0 0 18px; font-family: 'Oswald', sans-serif; font-size: clamp(28px, 4vw, 52px); line-height: 1.02; font-weight: 500; text-transform: uppercase; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.6);")}>
              Every Brand New Day
              <br />
              <span style={{ color: "#ff2f40" }}>starts here.</span>
            </h2>
            <p className="bnd-line" style={s("animation-delay: 310ms; margin: 0 0 clamp(24px, 4vh, 38px); font-size: clamp(14px, 1.5vw, 17px); line-height: 1.6; color: rgba(226,226,240,0.72); max-width: 460px;")}>
              Watch the official trailer and step into the Spider World. In cinemas July 30.
            </p>
          </div>

          {/* right large thumbnail */}
          <button
            onClick={() => {
              sfxRef.current && sfxRef.current.play("click");
              setTrailerOpen(true);
            }}
            onMouseEnter={onWalkHover}
            data-web-hover="true"
            className="bnd-line trailer-card"
            style={s(
              "animation-delay: 370ms; flex: 0 1 400px; min-width: 260px; max-width: 400px; position: relative; border: 0; padding: 2px; background: linear-gradient(150deg, rgba(255,40,60,0.6), rgba(31,76,214,0.45)); clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px); cursor: pointer; transition: transform 340ms cubic-bezier(.16,.84,.3,1), box-shadow 340ms ease;",
            )}
          >
            <div style={s("position: relative; aspect-ratio: 16/9; overflow: hidden; clip-path: polygon(21px 0, 100% 0, 100% calc(100% - 21px), calc(100% - 21px) 100%, 0 100%, 0 21px); background: #0a0713;")}>
              <img src="/assets/trailer-thumb-62bIsvRcPv0.jpg" alt="Spider-Man: Brand New Day — Official Trailer" style={s("position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;")} />
              <div style={s("position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(120,20,30,0.25) 0%, rgba(6,4,12,0.55) 100%); pointer-events: none;")}></div>
              <span
                style={s(
                  "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: clamp(68px, 8vw, 96px); height: clamp(68px, 8vw, 96px); border-radius: 50%; border: 2px solid rgba(255,60,74,0.9); background: rgba(20,6,10,0.4); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(255,60,74,0.5), inset 0 0 20px rgba(255,60,74,0.2); pointer-events: none;",
                )}
              >
                <span style={s("position: absolute; inset: -9px; border-radius: 50%; border: 2px solid rgba(255,60,74,0.4); animation: bnd-radar-ring 2.8s ease-out infinite;")}></span>
                {/* the glyph's bbox (x 5–21) already sits +1 right of the viewBox
                    center — that IS the optical nudge; extra margin skewed it */}
                <svg width="30%" height="30%" viewBox="0 0 24 24" fill="#fff" style={s("filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));")}>
                  <path d="M5 3l16 9-16 9z" />
                </svg>
              </span>
            </div>
          </button>
        </div>

        {/* footer columns */}
        <div style={s("position: relative; z-index: 2; width: 100%; border-top: 1px solid rgba(255,255,255,0.08);")}>
          <div style={s("max-width: 1240px; margin: 0 auto; box-sizing: border-box; padding: clamp(34px, 5vh, 56px) clamp(24px, 5vw, 80px) clamp(20px, 3vh, 32px); display: grid; grid-template-columns: 1.4fr 1fr; gap: clamp(24px, 6vw, 90px); align-items: start;")} className="footer-cols">
            {/* about + social */}
            <div>
              <h4 style={s("margin: 0 0 16px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5a6a;")}>
                About the Movie <span style={{ color: "#ff2f40" }}>•</span>
              </h4>
              <p style={s("margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: rgba(226,226,240,0.62); max-width: 320px;")}>Anyone can wear the mask. Step into the Spider World and find your place in the Web.</p>
              <div style={s("display: flex; gap: 10px;")}>
                {[
                  ["X", "https://x.com/sonypicsindia?s=21", <path key="p" d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5-6.6L5.5 22H2.4l7.8-8.9L1.5 2h6.9l4.6 6.1L18.9 2zm-2.4 18h1.9L7.6 4H5.6l10.9 16z" />],
                  [
                    "Instagram",
                    "https://www.instagram.com/sonypicturesin?igsh=dXV1enlieG96ZGxk",
                    <g key="g">
                      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="17.5" cy="6.5" r="1.3" />
                    </g>,
                  ],
                  [
                    "YouTube",
                    "https://youtube.com/@sonypicturesindia?si=38mx3EayIsfFU97y",
                    <g key="g">
                      <path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 002 8.2 31 31 0 001.6 12 31 31 0 002 15.8a3 3 0 002.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 002.1-2.1c.3-1.9.4-3.8.4-3.8s0-1.9-.4-3.8z" />
                      <path d="M10 15l5-3-5-3v6z" fill="#0b0510" />
                    </g>,
                  ],
                  ["Facebook", "https://www.facebook.com/sonypicturesofindia?mibextid=wwXIfr&mibextid=wwXIfr", <path key="p" d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z" />],
                ].map(([name, url, icon]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    data-web-hover="true"
                    className="footer-social"
                    style={s("width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); transition: background .2s ease, border-color .2s ease, color .2s ease;")}
                  >
                    <span style={s("width: 18px; height: 18px; display: block;")}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "100%", height: "100%", display: "block" }}>
                        {icon}
                      </svg>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* explore */}
            <div>
              <h4 style={s("margin: 0 0 16px; font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5a6a;")}>
                Explore <span style={{ color: "#ff2f40" }}>•</span>
              </h4>
              <div style={s("display: flex; flex-direction: column; gap: 4px; max-width: 220px;")}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTrailerOpen(true);
                  }}
                  data-web-hover="true"
                  className="footer-link"
                  style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}
                >
                  <span>Trailer</span>
                  <span style={s("color: #ff2f40; font-size: 15px;")}>›</span>
                </a>
                <Link href="/mj-wall" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}>
                  <span>MJ Wall</span>
                  <span style={s("color: #ff2f40; font-size: 15px;")}>›</span>
                </Link>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    goToForm();
                  }}
                  data-web-hover="true"
                  className="footer-link"
                  style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}
                >
                  <span>Fan Hub</span>
                  <span style={s("color: #ff2f40; font-size: 15px;")}>›</span>
                </a>
                <Link href="/forum" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}>
                  <span>Forum</span>
                  <span style={s("color: #ff2f40; font-size: 15px;")}>›</span>
                </Link>
                <a href="https://spideytracker.net/intl/in/" target="_blank" rel="noopener noreferrer" data-web-hover="true" className="footer-link" style={s("display: flex; align-items: center; justify-content: space-between; gap: 10px; text-decoration: none; font-size: 14px; color: rgba(255,255,255,0.72); padding: 3px 0; transition: color .2s ease;")}>
                  <span>Spidey Tracker</span>
                  <span style={s("color: #ff2f40; font-size: 15px;")}>›</span>
                </a>
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div style={s("max-width: 1240px; margin: 0 auto; box-sizing: border-box; padding: 18px clamp(24px, 5vw, 80px) clamp(22px, 3vh, 34px); border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;")}>
            <div style={s("font-size: 11.5px; letter-spacing: 0.05em; color: rgba(255,255,255,0.4);")}>© 2026 Columbia Pictures Industries, Inc. All rights reserved. &nbsp;·&nbsp; This film is not yet rated.</div>
          </div>
        </div>
      </footer>

      {/* ============ WEB RAIL: right-side section nav (desktop only) ============
          .bnd-web-rail hides it under 760px so the server HTML (isDesktop
          defaults true) never flashes the rail on phones before hydration */}
      {isDesktop && (
        <nav aria-label="Page sections" className="bnd-web-rail" style={s("position: fixed; right: clamp(12px, 1.8vw, 28px); top: 50%; transform: translateY(-50%); z-index: 44;")}>
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
                onClick={() => {
                  sfxRef.current && sfxRef.current.play("click");
                  goToSection(sec.key);
                }}
                data-web-hover="true"
                className="bnd-rail-item"
                aria-label={sec.label}
                aria-current={i === railIdx ? "true" : undefined}
                style={s("position: relative; width: 32px; height: 34px; border: 0; padding: 0; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center;")}
              >
                <span className="bnd-rail-dot" style={s(`width: 7px; height: 7px; border-radius: 50%; background: ${i === railIdx ? "transparent" : "rgba(255,255,255,0.3)"}; box-shadow: ${i === railIdx ? "none" : "0 0 0 1px rgba(255,255,255,0.1)"};`)}></span>
                <span
                  className="bnd-rail-label"
                  style={s("position: absolute; right: 100%; margin-right: 12px; top: 50%; white-space: nowrap; font-family: 'Oswald', sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.82); background: rgba(8,8,14,0.75); border: 1px solid rgba(255,255,255,0.1); padding: 5px 11px; border-radius: 6px; backdrop-filter: blur(4px); pointer-events: none;")}
                >
                  {sec.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* HERO SCROLL HINT — subtle "there's more below" cue, shown on the hero
          only (fades out once you leave it). Desktop only, docked on the right
          in the web-rail column — globals.css hides it under 760px. */}
      <div
        aria-hidden="true"
        className="bnd-scrollhint"
        style={{ position: "fixed", zIndex: 30, left: "50%", bottom: "calc(31px + env(safe-area-inset-bottom, 0px))", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", pointerEvents: "none", opacity: activeSection === "hero" && !walkOpen && !trailerOpen && !authOpen && !mobileMenuOpen ? 1 : 0, transition: "opacity 450ms ease", willChange: "opacity" }}
      >
        <span className="bnd-scrollhint-mouse">
          <span className="bnd-scrollhint-dot"></span>
        </span>
      </div>

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
        mobileMenuVisible={!isDesktop && mobileMenuOpen}
        navItems={navItems}
        onGoHome={() => {
          dismissKeyboard();
          setMobileMenuOpen(false);
          goToPageRef.current(0);
        }}
        onGetStarted={goToForm}
        onToggleMobileMenu={() => {
          dismissKeyboard();
          setMobileMenuOpen((v) => !v);
        }}
        onMobileSwingIn={() => {
          setMobileMenuOpen(false);
          goToForm();
        }}
      />

      <WalkthroughModal
        walk={walkVis}
        items={walkItems}
        joinLabel={user ? "Enter Forum" : "Join the Spider World"}
        onClose={() => {
          sfxRef.current && sfxRef.current.stopHum();
          setWalkOpen(false);
        }}
        onJoin={() => {
          sfxRef.current && sfxRef.current.play("click");
          sfxRef.current && sfxRef.current.stopHum();
          setWalkOpen(false);
          goToForm();
        }}
        onHover={onWalkHover}
      />

      {trailerOpen && <TrailerModal onClose={() => setTrailerOpen(false)} onStopProp={(e) => e.stopPropagation()} />}
    </div>
  );
}
