"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { ArrowDown, Bell, Check, ShieldCheck, Timer } from "lucide-react";
import { A, CTAPair, Countdown, EASE, Magnetic, TiltCard } from "../shared/kit";
import { heroFacts } from "./data";

/* ─────────────────────────────────────────────
   Focus Field canvas — particles drift in noise,
   then converge into a clean orbit. The brand
   metaphor: chaos → focus. Zero dependencies.
   ───────────────────────────────────────────── */
function FocusField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = 110;
    const start = performance.now();

    type P = {
      x: number; y: number; vx: number; vy: number;
      ox: number; oy: number; a: number; r0: number; s: number; hue: number;
    };
    let pts: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w / 2;
      const cy = h * 0.46;
      const R = Math.min(w, h) * 0.36;
      pts = Array.from({ length: N }, (_, i) => {
        const t = (i / N) * Math.PI * 2;
        const rr = R * (0.92 + Math.random() * 0.16);
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          ox: cx + Math.cos(t) * rr,
          oy: cy + Math.sin(t) * rr * 0.82,
          a: t,
          r0: R,
          s: 0.6 + Math.random() * 1.5,
          hue: Math.random(),
        };
      });
    };

    const draw = (now: number) => {
      if (!visible) return;
      const t = (now - start) / 1000;
      // focus parameter eases 0→1 over ~5s, breathing afterwards
      const ease = Math.min(1, t / 5);
      const focus = ease * ease * (3 - 2 * ease) * (0.86 + 0.14 * Math.sin(t * 0.5));
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.46;

      for (const p of pts) {
        p.a += 0.0016 + 0.0009 * (1 - focus);
        const tx = cx + Math.cos(p.a) * p.r0 * (0.92 + 0.06 * Math.sin(t * 0.7 + p.hue * 6));
        const ty = cy + Math.sin(p.a) * p.r0 * 0.82;
        p.vx += (Math.random() - 0.5) * 0.03;
        p.vy += (Math.random() - 0.5) * 0.03;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
        const x = p.x + (tx - p.x) * focus * 0.08;
        const y = p.y + (ty - p.y) * focus * 0.08;
        const d = Math.hypot(x - cx, y - cy);
        const near = Math.max(0, 1 - Math.abs(d - p.r0 * 0.95) / (p.r0 * 0.5));
        const isIris = p.hue > 0.72;
        ctx.beginPath();
        ctx.arc(x, y, p.s * (0.7 + near * 0.9), 0, Math.PI * 2);
        ctx.fillStyle = isIris
          ? `rgba(61,155,255,${0.16 + near * 0.5})`
          : `rgba(245,245,247,${0.05 + near * 0.3})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduce) {
      // static ring for reduced motion
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.46, R = Math.min(w, h) * 0.36;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.82, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = i % 5 === 0 ? "rgba(61,155,255,0.4)" : "rgba(245,245,247,0.14)";
        ctx.fill();
      }
    } else {
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !visible) {
          visible = true;
          raf = requestAnimationFrame(draw);
        } else if (!e.isIntersecting) {
          visible = false;
          cancelAnimationFrame(raf);
        }
      });
      io.observe(canvas);
      raf = requestAnimationFrame(draw);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
    />
  );
}

/* ── Floating chip in the hero composition ── */
function FloatChip({
  className,
  delay,
  children,
}: {
  className?: string;
  delay: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.9, ease: EASE }}
      className={`absolute z-20 ${className ?? ""}`}
    >
      <motion.div
        animate={reduce ? {} : { y: [0, -7, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
        className="glass-ft flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[0.8rem] font-medium text-ink shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.94]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 md:pt-44">
      <FocusField />
      {/* ambient iris glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-20%] h-[60vh] w-[90vw] -translate-x-1/2 rounded-full opacity-[0.13]"
        style={{
          background:
            "radial-gradient(closest-side, var(--iris), transparent 70%)",
        }}
      />
      <motion.div style={{ opacity: fade }} className="relative">
        <div className="ft-container flex flex-col items-center text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            className="eyebrow"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-iris" />
            A privacy-first Chrome extension · v1.17.0
          </motion.p>

          <h1 className="ft-display mt-7 max-w-5xl text-[clamp(2.9rem,8.4vw,6.6rem)] text-ink">
            {["Take back control", "of YouTube."].map((line, li) => (
              <span
                key={li}
                className="block overflow-hidden pb-[0.16em] -mb-[0.16em]"
              >
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: "120%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.05, ease: EASE, delay: 0.32 + li * 0.12 }}
                >
                  {li === 1 ? (
                    <span className="bg-gradient-to-r from-iris2 via-iris to-iris2 bg-clip-text text-transparent">
                      {line}
                    </span>
                  ) : (
                    line
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.65 }}
            className="ft-lead mt-7 max-w-2xl"
          >
            FocusTube turns YouTube from a distraction engine into a focused
            learning environment — removing the noise, timing the sessions, and
            showing you yesterday before today drifts.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
            className="mt-9"
          >
            <CTAPair
              primary={{ label: "Get FocusTube", href: "/download" }}
              secondary={{ label: "Explore the product", href: "/product" }}
            />
          </motion.div>
        </div>

        {/* ── Product composition ── */}
        <motion.div
          style={{ y: visualY, scale: visualScale }}
          className="relative ft-container mt-16 md:mt-20"
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.9 }}
            className="relative mx-auto max-w-4xl"
          >
            <TiltCard max={2.4} className="relative z-10">
              <div className="browser-frame">
                <div className="browser-bar" aria-hidden>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="mx-auto flex h-6 w-full max-w-[300px] items-center justify-center rounded-md border border-line bg-black/20 text-[11px] font-medium tracking-tight text-ink3">
                    focustube — dashboard
                  </div>
                  <div className="w-10" />
                </div>
                { }
                <img
                  src="/product/dashboard-overview.webp"
                  alt="FocusTube dashboard showing Focus Score 58, Focus Rings and today's analytics"
                  className="block h-auto w-full"
                  draggable={false}
                  fetchPriority="high"
                />
              </div>
            </TiltCard>

            {/* Floating popup */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1.1, ease: EASE, delay: 1.15 }}
              className="absolute -right-4 -top-10 z-20 hidden w-[180px] overflow-hidden rounded-[1.4rem] border border-line2 bg-surface shadow-[0_30px_80px_-24px_rgba(0,0,0,0.65)] sm:block md:-right-12 md:-top-16 md:w-[215px]"
            >
              { }
              <img
                src="/product/popup-home.webp"
                alt="FocusTube popup control center"
                className="block h-auto w-full"
                draggable={false}
              />
            </motion.div>

            {/* Floating chips */}
            <FloatChip className="-left-3 top-8 md:-left-14 md:top-14" delay={1.35}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deflected/15 text-deflected">
                <Check size={13} strokeWidth={3} />
              </span>
              Shorts hidden
            </FloatChip>
            <FloatChip className="-left-2 bottom-16 md:-left-10" delay={1.5}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-focused/15 text-focused">
                <Timer size={13} strokeWidth={2.5} />
              </span>
              <Countdown from={25 * 60} />
            </FloatChip>
            <FloatChip className="-right-2 bottom-6 md:-right-8" delay={1.62}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-saved/15 text-saved">
                <ShieldCheck size={13} strokeWidth={2.5} />
              </span>
              88 ads blocked
            </FloatChip>
            <FloatChip className="right-6 top-2 hidden md:flex" delay={1.72}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-iris/15 text-iris">
                <Bell size={13} strokeWidth={2.5} />
              </span>
              Daily briefing 8:00
            </FloatChip>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="relative mt-14 flex justify-center pb-14"
        >
          <motion.a
            href="#problem"
            aria-label="Scroll to content"
            animate={reduce ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink3 transition-colors duration-300 hover:text-ink"
          >
            <ArrowDown size={16} />
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Facts strip — deliberately OUTSIDE the hero fade wrapper above,
          so the numbers stay fully readable while the hero scrolls away */}
      <div className="hairline-t hairline-b relative">
        <div className="ft-container grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4">
          {heroFacts.map((f, i) => (
            <motion.div
              key={f.label}
              initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.1, duration: 0.9, ease: EASE }}
              className={`flex flex-col items-center text-center md:flex-row md:items-baseline md:justify-center md:gap-3 md:text-left ${
                i > 0 ? "md:border-l md:border-line" : ""
              }`}
            >
              <span className="text-[1.55rem] font-semibold tracking-[-0.03em] text-iris">
                {f.value}
              </span>
              <span className="mt-1 max-w-[16ch] text-[0.8rem] leading-snug text-ink2 md:mt-0">
                {f.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Thin marquee of real capabilities — quiet, factual */
export function CapabilityMarquee() {
  const items = [
    "Shorts eradicated",
    "Ads auto-skipped",
    "Autoplay terminated",
    "Focus Rings",
    "Daily Briefing",
    "Watch Intent",
    "Pomodoro 25/5/15",
    "Smart Lists",
    "Sleep Guard",
    "Monthly archives",
    "AI summaries · BYO key",
    "Vim keys",
    "Mika & Haru",
    "Streak Insurance",
  ];
  const row = [...items, ...items];
  return (
    <div className="ft-marquee-mask overflow-hidden py-5" aria-hidden>
      <div className="ft-marquee flex w-max gap-8">
        {row.map((it, i) => (
          <span
            key={i}
            className="flex items-center gap-8 whitespace-nowrap text-[0.82rem] font-medium uppercase tracking-[0.14em] text-ink3"
          >
            {it}
            <span className="h-1 w-1 rounded-full bg-iris/60" />
          </span>
        ))}
      </div>
    </div>
  );
}

export { Magnetic, A };
