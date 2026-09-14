"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  A,
  Chip,
  CTAPair,
  Countdown,
  EASE,
  FocusRings,
  PageIn,
  Reveal,
  SectionHead,
  Shot,
  TiltCard,
  WordReveal,
} from "../shared/kit";
import { CapabilityMarquee } from "./hero";
import { Hero } from "./hero";
import { featureSections, noiseItems, rings, showcaseSlides } from "./data";

/* ─────────────────────────────────────────────
   PROBLEM → SOLUTION — sticky scroll story
   ───────────────────────────────────────────── */
function NoiseRow({
  item,
  i,
  progress,
  total,
}: {
  item: (typeof noiseItems)[number];
  i: number;
  progress: MotionValue<number>;
  total: number;
}) {
  const start = 0.08 + (i / total) * 0.42;
  const end = start + 0.1;
  const opacity = useTransform(progress, [start, end], [1, 0]);
  const blur = useTransform(progress, [start, end], ["blur(0px)", "blur(6px)"]);
  const x = useTransform(progress, [start, end], [0, -26]);
  return (
    <motion.div
      style={{ opacity, filter: blur, x }}
      className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 [@media(max-height:880px)]:py-2.5"
    >
      <div>
        <p className="text-[0.95rem] font-semibold tracking-tight text-ink">
          {item.label}
        </p>
        <p className="mt-0.5 text-[0.82rem] text-ink3 [@media(max-height:880px)]:hidden">{item.detail}</p>
      </div>
      <EyeOff size={16} className="shrink-0 text-ink3" aria-hidden />
    </motion.div>
  );
}

function ProblemSolution() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const cleanOpacity = useTransform(scrollYProgress, [0.55, 0.75], [0, 1]);
  const cleanScale = useTransform(scrollYProgress, [0.55, 0.9], [0.92, 1]);
  const noiseScale = useTransform(scrollYProgress, [0.3, 0.6], [1, 0.94]);
  const titleSwap = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], [0, 0, 1, 1]);
  const lineY1 = useTransform(titleSwap, [0, 1], ["0%", "-110%"]);
  const lineY2 = useTransform(titleSwap, [0, 1], ["110%", "0%"]);
  const barScale = useTransform(scrollYProgress, [0.1, 0.75], [0, 1]);

  return (
    <section id="problem" ref={ref} className="relative mt-16 h-[300vh] md:mt-28" aria-label="The problem and the solution">
      <div className="sticky top-0 flex h-screen overflow-hidden pb-10 [align-items:safe_center] pt-20">
        <div className="ft-container grid w-full items-center gap-12 lg:grid-cols-2">
          {/* Left: narrative */}
          <div className="@container">
            <Reveal>
              <span className="eyebrow">The problem</span>
            </Reveal>
            <div className="relative mt-5 h-[1.36em] overflow-hidden text-[clamp(1.5rem,7.6cqw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.04em] text-ink [@media(max-height:880px)]:mt-3">
              <motion.span style={{ y: lineY1 }} className="block">
                Designed for watching.
              </motion.span>
              <motion.span
                style={{ y: reduce ? "0%" : lineY2 }}
                className="absolute inset-0 block"
                aria-hidden={false}
              >
                <span className="bg-gradient-to-r from-iris2 to-iris bg-clip-text text-transparent">
                  Not endless scrolling.
                </span>
              </motion.span>
            </div>
            <Reveal delay={0.1}>
              <p className="ft-lead mt-6 max-w-lg [@media(max-height:880px)]:mt-3.5 [@media(max-height:880px)]:text-[0.98rem]">
                YouTube is useful — lectures, tutorials, documentaries, the one
                video that explains the thing. It&apos;s also a machine tuned
                against your intention:
              </p>
            </Reveal>
            <div className="relative mt-8 max-w-lg space-y-2.5 [@media(max-height:880px)]:mt-4 [@media(max-height:880px)]:space-y-2">
              {noiseItems.map((item, i) => (
                <NoiseRow
                  key={item.label}
                  item={item}
                  i={i}
                  progress={scrollYProgress}
                  total={noiseItems.length}
                />
              ))}
            </div>
            <div className="mt-8 h-[3px] w-full max-w-lg overflow-hidden rounded-full bg-surface2 [@media(max-height:880px)]:mt-5">
              <motion.div
                style={{ scaleX: barScale, transformOrigin: "left" }}
                className="h-full w-full bg-gradient-to-r from-iris2 to-iris"
              />
            </div>
          </div>

          {/* Right: noise stack → clean product */}
          <div className="relative hidden h-[62vh] items-center justify-center lg:flex" aria-hidden>
            <motion.div
              style={{ scale: noiseScale }}
              className="absolute inset-0 flex flex-col justify-center gap-2.5 px-6"
            >
              {[...noiseItems, ...noiseItems].map((n, i) => (
                <motion.div
                  key={i}
                  animate={reduce ? {} : { x: [0, i % 2 ? 14 : -14, 0], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-xl border border-line bg-surface2/70 px-4 py-3 text-[0.78rem] text-ink3"
                  style={{ marginLeft: (i % 4) * 18 }}
                >
                  {n.label} · {n.detail}
                </motion.div>
              ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper" />
            </motion.div>
            <motion.div
              style={{ opacity: reduce ? 1 : cleanOpacity, scale: reduce ? 1 : cleanScale }}
              className="relative z-10 w-full max-w-lg"
            >
              <Shot
                src="/product/popup-home.webp"
                alt="FocusTube popup — clean control center"
                frame="phone"
                className="mx-auto max-w-[330px] [@media(max-height:880px)]:max-w-[280px]"
              />
              <motion.p
                style={{ opacity: reduce ? 1 : cleanOpacity }}
                className="mt-6 text-center text-[0.9rem] text-ink2"
              >
                What remains is the video you came for — and the controls that
                keep it that way.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOCUS RINGS — signature section
   ───────────────────────────────────────────── */
function RingsSection() {
  const reduce = useReducedMotion();
  const week = [0.9, 1, 0.75, 1, 0.6, 1, 0.85];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <section className="relative py-28 md:py-40" aria-label="Focus Rings">
      <div className="ft-container grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <Reveal>
            <span className="eyebrow">The habit system</span>
          </Reveal>
          <WordReveal
            text="Three rings. Closed daily. Earned honestly."
            className="ft-h2 mt-5 text-[clamp(2rem,4.6vw,3.6rem)]"
          />
          <Reveal delay={0.12}>
            <p className="ft-lead mt-6 max-w-xl">
              An Apple-Fitness-style triple ring, purpose-built for attention.
              <strong className="font-semibold text-deflected"> Deflected</strong>{" "}
              counts ads, Shorts and urges skipped.{" "}
              <strong className="font-semibold text-focused">Focused</strong>{" "}
              counts deliberate Pomodoro minutes.{" "}
              <strong className="font-semibold text-saved">Saved</strong> counts
              the minutes blockers handed back to your day.
            </p>
          </Reveal>
          <div className="mt-9 space-y-4">
            {rings.map((r, i) => (
              <Reveal key={r.key} delay={0.1 + i * 0.08}>
                <div className="flex items-center gap-4">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: r.color }}
                    aria-hidden
                  />
                  <div className="flex-1">
                    <p className="text-[0.95rem] font-semibold tracking-tight text-ink">
                      {r.label}
                    </p>
                    <p className="text-[0.82rem] text-ink3">{r.detail}</p>
                  </div>
                  <span className="font-mono text-[0.85rem] text-ink2">
                    {r.value} / {r.goal}
                    {"format" in r && typeof r.format === "function" ? "" : ""}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <p className="mt-8 max-w-xl text-[0.86rem] leading-relaxed text-ink3">
              Close all three and the day celebrates — once, quietly. Show up
              four days a week and streak insurance banks a freeze for the day
              life happens. Anti-gaming math underneath means the score is
              earned, never manufactured.
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col items-center">
          <TiltCard max={4}>
            <FocusRings size={330} />
          </TiltCard>
          {/* Week strip like the product's mini-rings */}
          <div className="mt-10 flex items-end gap-3" aria-hidden>
            {week.map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <motion.div
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.6, ease: EASE }}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--ring-deflected) 0% ${v * 33}%, var(--ring-focused) ${v * 33}% ${v * 66}%, var(--ring-saved) ${v * 66}% ${v * 100}%, rgba(128,128,128,0.18) ${v * 100}% 100%)`,
                  }}
                >
                  <span className="h-5 w-5 rounded-full bg-paper" />
                </motion.div>
                <span className="text-[0.62rem] font-medium uppercase tracking-widest text-ink3">
                  {days[i]}
                </span>
              </div>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="mt-6 text-center text-[0.8rem] text-ink3">
              A week of closed rings — with one rainy Wednesday, insured.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURE SECTIONS — each with its own composition
   ───────────────────────────────────────────── */
function FeatureVisual({ id }: { id: string }) {
  const reduce = useReducedMotion();
  switch (id) {
    case "distraction-control":
      return (
        <div className="relative">
          <Shot
            src="/product/overlay-site-block.webp"
            alt="A site blocked by FocusTube with a calm focus nudge"
            frame="browser"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
            className="glass-ft absolute -bottom-5 left-6 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[0.8rem] font-medium text-ink"
          >
            <EyeOff size={14} className="text-deflected" /> rabbit-hole blocked
          </motion.div>
        </div>
      );
    case "focus-timer":
      return (
        <div className="relative">
          <Shot
            src="/product/overlay-focus-timer.webp"
            alt="Focus Timer overlay with a live countdown"
            frame="browser"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
            className="glass-ft absolute -top-4 right-6 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[0.95rem] font-semibold text-ink"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-focused" />
            <Countdown from={15 * 60 + 42} />
          </motion.div>
        </div>
      );
    case "daily-briefing":
      return (
        <Shot
          src="/product/digest-morning.webp"
          alt="Morning Daily Briefing showing yesterday's Focus Score of 87"
          frame="browser"
        />
      );
    case "watch-intent":
      return (
        <div className="relative">
          <Shot
            src="/product/watch-intent.webp"
            alt="Watch Intent prompt — what are you here for?"
            frame="browser"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
            className="glass-ft absolute -bottom-5 right-8 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[0.8rem] font-medium text-ink"
          >
            <Sparkles size={14} className="text-iris" /> Intent Match · 92%
          </motion.div>
        </div>
      );
    case "ai-summaries":
      return (
        <div className="mx-auto flex max-w-md flex-col items-center">
          <Shot
            src="/product/popup-youtube.webp"
            alt="FocusTube's YouTube controls, including AI summary"
            frame="phone"
            className="w-full max-w-[340px]"
          />
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {["Gemini", "OpenAI", "Mistral", "DeepSeek", "xAI"].map((p, i) => (
              <motion.span
                key={p}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: EASE }}
                className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.78rem] font-medium text-ink2"
              >
                {p}
              </motion.span>
            ))}
          </div>
          <p className="mt-4 text-center text-[0.8rem] text-ink3">
            Bring your own key — requests go browser → provider, nothing in
            between.
          </p>
        </div>
      );
    case "companion":
      return (
        <div className="relative">
          <Shot
            src="/product/companion-duo.webp"
            alt="Mika and Haru — the full emotion and pose sheet"
            frame="browser"
          />
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.7, ease: EASE }}
            className="glass-ft absolute -bottom-5 left-8 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[0.8rem] font-medium text-ink"
          >
            <span className="text-iris">🎌</span> 8 emotions × 4 poses × 2 buddies
          </motion.div>
        </div>
      );
    case "analytics":
      return (
        <Shot
          src="/product/dashboard-analytics.webp"
          alt="FocusTube analytics — heatmap, timeline and topics"
          frame="browser"
        />
      );
    default:
      return null;
  }
}

function FeatureBlock({
  section,
  index,
}: {
  section: (typeof featureSections)[number];
  index: number;
}) {
  const flip = index % 2 === 1;
  const reduce = useReducedMotion();
  return (
    <section
      className="relative py-20 md:py-28"
      aria-label={section.title}
    >
      <div
        className={`ft-container grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16`}
      >
        <div className={flip ? "lg:order-2" : ""}>
          <Reveal>
            <span className="eyebrow">{section.eyebrow}</span>
          </Reveal>
          <WordReveal
            text={section.title}
            className="ft-h2 mt-4 text-[clamp(1.8rem,3.6vw,2.9rem)]"
          />
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink2">
              {section.body}
            </p>
          </Reveal>
          <ul className="mt-7 space-y-2.5">
            {section.points.map((p, i) => (
              <motion.li
                key={p}
                initial={reduce ? false : { opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.55, ease: EASE }}
                className="flex items-start gap-3 text-[0.92rem] text-ink2"
              >
                <span className="mt-[0.55em] h-1 w-3 shrink-0 rounded-full bg-iris" aria-hidden />
                {p}
              </motion.li>
            ))}
          </ul>
        </div>
        <Reveal delay={0.15} className={flip ? "lg:order-1" : ""} y={40}>
          <FeatureVisual id={section.id} />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   INTERACTIVE SHOWCASE — real screenshots, switchable
   ───────────────────────────────────────────── */
function Showcase() {
  const [active, setActive] = useState(1);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const slide = showcaseSlides[active];

  const go = (d: number) => {
    setDir(d);
    setActive((a) => (a + d + showcaseSlides.length) % showcaseSlides.length);
  };

  return (
    <section className="relative py-28 md:py-36" aria-label="Product showcase">
      <div className="ft-container">
        <SectionHead
          eyebrow="The product"
          title="Every surface. One design language."
          lead="Real production UI, captured from the shipped extension. Switch between the surfaces you'll actually touch every day."
        />
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {showcaseSlides.map((s, i) => (
            <Chip key={s.id} active={i === active} onClick={() => { setDir(i > active ? 1 : -1); setActive(i); }}>
              {s.label}
            </Chip>
          ))}
        </div>

        <div className="relative mx-auto mt-12 max-w-4xl">
          <div className="relative min-h-[420px] sm:min-h-[480px] md:min-h-[560px]" style={{ perspective: 1400 }}>
            {showcaseSlides.map((s, i) =>
              i === active ? (
                <motion.div
                  key={s.id}
                  initial={reduce ? false : { opacity: 0, x: dir * 70, rotateY: dir * 4 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="absolute inset-0 flex items-start justify-center"
                >
                  <Shot
                    src={s.src}
                    alt={s.caption}
                    frame={s.frame}
                    className={s.frame === "phone" ? "w-full max-w-[360px]" : "w-full"}
                  />
                </motion.div>
              ) : null
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-6">
            <button
              type="button"
              aria-label="Previous screenshot"
              onClick={() => go(-1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink2 transition-all duration-300 hover:border-line2 hover:text-ink"
            >
              <ChevronLeft size={17} />
            </button>
            <AnimateCaption caption={slide.caption} k={slide.id} />
            <button
              type="button"
              aria-label="Next screenshot"
              onClick={() => go(1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink2 transition-all duration-300 hover:border-line2 hover:text-ink"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import { AnimatePresence } from "framer-motion";
function AnimateCaption({ caption, k }: { caption: string; k: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={k}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="max-w-md text-center text-[0.9rem] leading-relaxed text-ink2"
      >
        {caption}
      </motion.p>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   PRIVACY STRIP
   ───────────────────────────────────────────── */
function PrivacyStrip() {
  const items = [
    {
      icon: HardDrive,
      title: "100% local",
      body: "Blocking, scoring, analytics and rings compute on your device. Unplug the network after install — everything but AI summaries keeps working.",
    },
    {
      icon: EyeOff,
      title: "No telemetry",
      body: "No account, no cloud, no analytics pipeline. There is no server to send anything to — that's an architecture, not a promise.",
    },
    {
      icon: KeyRound,
      title: "Your keys, your provider",
      body: "AI summaries use your key and talk straight to Gemini, OpenAI, Mistral, DeepSeek or xAI. FocusTube stores nothing in between.",
    },
    {
      icon: ShieldCheck,
      title: "Hardened MV3",
      body: "Validated message payloads, escaped AI output, minimal web-accessible resources — 20 security issues triaged and fixed in v1.0.1 alone.",
    },
  ];
  return (
    <section className="relative py-24 md:py-32" aria-label="Privacy principles">
      <div className="ft-container">
        <div className="card-ft ft-grain relative overflow-hidden px-8 py-12 md:px-14 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.1]"
            style={{ background: "radial-gradient(closest-side, var(--iris), transparent)" }}
          />
          <Reveal>
            <span className="eyebrow">Privacy &amp; security</span>
          </Reveal>
          <WordReveal
            text="It watches your attention. Not you."
            className="ft-h2 mt-4 max-w-2xl text-[clamp(1.8rem,3.8vw,3rem)]"
          />
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it, i) => (
              <Reveal key={it.title} delay={i * 0.08}>
                <it.icon size={20} className="text-iris" aria-hidden />
                <h3 className="mt-4 text-[1rem] font-semibold tracking-tight text-ink">
                  {it.title}
                </h3>
                <p className="mt-2 text-[0.86rem] leading-relaxed text-ink2">
                  {it.body}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <A
              href="/security"
              className="mt-11 inline-flex items-center gap-2 text-[0.9rem] font-medium text-iris transition-colors hover:text-iris2"
            >
              Read the full security policy
              <ChevronRight size={15} />
            </A>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FINAL CTA
   ───────────────────────────────────────────── */
export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-32 md:py-44" aria-label="Get started">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[110vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12]"
        style={{
          background: "radial-gradient(closest-side, var(--iris), transparent 68%)",
        }}
      />
      <div className="ft-container relative flex flex-col items-center text-center">
        <Reveal>
          <span className="eyebrow">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-iris" />
            Free · Open source · 5-minute setup
          </span>
        </Reveal>
        <WordReveal
          text="Your attention, back on your terms."
          className="ft-display mt-6 max-w-4xl text-[clamp(2.4rem,6.4vw,5rem)]"
        />
        <Reveal delay={0.15}>
          <p className="ft-lead mt-6 max-w-xl">
            Install from source in five minutes, close your first ring tonight,
            and read yesterday over coffee tomorrow.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-10">
          <CTAPair
            primary={{ label: "Get FocusTube", href: "/download" }}
            secondary={{ label: "Read the docs", href: "/docs" }}
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   HOMEPAGE ASSEMBLY
   ───────────────────────────────────────────── */
export default function Home() {
  return (
    <PageIn>
      <Hero />
      <CapabilityMarquee />
      <ProblemSolution />
      <RingsSection />
      <div className="hairline-t">
        <div className="ft-container pt-20">
          <SectionHead
            eyebrow="What it does"
            title="Protection, layered."
            lead="Each layer removes one more way to drift — and adds one more reason to stay deliberate."
          />
        </div>
        {featureSections.map((s, i) => (
          <FeatureBlock key={s.id} section={s} index={i} />
        ))}
      </div>
      <Showcase />
      <PrivacyStrip />
      <FinalCTA />
    </PageIn>
  );
}
