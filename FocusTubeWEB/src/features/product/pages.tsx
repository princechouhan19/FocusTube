"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { useScroll, useTransform } from "framer-motion";
import {
  Ban,
  BarChart3,
  Brain,
  Clock3,
  Database,
  Puzzle,
} from "lucide-react";
import {
  EASE,
  FocusRings,
  PageIn,
  Reveal,
  SectionHead,
  Shot,
  TiltCard,
  WordReveal,
} from "../shared/kit";
import { FinalCTA } from "../home/sections";
import { howSteps } from "./data";

/* ── Feature tour data (from the repo's Feature Map) ── */
const categories = [
  {
    id: "video",
    icon: Brain,
    label: "Video page",
    tagline: "The player, cleaned up and instrumented.",
    items: [
      {
        t: "AI Summary modal",
        d: "Transcript-aware summaries from your own key — Gemini, OpenAI, Mistral, DeepSeek or xAI. One button under the player.",
      },
      {
        t: "Shorts eradication",
        d: "Shorts disappear from the shelf, the sidebar and the grid — not hidden, gone.",
      },
      {
        t: "Ad skipping",
        d: "Skips pre-rolls and mid-rolls automatically, without polling the page into a profiler chart.",
      },
      {
        t: "Autoplay terminator",
        d: "The next video never starts itself. Continuing is always your decision.",
      },
      {
        t: "Force highest quality",
        d: "No more 480p surprises — the player opens at the quality your connection can afford.",
      },
    ],
    shot: "/product/popup-youtube.webp",
    frame: "phone" as const,
  },
  {
    id: "blocking",
    icon: Ban,
    label: "Blocking",
    tagline: "Layered rules, from one keyword to the whole site.",
    items: [
      {
        t: "URL & site blocking",
        d: "Any site, any duration, subdomain-aware. Block instagram.com and old.instagram.com falls too.",
      },
      {
        t: "Keyword & channel blocking",
        d: "Mute topics and creators on YouTube without touching anyone else's feed.",
      },
      {
        t: "Smart Lists",
        d: "Category presets — Social, Gaming, News, Shopping — that block whole classes of rabbit holes.",
      },
      {
        t: "Per-site time limits",
        d: "Daily budgets with live countdowns; the interstitial arrives before the hour does.",
      },
      {
        t: "Graduated unblock friction",
        d: "A reason, a pause that grows through the day, and a quiz when it matters. Off / Standard / Strict.",
      },
    ],
    shot: "/product/block-page.webp",
    frame: "browser" as const,
  },
  {
    id: "focus",
    icon: Clock3,
    label: "Focus",
    tagline: "Sessions with a beginning, an end, and a reason.",
    items: [
      {
        t: "Focus Timers",
        d: "Quick 5/15/30/60-minute locks with a live, real-time countdown overlay.",
      },
      {
        t: "Pomodoro 25/5/15",
        d: "Classic intervals plus a Deep Work mode that auto-blocks everything else while you're in it.",
      },
      {
        t: "Scheduled blocks",
        d: "Recurring daily windows — mornings for writing, evenings for nothing. Sleep Guard ships a 22:30–07:00 default.",
      },
      {
        t: "Quiz gate",
        d: "Disabling protection mid-session asks a question first. The pause is the point.",
      },
      {
        t: "Watch Intent",
        d: "State your purpose and planned minutes; the dashboard tracks your Intent Match rate.",
      },
    ],
    shot: "/product/overlay-focus-timer.webp",
    frame: "browser" as const,
  },
  {
    id: "insights",
    icon: BarChart3,
    label: "Insights",
    tagline: "Analytics that reward honesty, not grinding.",
    items: [
      {
        t: "Focus Score",
        d: "0–100, with diminishing returns, daily caps and diversity weighting — anti-gaming by design.",
      },
      {
        t: "Focus Rings",
        d: "Deflected / Focused / Saved, with editable goals, weekly badges and a Monthly Review.",
      },
      {
        t: "30-day heatmap & timeline",
        d: "GitHub-style consistency view plus an activity timeline that names its dates honestly.",
      },
      {
        t: "Watch-time topics",
        d: "Hashtag and category tracking shows what your hours actually went to.",
      },
      {
        t: "Day navigation",
        d: "Day / week / month ranges with lifetime totals — the full arc of your attention.",
      },
    ],
    shot: "/product/dashboard-overview.webp",
    frame: "browser" as const,
  },
  {
    id: "data",
    icon: Database,
    label: "Data",
    tagline: "Portable, readable, yours.",
    items: [
      {
        t: "Monthly archive sync",
        d: "One small file per month into any folder you own — rotated automatically, importable anywhere.",
      },
      {
        t: "Cross-browser file sync",
        d: "Point two browsers at the same folder and a union-merge cycle keeps them aligned — Dropbox and OneDrive included.",
      },
      {
        t: "JSON export / import",
        d: "A fallback for browsers without the File System Access API, and for people who like their data legible.",
      },
      {
        t: "120-day local history",
        d: "Enough arc to see seasons of attention, small enough to stay fast.",
      },
      {
        t: "Sensitive-data exclusions",
        d: "API keys, passwords, emails and session state never enter the portable file.",
      },
    ],
    shot: "/product/dashboard-month.webp",
    frame: "browser" as const,
  },
  {
    id: "extras",
    icon: Puzzle,
    label: "Extras",
    tagline: "The details that make it feel finished.",
    items: [
      {
        t: "Mika & Haru",
        d: "Two parametric anime buddies with 8 emotions × 4 poses, a live site clock and a mood engine — about 16 KB of SVG.",
      },
      {
        t: "Daily Briefing",
        d: "The first open of the day reviews yesterday; the evening open winds today down.",
      },
      {
        t: "Tab Manager",
        d: "Workspaces and grouping for the research-and-references phase of any session.",
      },
      {
        t: "Willpower points",
        d: "A gentle counter that rises when you decline — visible proof the muscle exists.",
      },
      {
        t: "Vim-style keys",
        d: "Opt-in: j/k scroll, gg/G, f, t — Esc back, x close, ? help. Exits are first-class.",
      },
    ],
    shot: "/product/companion-duo.webp",
    frame: "browser" as const,
  },
];

/* ═══════════ FEATURES PAGE ═══════════ */
export function FeaturesPage() {
  const [active, setActive] = useState("video");
  const cat = categories.find((c) => c.id === active)!;

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-16 pt-36 md:pt-44">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-30%] h-[50vh] w-[80vw] -translate-x-1/2 rounded-full opacity-[0.1]"
          style={{ background: "radial-gradient(closest-side, var(--iris), transparent 70%)" }}
        />
        <div className="ft-container">
          <SectionHead
            eyebrow="Features"
            title="A complete toolkit for deliberate watching."
            lead="Six layers, each doing one job well. Together they change what YouTube is — from a feed that happens to you into a tool you happen to use."
            align="center"
          />
        </div>
      </section>

      <section className="hairline-t py-16 md:py-24">
        <div className="ft-container grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-16">
          {/* Category rail */}
          <nav aria-label="Feature categories" className="lg:sticky lg:top-28 lg:self-start">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  aria-pressed={active === c.id}
                  className={`relative flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 lg:w-full ${
                    active === c.id
                      ? "border-line2 bg-surface"
                      : "border-transparent text-ink2 hover:bg-surface/60"
                  }`}
                >
                  {active === c.id && (
                    <motion.span
                      layoutId="feat-rail"
                      className="absolute inset-0 -z-10 rounded-2xl border border-line2 bg-surface"
                      transition={{ duration: 0.45, ease: EASE }}
                    />
                  )}
                  <c.icon
                    size={17}
                    className={active === c.id ? "text-iris" : "text-ink3"}
                  />
                  <span
                    className={`whitespace-nowrap text-[0.92rem] font-medium tracking-tight lg:whitespace-normal ${
                      active === c.id ? "text-ink" : ""
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 hidden rounded-2xl border border-line bg-surface p-5 lg:block">
              <FocusRings size={150} />
              <p className="mt-3 text-center text-[0.8rem] leading-relaxed text-ink3">
                The rings every layer feeds — protection made visible.
              </p>
            </div>
          </nav>

          {/* Category detail */}
          <div>
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                <div className="flex-1">
                  <span className="eyebrow">{cat.label}</span>
                  <h2 className="ft-h2 mt-3 text-[clamp(1.7rem,3vw,2.4rem)]">
                    {cat.tagline}
                  </h2>
                </div>
                <Shot
                  src={cat.shot}
                  alt={`${cat.label} — FocusTube UI`}
                  frame={cat.frame}
                  className={cat.frame === "phone" ? "w-full max-w-[300px]" : "w-full max-w-xl"}
                />
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {cat.items.map((it, i) => (
                  <motion.div
                    key={it.t}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.55, ease: EASE }}
                    className="card-ft p-5 transition-colors duration-300 hover:border-line2"
                  >
                    <h3 className="text-[0.95rem] font-semibold tracking-tight text-ink">
                      {it.t}
                    </h3>
                    <p className="mt-2 text-[0.86rem] leading-relaxed text-ink2">
                      {it.d}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use-case strip */}
      <section className="hairline-t py-20 md:py-28">
        <div className="ft-container">
          <SectionHead
            eyebrow="Use cases"
            title="Built for how focus actually breaks."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                k: "The student",
                s: "Lecture playlists without the sidebar of everything else. Pomodoro while studying, Sleep Guard after midnight.",
                shot: "/product/popup-focus.webp",
              },
              {
                k: "The researcher",
                s: "Watch Intent keeps sessions honest, topics show where the hours went, and the Tab Manager keeps sources sorted.",
                shot: "/product/watch-intent.webp",
              },
              {
                k: "The evening scroller",
                s: "Graduated unblock friction turns one more video into a decision. The morning briefing shows yesterday, gently.",
                shot: "/product/digest-morning.webp",
              },
            ].map((u, i) => (
              <Reveal key={u.k} delay={i * 0.1}>
                <div className="card-ft group h-full overflow-hidden p-0">
                  <div className="overflow-hidden">
                    { }
                    <img
                      src={u.shot}
                      alt={u.k}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-[1.05rem] font-semibold tracking-tight text-ink">{u.k}</h3>
                    <p className="mt-2 text-[0.88rem] leading-relaxed text-ink2">{u.s}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </PageIn>
  );
}

/* ═══════════ PRODUCT PAGE ═══════════ */
const surfaces = [
  {
    n: "01",
    name: "The popup",
    story:
      "One click from any page, the control center appears: your rings, today's numbers, and every protection one tap away. Focus sessions start here; blocks land here; willpower counts up here.",
    shot: "/product/popup-home.webp",
    extra: "/product/popup-goals.webp",
    caption: "Home · Focus · Goals · Settings — four tabs, zero digging.",
  },
  {
    n: "02",
    name: "The dashboard",
    story:
      "The full picture of your attention: Focus Score with anti-gaming math, the triple ring, a 30-day heatmap, watch-time topics, and a Monthly Review that badges your weeks.",
    shot: "/product/dashboard-overview.webp",
    extra: "/product/dashboard-month.webp",
    caption: "Day, week and month views — with a best-day line worth chasing.",
  },
  {
    n: "03",
    name: "The interventions",
    story:
      "Where protection happens: a live Focus Timer overlay, calm block interstitials with your buddy's nudge, and a graduated unblock ladder that turns one more video into a decision.",
    shot: "/product/overlay-focus-timer.webp",
    extra: "/product/overlay-site-block.webp",
    caption: "Timers tick in real time. Blocks explain themselves.",
  },
  {
    n: "04",
    name: "The briefing",
    story:
      "The first open of the day is yesterday's review — score, rings, 7-day trend, where time went. The fresh-start effect, applied to attention, every morning.",
    shot: "/product/digest-morning.webp",
    extra: "/product/companion-digest.webp",
    caption: "Mornings show yesterday. Evenings wind today down.",
  },
  {
    n: "05",
    name: "The companion",
    story:
      "Mika or Haru floats on any site with a live site clock and an emotion driven by that site's score — happy on deep work, worried on feeds, joyful when your rings close.",
    shot: "/product/companion-panel.webp",
    extra: "/product/companion-guide.webp",
    caption: "Tap to expand: rings, saved time, quick blocks, buddy switcher.",
  },
  {
    n: "06",
    name: "The setup",
    story:
      "An iOS-style onboarding assistant guided by the buddy you pick — pointing at controls, reacting to each step, personalizing every bubble with your name.",
    shot: "/product/onboarding-buddy.webp",
    extra: "/product/onboarding.webp",
    caption: "Under a minute from install to protected.",
  },
];

export function ProductPage() {
  const reduce = useReducedMotion();
  const [zoom, setZoom] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-10 pt-36 md:pt-44">
        <div className="ft-container">
          <SectionHead
            eyebrow="Product tour"
            title="A guided walk through every surface."
            lead="Six surfaces, one design language, zero dark patterns. Everything below is real production UI from the shipped extension."
          />
        </div>
      </section>

      <section ref={ref} className="relative py-16 md:py-24">
        <div className="ft-container relative">
          {/* progress line */}
          <div className="absolute left-[27px] top-0 hidden h-full w-px bg-line md:block" aria-hidden>
            <motion.div
              style={{ scaleY: lineScale, transformOrigin: "top" }}
              className="h-full w-full bg-gradient-to-b from-iris2 to-iris"
            />
          </div>
          <div className="space-y-24 md:space-y-32">
            {surfaces.map((s, i) => (
              <div key={s.n} className="relative grid gap-10 md:grid-cols-[56px_1fr] md:gap-8">
                <div className="hidden md:block" aria-hidden>
                  <div className="sticky top-32 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper font-mono text-[0.8rem] text-iris">
                    {s.n}
                  </div>
                </div>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 ${
                    i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <Reveal>
                      <span className="eyebrow md:hidden">{s.n}</span>
                      <h2 className="ft-h2 mt-2 text-[clamp(1.7rem,3vw,2.5rem)] md:mt-0">
                        {s.name}
                      </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                      <p className="ft-lead mt-5 max-w-xl">{s.story}</p>
                    </Reveal>
                    <Reveal delay={0.18}>
                      <p className="mt-6 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-[0.85rem] text-ink2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-iris" aria-hidden />
                        {s.caption}
                      </p>
                    </Reveal>
                  </div>
                  <Reveal delay={0.15} y={40}>
                    <div className="relative">
                      <TiltCard max={2.6}>
                        <button
                          type="button"
                          onClick={() => setZoom(s.shot)}
                          className="block w-full cursor-zoom-in text-left"
                          aria-label={`Enlarge ${s.name} screenshot`}
                        >
                          <Shot src={s.shot} alt={s.name} frame={s.shot.includes("popup") ? "phone" : "browser"}
                            className={s.shot.includes("popup") ? "mx-auto max-w-[300px]" : ""} />
                        </button>
                      </TiltCard>
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: 24, rotate: -2 }}
                        whileInView={{ opacity: 1, y: 0, rotate: -3 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.25, duration: 0.8, ease: EASE }}
                        className={`absolute -bottom-8 hidden w-[38%] overflow-hidden rounded-xl border border-line2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] sm:block ${
                          i % 2 === 1 ? "-left-4" : "-right-4"
                        }`}
                        aria-hidden
                      >
                        { }
                        <img src={s.extra} alt="" className="block w-full" loading="lazy" />
                      </motion.div>
                    </div>
                  </Reveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zoom dialog */}
      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          onClick={() => setZoom(null)}
          onKeyDown={(e) => e.key === "Escape" && setZoom(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="max-h-[88vh] max-w-5xl overflow-auto rounded-2xl border border-line2"
          >
            { }
            <img src={zoom} alt="Enlarged FocusTube screenshot" className="block w-full" />
          </motion.div>
        </div>
      )}

      {/* Design language strip */}
      <section className="hairline-t py-20 md:py-28">
        <div className="ft-container">
          <SectionHead
            eyebrow="Design language"
            title="Graphite & Iris."
            lead="One token system — warm graphite surfaces, a single iris-amber accent, hairline borders and spring easing — shared by every surface of the product and this website."
          />
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              ["Graphite", "#151517"],
              ["Iris", "#F5A524"],
              ["Deflected", "#FF375F"],
              ["Focused", "#30D158"],
              ["Saved", "#64D2FF"],
              ["SF-type ramps", "var(--fg)"],
            ].map(([n, c], i) => (
              <Reveal key={n} delay={i * 0.06}>
                <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-2 pr-5">
                  <span
                    className="h-7 w-7 rounded-full border border-white/10"
                    style={{ background: c.startsWith("var") ? "transparent" : c }}
                  />
                  <span className="text-[0.85rem] font-medium text-ink2">
                    {n} <span className="ml-1 font-mono text-[0.72rem] text-ink3">{c}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-10 max-w-2xl text-center text-[0.9rem] leading-relaxed text-ink2">
              The product inspired this website — and this website returns the
              favor. Both speak the same visual language because both ship from
              the same tokens.
            </p>
          </Reveal>
        </div>
      </section>
      <FinalCTA />
    </PageIn>
  );
}

/* ═══════════ HOW IT WORKS PAGE ═══════════ */
export function HowPage() {
  return (
    <PageIn>
      <section className="relative overflow-hidden pb-10 pt-36 md:pt-44">
        <div className="ft-container">
          <SectionHead
            eyebrow="How it works"
            title="Five steps from distracted to deliberate."
            lead="FocusTube isn't a settings page — it's a loop. Install once, and the daily cycle takes over: intend, protect, close, review."
          />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="ft-container space-y-24 md:space-y-32">
          {howSteps.map((s, i) => (
            <div
              key={s.n}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <Reveal>
                  <span className="font-mono text-[0.95rem] font-medium tracking-[0.1em] text-iris">
                    {s.n}
                  </span>
                </Reveal>
                <WordReveal
                  text={s.title}
                  className="ft-h2 mt-3 text-[clamp(1.7rem,3.2vw,2.6rem)]"
                />
                <Reveal delay={0.12}>
                  <p className="ft-lead mt-5 max-w-xl">{s.body}</p>
                </Reveal>
              </div>
              <Reveal delay={0.15} y={40}>
                <TiltCard max={3}>
                  <Shot
                    src={s.shot}
                    alt={s.title}
                    frame={s.shot.includes("popup") ? "phone" : "browser"}
                    className={s.shot.includes("popup") ? "mx-auto max-w-[320px]" : ""}
                  />
                </TiltCard>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* The loop */}
      <section className="hairline-t py-20 md:py-28">
        <div className="ft-container">
          <SectionHead
            eyebrow="The loop"
            title="Intend. Protect. Close. Review."
            lead="Each pass takes a day. The briefing connects them into weeks, the Monthly Review into months — attention becomes a practice, not a battle."
          />
          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Intend", "Watch Intent asks once — purpose + minutes."],
              ["Protect", "Layers remove the machinery of drift."],
              ["Close", "Rings fill; the day celebrates 3/3."],
              ["Review", "Tomorrow's briefing reads today back to you."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.1}>
                <div className="card-ft relative h-full p-6">
                  <span className="font-mono text-[0.72rem] text-iris">
                    0{i + 1}
                  </span>
                  <h3 className="mt-2 text-[1.02rem] font-semibold tracking-tight text-ink">
                    {t}
                  </h3>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-ink2">{d}</p>
                  {i < 3 && (
                    <span
                      className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ink3 lg:block"
                      aria-hidden
                    >
                      →
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </PageIn>
  );
}
