import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Lenis from "lenis";
import { Bird, Package, Truck, ShieldCheck, Award, Clock, MapPin, CheckCircle, Leaf, Heart, ShoppingBasket, Film, User, Globe } from "lucide-react";
import { EggIcon } from "../components/EggIcon";
import { EggLoader } from "../components/EggLoader";
import { OrderSection } from "../components/OrderSection";
import { ProductsSection } from "../components/ProductsSection";
import { FloatingCartBar } from "../components/FloatingCartBar";
import { CartProvider, useCart } from "../lib/cart-context";

// Customer login lives in the ops/admin app we already built (bab-al-madina) — its login
// page handles auth, and the same account can see order history there. Override via
// VITE_OPS_APP_URL if the deployed subdomain differs. Falls back to the raw CloudFront URL —
// ops.babalbaraka.ae's DNS CNAME isn't resolving yet (NXDOMAIN), so this keeps the button
// working today; switch back to the custom domain once that DNS record is live.
const OPS_APP_URL = import.meta.env.VITE_OPS_APP_URL || "https://d10ra4zil7l1f7.cloudfront.net";


const ChickenIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19,8.5C18.6,8.5 18.2,8.6 17.8,8.8C18,8.2 18,7.6 17.8,7C17.3,5.5 15.9,4.4 14.2,4.1C13.2,4 12.3,4.2 11.5,4.8L11.3,4.1C11.1,3.4 10.4,3 9.7,3H9V4H9.7L10.3,6.2L10,6.5C9,7.5 8.4,8.8 8.1,10.2C7.3,10.1 6.5,10.2 5.8,10.6L5.3,9.7L4.4,10.2L4.9,11C4.4,11.5 4,12.2 4,13C4,14.6 5.3,16 7,16V17H5V19H7V21H9V19H11V21H13V19H15V17H13V16C13.6,16 14.1,15.8 14.6,15.6C16.4,15 17.6,13.4 17.9,11.5C18.6,11.3 19.1,10.9 19.5,10.3C19.8,9.8 20,9.2 20,8.5C20,8 19.6,8.5 19,8.5M15.5,7C15.8,7 16,7.2 16,7.5C16,7.8 15.8,8 15.5,8C15.2,8 15,7.8 15,7.5C15,7.2 15.2,7 15.5,7Z" />
  </svg>
);

const logo = { url: "/Logo.png" };

// Total scroll distance (in vh) driving the hero scrub — longer = smoother, more deliberate scrub.
const HERO_VH = 1100;
// Upright touch phones scrub a portrait frame sequence instead (scene1..5-mobile.mp4, each
// motion-interpolated from 30 to 60fps with ffmpeg minterpolate, 540x960, concatenated).
// Chosen once on load, so rotating doesn't swap.
const MOBILE_HERO_VH = 800;
const MOBILE_FRAME_COUNT = 1043;
const mobileFramePath = (i: number) => `/frames-mobile/f-${String(i + 1).padStart(4, "0")}.webp`;
// Fraction of the scrub range where the video finishes; the remainder is a brief hold on the
// final frame so the video reads as fully complete before the landing page rises over it.
const VIDEO_END_AT = 0.88;

// Pre-extracted frame sequence (every frame of hero-story.mp4 at its native 30fps,
// center-cropped to 1276x720) drawn to a <canvas>.
// Video-element `currentTime` seeking is async per-browser and can't keep up with 60fps
// scroll input even on an all-intra encode — seeks queue up and visibly lag. Drawing a
// plain <img> to canvas is synchronous, so this is the only way to get a lag-free scrub.
const FRAME_COUNT = 440;
const framePath = (i: number) => `/frames/f-${String(i + 1).padStart(3, "0")}.webp`;

// Bounding box of the egg tray within the video's final frame (source pixels, 1276x720).
// tray-video.webp is exactly this crop with the background chroma-keyed out, so an overlay
// placed at this cover-fit-mapped rect sits pixel-perfect on top of the tray in the canvas.
const VIDEO_W = 1276, VIDEO_H = 720;
const TRAY_BBOX = { x: 600, y: 195, w: 665, h: 400 };

// Story captions — one per narrative beat in the frame sequence (heritage → care →
// freshness → kitchen). Each fades in/out over a scroll window centered on `p` (fraction
// of the full 0..1 scrub range, i.e. already scaled by VIDEO_END_AT). Beat 1 (logo) and
// the final reveal frame stay textless on purpose — see UX plan.
// `side` picks the empty half of each frame (opposite wherever that beat's subject sits)
// so the caption never sits on top of the product. `anim` picks an entrance style suited
// to that beat's content — a calm brand mark reveals differently than a cracking egg.
// `window` overrides the default hold length (Kitchen closes the story, so it lingers longer).
const STORY_BEATS = [
  { p: 0.045, eyebrow: "Bab Al Baraka", line: "A Gateway to Blessings.", side: "right", anim: "reveal" },
  { p: 0.148, eyebrow: "Heritage", line: "Rooted in tradition, raised with care.", side: "right", anim: "rise" },
  { p: 0.443, eyebrow: "Care", line: "Every egg, inspected by hand.", side: "right", anim: "slide" },
  { p: 0.590, eyebrow: "Freshness", line: "Cracked fresh. Cooked fresh.", side: "left", anim: "pop" },
  { p: 0.760, eyebrow: "Kitchen", line: "From our farm to your table.", side: "left", anim: "rise", window: 0.22 },
] as const;
const BEAT_WINDOW = 0.13; // default total width of each beat's visible span — longer hold per caption

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bab Al Baraka — A Gateway to Blessings" },
      { name: "description", content: "Bab Al Baraka brings together heritage, hospitality, and craft." },
      { property: "og:title", content: "Bab Al Baraka" },
    ],
  }),
  component: Index,
});

// ── Main ─────────────────────────────────────────────────────────────────────
// CartProvider wraps the whole page (not just the products/order sections) so the
// header's cart button can show a live item count.
function Index() {
  return (
    <CartProvider>
      <IndexInner />
    </CartProvider>
  );
}

function IndexInner() {
  const [isLoading, setIsLoading] = useState(true);
  const { cartCount } = useCart();
  // Lightweight EN/AR label toggle for the header/hero chrome — swaps visible strings only.
  // Not a full RTL layout switch (the scroll-scrubbed hero relies on fixed pixel math that
  // a mirrored layout would break); this covers the nav + hero-copy request, full site
  // translation is a bigger follow-up.
  const [lang, setLang] = useState<"en" | "ar">("en");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mobileHero, setMobileHero] = useState(false);
  const mobileHeroRef = useRef(false);
  const frameCountRef = useRef(FRAME_COUNT);
  // Fly-down tray handoff: fixed overlay detaches from the video's final frame and lands
  // on the podium spot occupied by the in-flow landing tray.
  const trayFlyRef = useRef<HTMLImageElement>(null);
  const trayTargetRef = useRef<HTMLImageElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const lastFrameIdxRef = useRef(-1);
  // Scroll-driven UI updated via direct DOM writes (not React state) — a setState here
  // would re-render the entire page tree on every scroll tick and visibly jank the scrub.
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Preload every frame up front (small jpgs, ~3MB total) and draw the first one as
  // soon as it lands so there's no blank flash before scrolling starts.
  useEffect(() => {
    // Refs are read by the scroll effect below, which runs after this one.
    const mobile = window.matchMedia("(max-width: 767px) and (orientation: portrait) and (pointer: coarse)").matches;
    mobileHeroRef.current = mobile;
    frameCountRef.current = mobile ? MOBILE_FRAME_COUNT : FRAME_COUNT;
    if (mobile) setMobileHero(true);
    const pathFor = mobile ? mobileFramePath : framePath;
    const canvas = canvasRef.current;
    const draw = (img: HTMLImageElement) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const dpr = window.devicePixelRatio || 1;
      const cw = window.innerWidth, ch = window.innerHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const dx = (canvas.width - dw) / 2, dy = (canvas.height - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    for (let i = 0; i < frameCountRef.current; i++) {
      const img = new Image();
      img.src = pathFor(i);
      framesRef.current[i] = img;
      if (i === 0) img.onload = () => draw(img);
    }

    const onResize = () => {
      const img = framesRef.current[Math.floor(lastFrameIdxRef.current)] ?? framesRef.current[0];
      if (img?.complete) draw(img);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll-reveal: add `.reveal-in` to any `.reveal` element the first time it enters view.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target); // one-shot — never replay
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Lenis smooth scrolling — interpolates all wheel/touch input for a buttery, seamless feel.
  // The video-scrub logic runs INSIDE Lenis's own rAF tick (via lenis.on('scroll', ...)) rather
  // than a separate native `scroll` listener — Lenis drives scroll position programmatically every
  // frame, and native scroll events aren't guaranteed to fire in lockstep with that, which is why
  // scrubbing driven off `window.scrollY` + a native listener could silently fall out of sync.
  const lenisRef = useRef<Lenis | null>(null);
  useEffect(() => {
    // On phones, syncTouch runs finger scrolling through Lenis's easing too, so a slow drag
    // glides through the frames instead of stepping with each raw touchmove.
    // Speed is untouched (touchMultiplier stays 1); a lower syncTouchLerp only softens the
    // easing so slow drags glide through neighbouring frames instead of stepping.
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: mobileHeroRef.current,
      syncTouchLerp: 0.05,
    });
    lenisRef.current = lenis;

    // Sub-frame crossfade: the fractional index between two neighbouring frames becomes a
    // blend alpha, so motion interpolates BETWEEN captured frames instead of stepping from
    // one to the next — perceived smoothness well beyond the 15fps capture rate.
    const drawBlended = (f: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const last = frameCountRef.current - 1;
      const i0 = Math.min(last, Math.floor(f));
      const i1 = Math.min(last, i0 + 1);
      const frac = f - i0;
      const imgA = framesRef.current[i0];
      const imgB = framesRef.current[i1];
      const ready = (im?: HTMLImageElement) => im && im.complete && im.naturalWidth > 0;
      if (!ready(imgA)) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const dpr = Math.min(2, window.devicePixelRatio || 1); // cap: >2x canvases cost fillrate, gain nothing visible
      const cw = window.innerWidth, ch = window.innerHeight;
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      const fit = (img: HTMLImageElement) => {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        return [(canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh] as const;
      };

      ctx.globalAlpha = 1;
      ctx.drawImage(imgA!, ...fit(imgA!));
      if (frac > 0.01 && i1 !== i0 && ready(imgB)) {
        ctx.globalAlpha = frac;
        ctx.drawImage(imgB!, ...fit(imgB!));
        ctx.globalAlpha = 1;
      }
    };

    let targetFrame = 0;
    const applyScroll = (scrollY: number) => {
      const heroPx = ((mobileHeroRef.current ? MOBILE_HERO_VH : HERO_VH) / 100) * window.innerHeight;
      const p = Math.min(1, Math.max(0, scrollY / heroPx));

      // Scroll-driven chrome — written straight to the DOM so React never re-renders mid-scroll.
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p * 100}%`;
        progressBarRef.current.style.opacity = p >= 1 ? "0" : "1";
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = p < 0.03 ? String(1 - p / 0.03) : "0";
      }
      // Skip-to-shop button — visible through the whole story, fades out as the landing arrives.
      if (skipRef.current) {
        const so = p < 0.86 ? 1 : Math.max(0, 1 - (p - 0.86) / 0.06);
        skipRef.current.style.opacity = String(so);
        skipRef.current.style.pointerEvents = so > 0.2 ? "auto" : "none";
      }
      if (headerRef.current) {
        const ho = p < 0.92 ? 0 : (p - 0.92) / 0.08;
        headerRef.current.style.opacity = String(ho);
        headerRef.current.style.pointerEvents = ho > 0.5 ? "auto" : "none";
      }

      // Story captions — fade in/out around each beat's center, easeIn over the first 15%
      // of the window and easeOut over the last 20%, matching the crossfade's own pacing.
      STORY_BEATS.forEach((beat, i) => {
        const el = captionRefs.current[i];
        if (!el) return;
        const w = "window" in beat ? beat.window : BEAT_WINDOW;
        const start = beat.p - w / 2;
        const end = beat.p + w / 2;
        const fadeInEnd = start + w * 0.15;
        const fadeOutStart = end - w * 0.20;
        let o = 0;
        let raw = 0; // unclamped entrance progress, for overshoot easing (pop)
        if (p >= start && p <= end) {
          if (p < fadeInEnd) { raw = (p - start) / (fadeInEnd - start); o = raw; }
          else if (p > fadeOutStart) o = 1 - (p - fadeOutStart) / (end - fadeOutStart);
          else { o = 1; raw = 1; }
        }
        el.style.opacity = String(o);
        const dir = beat.side === "right" ? 1 : -1;
        switch (beat.anim) {
          case "reveal": // calm brand mark: gentle scale + fade, no travel
            el.style.transform = `scale(${0.97 + o * 0.03})`;
            break;
          case "slide": // travels in from its own side, settles level
            el.style.transform = `translateX(${(1 - o) * 28 * dir}px)`;
            break;
          case "pop": { // slight overshoot scale — matches the crack/snap of the beat
            const eased = raw < 1 ? 1.06 * (1 - Math.pow(1 - raw, 3)) - 0.06 * raw : 1;
            const s = o < 1 ? 0.88 + eased * 0.12 : 1;
            el.style.transform = `scale(${Math.max(0.88, s)}) translateY(${(1 - o) * 6}px)`;
            break;
          }
          case "rise":
          default:
            el.style.transform = `translateY(${(1 - o) * 16}px)`;
        }
      });

      const videoP = Math.min(1, p / VIDEO_END_AT); // video completes at VIDEO_END_AT, then holds
      const f = videoP * (frameCountRef.current - 1); // fractional frame index

      // Decode lookahead: warm the next few frames off the hot path so drawImage never
      // has to synchronously decode a webp mid-scroll (the classic first-pass stutter).
      const ahead = Math.floor(f);
      for (let i = ahead + 1; i <= Math.min(frameCountRef.current - 1, ahead + 6); i++) {
        const im = framesRef.current[i];
        if (im?.complete) im.decode?.().catch(() => {});
      }

      if (mobileHeroRef.current) {
        if (Math.abs(f - lastFrameIdxRef.current) > 0.005) {
          lastFrameIdxRef.current = f;
          drawBlended(f);
        }
      } else {
        // Desktop: the rAF loop glides the shown frame toward this target (see `loop`).
        targetFrame = f;
        if (lastFrameIdxRef.current < 0) {
          lastFrameIdxRef.current = f; // first paint (incl. reload mid-scroll): no glide in
          drawBlended(f);
        }
      }

      // Mobile frames have no baked-in tray at the landscape bbox to hand off; just
      // fade the canvas as the hero scrolls away and show the landing tray.
      if (mobileHeroRef.current) {
        const vh = window.innerHeight;
        const t = Math.min(1, Math.max(0, (scrollY - (heroPx - vh)) / vh));
        if (canvasRef.current) canvasRef.current.style.opacity = String(1 - t);
        if (trayTargetRef.current) trayTargetRef.current.style.opacity = "1";
        return;
      }

      // ── Tray fly-down handoff ─────────────────────────────────────────────
      // While the pinned video scrolls away (its last viewport-height of travel), a fixed
      // overlay of the tray detaches from the final frame and glides down onto the podium,
      // landing exactly where the in-flow landing tray sits. Then the in-flow tray takes over.
      const vh = window.innerHeight, vw = window.innerWidth;
      const exitStart = heroPx - vh; // canvas begins sliding out here
      const t = Math.min(1, Math.max(0, (scrollY - exitStart) / vh));
      const fly = trayFlyRef.current;
      const target = trayTargetRef.current;
      const canvas = canvasRef.current;

      if (fly && target) {
        if (t > 0 && t < 1) {
          // Source: tray bbox in the final frame, cover-fit-mapped to the viewport.
          const s = Math.max(vw / VIDEO_W, vh / VIDEO_H);
          const offX = (vw - VIDEO_W * s) / 2, offY = (vh - VIDEO_H * s) / 2;
          const src = { x: offX + TRAY_BBOX.x * s, y: offY + TRAY_BBOX.y * s, w: TRAY_BBOX.w * s, h: TRAY_BBOX.h * s };
          const dst = target.getBoundingClientRect();
          const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
          fly.style.display = "block";
          fly.style.left = `${src.x + (dst.x - src.x) * e}px`;
          fly.style.top = `${src.y + (dst.y - src.y) * e}px`;
          fly.style.width = `${src.w + (dst.width - src.w) * e}px`;
          fly.style.height = `${src.h + (dst.height - src.h) * e}px`;
          target.style.opacity = "0";
          // Fade the canvas early so its baked-in tray doesn't double up with the flying one.
          if (canvas) canvas.style.opacity = String(Math.max(0, 1 - t / 0.3));
        } else {
          fly.style.display = "none";
          target.style.opacity = t >= 1 ? "1" : "0";
          if (canvas) canvas.style.opacity = t >= 1 ? "0" : "1";
        }
      }
    };

    lenis.on("scroll", ({ scroll }: { scroll: number }) => applyScroll(scroll));
    // Also react to native scroll (keyboard paging, anchor jumps, programmatic scrolls) —
    // Lenis only emits for input it drives itself, so these would otherwise desync the scrub.
    const onNativeScroll = () => applyScroll(window.scrollY);
    window.addEventListener("scroll", onNativeScroll, { passive: true });

    // Desktop playback feel: wheel input arrives in bursts, so instead of snapping to the
    // scroll's frame, the shown frame eases toward it and is speed-capped near the video's
    // own pace (PLAYBACK_CAP source frames per 60Hz tick; source is 30fps, so 1 = 2x real
    // time). A fast flick then plays through like footage rather than skipping ahead.
    const EASE = 0.14;
    const PLAYBACK_CAP = 0.9;
    let lastTime = 0;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      if (!mobileHeroRef.current && lastFrameIdxRef.current >= 0) {
        const dt = lastTime ? Math.min(4, (time - lastTime) / (1000 / 60)) : 1;
        const shown = lastFrameIdxRef.current;
        const diff = targetFrame - shown;
        if (Math.abs(diff) > 0.005) {
          const cap = PLAYBACK_CAP * dt;
          const step = Math.max(-cap, Math.min(cap, diff * (1 - Math.pow(1 - EASE, dt))));
          const next = Math.abs(diff) < 0.01 ? targetFrame : shown + step;
          lastFrameIdxRef.current = next;
          drawBlended(next);
        }
      }
      lastTime = time;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    applyScroll(window.scrollY); // initial paint (e.g. reload mid-scroll)

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onNativeScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) lenisRef.current?.scrollTo(el, { duration: 1.3 });
  };

  return (
    <div ref={scrollContainerRef} className="w-full relative">
      {isLoading && <EggLoader onComplete={() => setIsLoading(false)} />}

      <style>{`
        @keyframes trayDropIn {
          from { opacity: 0; transform: translateY(48px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Hide the browser scrollbar — page still scrolls normally */
        html { scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar { display: none; }

        /* Scroll-reveal: elements start hidden + offset, animate in when they enter view.
           .reveal-in is toggled by an IntersectionObserver. Variant classes pick direction. */
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
        .reveal-left  { transform: translateX(-60px); }
        .reveal-right { transform: translateX(60px); }
        .reveal-zoom  { transform: scale(.86); }
        .reveal.reveal-in { opacity: 1; transform: none; }
        /* Per-child stagger inside a revealed card (reveal-stagger nested under a .reveal-in) */
        .reveal-stagger > * { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
        /* .reveal-stagger can either wrap children directly (same element gets both classes,
           e.g. the commitment grid) or sit nested inside a separate .reveal ancestor (the
           card lists) — cover both with a combo selector and a descendant selector. */
        .reveal-in.reveal-stagger > *,
        .reveal-in .reveal-stagger > * { opacity: 1; transform: none; }
        .reveal-in.reveal-stagger > *:nth-child(1), .reveal-in .reveal-stagger > *:nth-child(1) { transition-delay: .18s; }
        .reveal-in.reveal-stagger > *:nth-child(2), .reveal-in .reveal-stagger > *:nth-child(2) { transition-delay: .30s; }
        .reveal-in.reveal-stagger > *:nth-child(3), .reveal-in .reveal-stagger > *:nth-child(3) { transition-delay: .42s; }
        .reveal-in.reveal-stagger > *:nth-child(4), .reveal-in .reveal-stagger > *:nth-child(4) { transition-delay: .54s; }
        /* Icon badge flourish on reveal */
        @keyframes badgePop { 0% { transform: scale(.4) rotate(-25deg); opacity: 0; } 60% { transform: scale(1.12) rotate(6deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        .reveal-in .badge-pop { animation: badgePop .7s cubic-bezier(.34,1.56,.64,1) both; animation-delay: .15s; }
        @media (prefers-reduced-motion: reduce) {
          .reveal, .reveal-stagger > * { opacity: 1 !important; transform: none !important; }
          .reveal-in .badge-pop { animation: none; }
        }
      `}</style>

      {/* Scroll progress bar — width/opacity driven by direct DOM writes in applyScroll */}
      <div ref={progressBarRef} className="fixed top-0 left-0 h-1 bg-[#d4af37] z-50" style={{ width: "0%" }} />

      {/* Skip-to-shop — always available through the story so returning visitors can jump
          straight to buying. Opacity/pointer-events driven by applyScroll. */}
      <button
        ref={skipRef}
        onClick={() => scrollToId("products-section")}
        className="fixed top-5 right-4 md:right-8 z-50 group flex items-center gap-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/20 px-4 py-2 text-white/80 hover:text-white text-[11px] md:text-xs tracking-[0.2em] uppercase transition-colors"
        style={{ opacity: 1, transition: "opacity 0.3s ease, background-color 0.2s ease, color 0.2s ease" }}
      >
        Skip to Shop
        <span className="transition-transform group-hover:translate-x-0.5">↓</span>
      </button>

      {/* Flying tray — fixed overlay that detaches from the video's last frame and lands on the podium */}
      <img
        ref={trayFlyRef}
        src="/tray-video.webp"
        alt=""
        aria-hidden
        className="fixed z-30 pointer-events-none drop-shadow-[0_50px_60px_rgba(0,0,0,0.55)]"
        style={{ display: "none" }}
      />

      {/* Sticky hero canvas: pre-extracted frame sequence, no overlays. Pins for the scrub
          range, then scrolls away naturally as the wrapper below runs out — the landing
          page rises over it like a normal page, no manual fade/crossfade needed. */}
      <div style={{ height: `${mobileHero ? MOBILE_HERO_VH : HERO_VH}dvh` }} className="relative z-0">
        <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-[#2a0003]">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Story captions — one per narrative beat, opacity/position driven by applyScroll */}
          {STORY_BEATS.map((beat, i) => (
            <div
              key={beat.eyebrow}
              ref={(el) => { captionRefs.current[i] = el; }}
              className={`absolute ${mobileHero ? "top-24" : "top-1/2 -translate-y-1/2"} px-6 md:px-0 max-w-xl pointer-events-none ${
                beat.side === "right"
                  ? "right-0 md:right-16 text-right items-end"
                  : "left-0 md:left-16 text-left items-start"
              } flex flex-col`}
              style={{ opacity: 0, willChange: "opacity, transform", transformOrigin: beat.side === "right" ? "right center" : "left center" }}
            >
              <p className="text-xs md:text-sm tracking-[0.5em] uppercase text-[#d4af37] mb-3" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                {beat.eyebrow}
              </p>
              <p
                className="font-serif text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1]"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.5)" }}
              >
                {beat.line}
              </p>
            </div>
          ))}

          {/* Scroll hint — functional cue only, gone the instant scrubbing starts */}
          <div
            ref={hintRef}
            className="absolute bottom-8 inset-x-0 flex flex-col items-center gap-2 text-white/50 text-[10px] tracking-[0.3em] uppercase pointer-events-none"
            style={{ opacity: 1, transition: "opacity 0.3s ease" }}
          >
            <span>Scroll to play</span>
            <span className="w-5 h-8 rounded-full border border-white/30 flex items-start justify-center p-1.5">
              <span className="w-1 h-1.5 rounded-full bg-white/70 animate-bounce" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Landing Hero — maroon podium bg, tray lands on the podium (reference design) ── */}
      <div id="product-hero" className="relative z-10 overflow-hidden bg-[#3a060d]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-bg.jpg)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-28 md:pt-36 pb-28 md:pb-40 grid md:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="text-center md:text-left">
            <p className="text-[11px] md:text-xs tracking-[0.35em] uppercase text-[#d4af37] mb-5 font-medium">
              Fresh From Farm to Your Home
            </p>
            <h2 className="font-serif text-5xl md:text-7xl text-white leading-[1.08] mb-6">
              Fresh Eggs,<br />Everyday.
            </h2>
            <p className="text-base md:text-lg text-white/75 max-w-sm mx-auto md:mx-0 leading-relaxed mb-8">
              Premium quality eggs delivered to your doorstep within 24 hours.
            </p>

            {/* Feature row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-0 gap-y-4 mb-10 text-white/90">
              {[
                { icon: <Leaf className="w-4 h-4" />, label: <>Farm Fresh</> },
                { icon: <ShieldCheck className="w-4 h-4" />, label: <>Premium<br />Quality</> },
                { icon: <Truck className="w-4 h-4" />, label: <>Delivered in<br />24 Hours</> },
              ].map((f, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 first:pl-0 ${i > 0 ? "border-l border-white/20" : ""}`}>
                  <span className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center shrink-0">{f.icon}</span>
                  <span className="text-sm leading-snug text-left">{f.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => scrollToId("order-section")}
              className="group inline-flex items-center gap-3 bg-[#d9a94e] hover:bg-[#e5b85f] text-[#2a0509] font-semibold px-8 py-4 rounded-full transition-colors shadow-[0_10px_30px_rgba(217,169,78,0.35)]"
            >
              Order Now
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>

          {/* Right — tray sits on the podium in the bg image (revealed once the fly-down lands) */}
          <div className="relative flex justify-center md:justify-end">
            <img
              ref={trayTargetRef}
              src="/tray-video.webp"
              alt="Bab Al Baraka 30 fresh eggs tray"
              className="w-full max-w-lg md:max-w-xl drop-shadow-[0_50px_60px_rgba(0,0,0,0.55)] md:translate-y-40 md:-mt-40"
              style={{ opacity: 0 }}
            />
          </div>
        </div>

        {/* Wavy transition into the cream section */}
        <svg className="absolute bottom-0 left-0 w-full text-[#faf3e7]" viewBox="0 0 1440 110" preserveAspectRatio="none" fill="currentColor" aria-hidden>
          <path d="M0,64 C240,110 480,110 720,84 C960,58 1200,20 1440,44 L1440,110 L0,110 Z" />
        </svg>
      </div>

      <div className="relative z-10 overflow-hidden">
        {/* Why Choose Section Background */}
        <div className="bg-[#faf6f0] py-24 relative overflow-hidden">
          {/* Decorative Eggs/Leaves Background */}
          <div className="absolute top-10 left-10 opacity-20 pointer-events-none rotate-[15deg]">
             <Leaf className="w-24 h-24 text-green-700" />
          </div>
          <div className="absolute top-40 right-20 opacity-20 pointer-events-none -rotate-[30deg]">
             <EggIcon className="w-32 h-32 text-[#d4c3b3]" />
          </div>
          <div className="absolute bottom-20 left-20 opacity-20 pointer-events-none rotate-[45deg]">
             <EggIcon className="w-40 h-40 text-[#d4c3b3]" />
          </div>
          <div className="absolute bottom-40 right-10 opacity-20 pointer-events-none -rotate-[15deg]">
             <Leaf className="w-32 h-32 text-green-700" />
          </div>

          {/* Why Choose heading */}
          <div className="reveal reveal-zoom relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center mb-20">
             <div className="flex justify-center items-center gap-4 mb-4">
                <Leaf className="w-6 h-6 text-green-700" />
                <h4 className="font-serif italic text-xl md:text-2xl text-[#8b1a1a]">Dear Valuable Customer,</h4>
                <Leaf className="w-6 h-6 text-green-700 scale-x-[-1]" />
             </div>
             <h2 className="font-serif text-4xl md:text-6xl text-[#1a1a1a] mb-2 tracking-wide font-bold">
                Why Choose <br/>
                <span className="text-[#8b1a1a]">BAB AL BARAKA EGGS?</span>
             </h2>
             <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mt-6" />
          </div>

          {/* Three feature cards - Stacked and Stylized, alternating slide-in on reveal */}
          <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 flex flex-col gap-12 mb-8">
            {[
              {
                icon: <ChickenIcon className="w-12 h-12 text-white" />,
                title: "FARM FRESH QUALITY",
                points: [
                  <>Eggs are collected fresh from trusted farms.</>,
                  <>Carefully selected for quality and freshness.</>
                ],
              },
              {
                icon: <Package className="w-10 h-10 text-white" />,
                title: "HYGIENIC PACKAGING PROCESS",
                points: [
                  <>Eggs are inspected before packing.</>,
                  <>Packed in clean, food-grade trays and cartons.</>,
                  <>Packaging is completed within <strong className="font-bold text-[#8b1a1a]">1 day</strong> to preserve freshness.</>
                ],
              },
              {
                icon: <Truck className="w-10 h-10 text-white" />,
                title: "FRESH DELIVERY",
                points: [
                  <>If the hen lays eggs today, we are packing the <strong className="font-bold text-[#8b1a1a]">same day</strong> and delivered <strong className="font-bold text-[#8b1a1a]">tomorrow</strong> fresh to your home.</>,
                  <>Fast delivery with minimal handling to maintain quality.</>
                ],
              },
            ].map((card, ci) => (
              <div
                key={card.title}
                className={`reveal ${ci % 2 === 0 ? "reveal-left" : "reveal-right"} group relative bg-white rounded-3xl p-6 md:p-8 md:pl-32 border border-[#8b1a1a]/10 shadow-[0_8px_30px_rgba(139,26,26,0.06)] hover:shadow-[0_20px_50px_rgba(139,26,26,0.16)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 md:gap-0`}
              >
                {/* Gold sweep accent that grows on hover — rounded to match the card corners */}
                <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-3xl bg-gradient-to-b from-[#d4af37] to-[#8b1a1a] scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500 hidden md:block" />

                {/* Huge overlapping icon circle — pops in on reveal, spins gently on hover */}
                <div className="badge-pop md:absolute md:-left-8 md:top-1/2 md:-translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-[#8b1a1a] to-[#4a0909] border-[6px] border-[#d4af37] flex items-center justify-center shadow-xl shrink-0 z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6">
                  {card.icon}
                  <Leaf className="absolute -bottom-2 -right-2 w-8 h-8 text-green-700 bg-white rounded-full p-1 shadow-sm" />
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-[#8b1a1a] text-2xl md:text-3xl font-bold tracking-wide mb-6 flex items-center justify-center md:justify-start gap-3">
                    {card.title}
                    <Leaf className="w-6 h-6 text-green-700 hidden md:block" />
                  </h3>
                  <ul className="reveal-stagger space-y-4 text-left w-full">
                    {card.points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-[16px] text-[#444] font-medium leading-relaxed">
                        <CheckCircle className="w-6 h-6 mt-0.5 text-[#8b1a1a] shrink-0 fill-[#8b1a1a] stroke-white" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commitment grid */}
        <div className="bg-[radial-gradient(circle_at_center,_#6a1322_0%,_#350810_50%,_#150205_100%)] py-20 px-6 md:px-12 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
             <ShieldCheck className="w-96 h-96 text-white" />
          </div>

          <div className="max-w-5xl mx-auto relative z-10">
            <h3 className="reveal font-serif text-3xl md:text-5xl text-white text-center mb-8 leading-tight">
              Trust the brand, Trust the Quality,<br />
              <span className="opacity-90 italic">Trust the freshness.</span>
            </h3>

            <div className="reveal flex justify-center mb-12">
               <div className="inline-block bg-white/10 px-8 py-3 rounded-full border border-white/20 backdrop-blur-sm">
                  <p className="text-white text-center text-sm md:text-base tracking-wide uppercase">
                     <span className="font-bold">Our Commitment</span>
                  </p>
               </div>
            </div>

            <div className="reveal reveal-stagger grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { icon: <ShieldCheck className="w-8 h-8 text-[#8b1a1a]" />, label: "Brand Integrity" },
                { icon: <Award className="w-8 h-8 text-[#8b1a1a]" />, label: "Uncompromising Quality" },
                { icon: <Clock className="w-8 h-8 text-[#8b1a1a]" />, label: "Daily Freshness" },
                { icon: <MapPin className="w-8 h-8 text-[#8b1a1a]" />, label: "Community Focus" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center text-center gap-5 group cursor-default">
                  {/* Egg-shaped icon container */}
                  <div 
                    className="w-20 h-24 bg-[#faf6f0] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] group-hover:-translate-y-2 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 relative border-[3px] border-[#d4af37]/30"
                    style={{ borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%" }}
                  >
                    <div className="transform -translate-y-0.5 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                  </div>
                  <span className="text-white/95 text-base font-medium tracking-wide">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Closing trust line */}
        <div className="bg-[#faf6f0] py-20 px-6 text-center">
          <p className="font-serif text-3xl md:text-4xl text-[#1a1a1a] mb-4">
            Experience the difference.
          </p>
          <p className="text-lg md:text-xl text-[#555] max-w-xl mx-auto leading-relaxed mb-8">
            Discover the true standard of freshness with BAB AL BARAKA.
          </p>
          <div className="inline-block border-y-2 border-[#8b1a1a] py-4 px-8">
             <p className="font-bold text-[#8b1a1a] text-xl md:text-2xl tracking-widest uppercase">
                A BARAKA in every egg.
             </p>
          </div>
        </div>

        {/* Products + Order Section */}
        <ProductsSection />
        <OrderSection />
        <FloatingCartBar />

        {/* Footer */}
        <footer className="bg-[#1a1a1a] py-12 px-6 md:px-12 text-center text-white/50 text-sm border-t border-white/10">
          <img src={logo.url} alt="Bab Al Baraka" className="h-16 w-16 mx-auto mb-4 rounded-full ring-1 ring-white/20" />
          <p className="font-serif text-xl text-white mb-2">Bab Al Baraka</p>
          <p>© {new Date().getFullYear()} — A gateway to blessings.</p>
        </footer>
      </div>


      {/* Fixed header — hidden during the video, fades in once the scrub completes */}
      <header
        ref={headerRef}
        className="fixed top-4 inset-x-3 md:inset-x-12 z-50 flex items-center justify-between px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-full backdrop-blur-md bg-black/40 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] gap-2"
        style={{ opacity: 0, pointerEvents: "none", transition: "opacity 0.3s ease" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src={logo.url} alt="Bab Al Baraka" className="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full ring-1 ring-[#d4af37]/60 shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-serif text-sm sm:text-lg md:text-xl text-white whitespace-nowrap">Bab Al Baraka</div>
            <div className="hidden sm:block text-[10px] tracking-[0.3em] uppercase text-white/50">Farm Fresh Eggs</div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm tracking-wide text-white/80">
          <button onClick={() => scrollToId("product-hero")} className="hover:text-white transition cursor-pointer">
            {lang === "en" ? "Home" : "الرئيسية"}
          </button>
          <button onClick={() => scrollToId("products-section")} className="hover:text-white transition cursor-pointer">
            {lang === "en" ? "Products" : "المنتجات"}
          </button>
          <button
            onClick={() => scrollToId("order-section")}
            className="relative flex items-center gap-1.5 hover:text-white transition cursor-pointer"
          >
            <ShoppingBasket className="w-4 h-4" />
            {lang === "en" ? "Cart" : "السلة"}
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-[#8b1a1a] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => lenisRef.current?.scrollTo(0, { duration: 1.4 })}
            className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
            title={lang === "en" ? "Replay the intro story" : "إعادة تشغيل القصة"}
          >
            <Film className="w-4 h-4" />
            {lang === "en" ? "Story" : "القصة"}
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* EN/AR label toggle — swaps nav + hero copy only, see note above */}
          <button
            onClick={() => setLang((l) => (l === "en" ? "ar" : "en"))}
            className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white transition text-xs font-medium tracking-wide px-2.5 py-2 rounded-full hover:bg-white/10"
            title="Switch language"
          >
            <Globe className="w-4 h-4" />
            {lang === "en" ? "AR" : "EN"}
          </button>

          {/* Customer login — hands off to the ops app's own login/order-history */}
          <a
            href={OPS_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition shrink-0"
            title={lang === "en" ? "Login / Order history" : "تسجيل الدخول"}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>

          <button
            onClick={() => scrollToId("order-section")}
            className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase bg-[#8b1a1a] hover:bg-[#a02222] px-3 sm:px-5 py-2 sm:py-2.5 rounded-full transition text-white font-medium shadow-[0_4px_14px_rgba(139,26,26,0.5)] whitespace-nowrap shrink-0"
          >
            {lang === "en" ? "Order Now" : "اطلب الآن"}
          </button>
        </div>
      </header>
    </div>
  );
}
