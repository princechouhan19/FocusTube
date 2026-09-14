"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  Download,
  GitBranch,
  Github,
  Heart,
  Mail,
  MessageSquare,
} from "lucide-react";
import { A, CodeBlock, EASE, PageIn, Reveal, SectionHead, WordReveal } from "../shared/kit";
import { REPO_URL } from "../shell/site";

/* ═══════════ DOWNLOAD ═══════════ */
export function DownloadPage() {
  const steps = [
    {
      n: "1",
      t: "Get the source",
      d: "Clone the repository, or download it as a ZIP from GitHub and unzip it. No build step — the repo is the extension.",
    },
    {
      n: "2",
      t: "Open Chrome's extension page",
      d: "Type chrome://extensions/ in the address bar and flip on Developer mode (top right).",
    },
    {
      n: "3",
      t: "Load unpacked",
      d: "Click “Load unpacked” and select the FocusTube folder — the one that contains manifest.json.",
    },
    {
      n: "4",
      t: "Meet your buddy",
      d: "Pin FocusTube to the toolbar. The first open walks you through setup: your name, an optional companion, and your first protections.",
    },
  ];

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-16 pt-36 md:pt-44">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-20%] h-[55vh] w-[85vw] -translate-x-1/2 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(closest-side, var(--iris), transparent 70%)" }}
        />
        <div className="ft-container flex flex-col items-center text-center">
          <Reveal>
            <span className="eyebrow">
              <Download size={13} /> Free · Open source
            </span>
          </Reveal>
          <WordReveal
            text="Your focused YouTube experience starts here."
            className="ft-display mt-6 max-w-4xl text-[clamp(2.2rem,5.6vw,4.4rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-7 max-w-2xl">
              FocusTube installs from source in about five minutes — no store
              review, no account, nothing updating behind your back. You can
              read every line it runs before you run it.
            </p>
          </Reveal>
          <Reveal delay={0.25} className="mt-9">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <Github size={17} />
              Open the repository
              <ArrowUpRight size={15} />
            </a>
          </Reveal>
        </div>
      </section>

      <section className="pb-20">
        <div className="ft-container max-w-4xl">
          <Reveal>
            <div className="card-ft p-7 md:p-9">
              <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ink3">
                Option A — clone with git
              </h2>
              <div className="mt-4">
                <CodeBlock lang="bash" code={"git clone https://github.com/princechouhan19/FocusTube.git"} />
              </div>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-ink2">
                Prefer a download? Use <strong className="text-ink">Code → Download ZIP</strong> on
                GitHub, then unzip it anywhere you keep tools.
              </p>
            </div>
          </Reveal>

          <div className="mt-14">
            <SectionHead
              eyebrow="Install"
              title="Four steps to protected."
              align="left"
              className="!max-w-none"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.08}>
                  <div className="card-ft flex h-full gap-5 p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-iris/40 bg-iris/10 font-mono text-[0.9rem] font-semibold text-iris">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="text-[1.02rem] font-semibold tracking-tight text-ink">
                        {s.t}
                      </h3>
                      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink2">
                        {s.d}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="mt-12 rounded-2xl border border-line bg-surface p-7">
              <h3 className="text-[1rem] font-semibold tracking-tight text-ink">
                Honest distribution note
              </h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink2">
                FocusTube is not on the Chrome Web Store — this site links only
                to the official repository. If you ever find FocusTube
                distributed anywhere else, treat it as unofficial: the source
                above is the single source of truth, and reading it before
                loading is the whole point of shipping this way.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Requirements", "Chrome on Manifest V3. Chromium browsers generally work; Brave needs one flag for file sync."],
              ["Updating", "git pull, then hit reload on the extension card. Your data survives untouched."],
              ["After install", "The setup assistant arms your first protections — Shorts gone, ads skipped, rings ready."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.07}>
                <div className="h-full rounded-2xl border border-line p-5">
                  <h4 className="text-[0.92rem] font-semibold text-ink">{t}</h4>
                  <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink2">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center">
              <p className="text-[1rem] font-medium text-ink">
                First session after installing? State your intent — it&apos;s
                the feature.
              </p>
              <A href="/how-it-works" className="btn btn-ghost">
                See how the loop works
                <ArrowUpRight size={15} />
              </A>
            </div>
          </Reveal>
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ CONTACT ═══════════ */
export function ContactPage() {
  const cards = [
    {
      icon: Bug,
      title: "Bug reports",
      body: "Something broke or a selector drifted? Open a GitHub issue with the page, the console output, and your extension version.",
      action: "Open an issue",
      href: `${REPO_URL}/issues`,
    },
    {
      icon: MessageSquare,
      title: "Ideas & feedback",
      body: "Feature ideas are triaged against the researched roadmap. The best ones argue mechanism → evidence → integration.",
      action: "Start a discussion",
      href: `${REPO_URL}/discussions`,
    },
    {
      icon: Mail,
      title: "Email",
      body: "For everything else — support@focustube.app. Please don't email security reports; use the channel below so they're tracked.",
      action: "support@focustube.app",
      href: "mailto:support@focustube.app",
    },
    {
      icon: Heart,
      title: "Security reports",
      body: "Found a vulnerability? Follow the policy in SECURITY.md — reports get a fast, public-when-responsible response.",
      action: "Read the security policy",
      href: "/security",
    },
  ];

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-14 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">Contact</span>
          </Reveal>
          <WordReveal
            text="Say hello. Help it improve."
            className="ft-display mt-5 text-[clamp(2.2rem,5.2vw,4rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-6 max-w-2xl">
              FocusTube is an open project, and every channel below is real.
              Bug reports and ideas land in the repository where they&apos;re
              public and permanent.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="pb-28">
        <div className="ft-container grid gap-4 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <a
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="card-ft group flex h-full flex-col p-7 transition-all duration-300 hover:-translate-y-1 hover:border-line2"
              >
                <c.icon size={20} className="text-iris" />
                <h2 className="mt-4 text-[1.15rem] font-semibold tracking-tight text-ink">
                  {c.title}
                </h2>
                <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-ink2">
                  {c.body}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[0.88rem] font-medium text-iris">
                  {c.action}
                  <ArrowUpRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ 404 ═══════════ */
export function NotFoundPage() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [scattered, setScattered] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setScattered(true), 900);
    return () => clearTimeout(id);
  }, []);

  const chips = [
    "Shorts", "Autoplay", "Recommended", "Ads", "Endless feed", "Rabbit hole",
  ];

  return (
    <PageIn>
      <section
        ref={ref}
        className="relative flex min-h-[86vh] items-center justify-center overflow-hidden px-6"
      >
        {/* scattering distraction chips */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {chips.map((c, i) => {
            const angle = (i / chips.length) * Math.PI * 2;
            const dist = 260 + (i % 3) * 70;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist * 0.7;
            return (
              <motion.span
                key={c}
                initial={reduce ? false : { opacity: 0, x: 0, y: 0, scale: 0.8 }}
                animate={
                  reduce
                    ? { opacity: 0.35 }
                    : scattered
                      ? {
                          opacity: [0, 0.7, 0.35],
                          x: [0, x * 0.2, x],
                          y: [0, y * 0.2, y],
                          scale: 1,
                        }
                      : { opacity: 0, x: 0, y: 0 }
                }
                transition={{ duration: reduce ? 0.4 : 1.4, delay: reduce ? 0 : 0.3 + i * 0.08, ease: EASE }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-line bg-surface/70 px-4 py-2 text-[0.8rem] text-ink3"
              >
                {c}
              </motion.span>
            );
          })}
        </div>

        <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="eyebrow"
          >
            404
          </motion.p>
          <WordReveal
            text="Looks like you got distracted."
            className="ft-display mt-5 text-[clamp(2.4rem,6.5vw,4.8rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-6 max-w-md">
              This page wandered off the path. Happens to the best of
              sessions — here&apos;s the way back.
            </p>
          </Reveal>
          <Reveal delay={0.25} className="mt-9">
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <A href="/" className="btn btn-primary">
                <ArrowLeft size={16} />
                Back to focus
              </A>
              <A href="/docs" className="btn btn-ghost">
                Open the docs
              </A>
            </div>
          </Reveal>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="mt-12 text-[0.84rem] text-ink3"
          >
            Future you says thanks.
          </motion.p>
        </div>
      </section>
    </PageIn>
  );
}
