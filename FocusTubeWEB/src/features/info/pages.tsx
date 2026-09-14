"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  CircleSlash,
  Code,
  ExternalLink,
  GraduationCap,
  Github,
  Instagram,
  Linkedin,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { A, EASE, PageIn, Reveal, SectionHead, WordReveal } from "../shared/kit";
import { changelog, faqs } from "./data";
import { REPO_URL } from "../shell/site";
import { FinalCTA } from "../home/sections";

/* ═══════════ ABOUT ═══════════ */
export function AboutPage() {
  return (
    <PageIn>
      <section className="relative overflow-hidden pb-16 pt-36 md:pt-44">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-25%] h-[55vh] w-[85vw] -translate-x-1/2 rounded-full opacity-[0.1]"
          style={{ background: "radial-gradient(closest-side, var(--iris), transparent 70%)" }}
        />
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">About</span>
          </Reveal>
          <WordReveal
            text="FocusTube is not another browser extension."
            className="ft-display mt-5 max-w-4xl text-[clamp(2.3rem,5.8vw,4.6rem)]"
          />
          <WordReveal
            text="It is a calmer way to use YouTube."
            className="ft-display mt-2 max-w-4xl bg-gradient-to-r from-iris2 to-iris bg-clip-text text-[clamp(2.3rem,5.8vw,4.6rem)] text-transparent"
          />
          <Reveal delay={0.2}>
            <p className="ft-lead mt-8 max-w-2xl">
              The project began with an uncomfortable observation: the most
              valuable learning resource ever built ships inside the most
              effective distraction machine ever designed. FocusTube exists to
              separate the two — without guilt, without accounts, and without
              asking anyone to leave the library.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="ft-container grid gap-14 lg:grid-cols-2">
          {[
            {
              h: "Product philosophy",
              p: [
                "Protection should be layered, never all-or-nothing. A tool that demands total abstinence fails the person who needs ten minutes of tutorial — so FocusTube lets you subtract exactly as much noise as your day requires, and no more.",
                "Every intervention teaches instead of scolds. Timers show their countdown, blocks explain themselves, unblock friction asks for a reason rather than a password. The product treats you as an adult negotiating with your own habits.",
              ],
            },
            {
              h: "Design philosophy",
              p: [
                "The product ships one design language — Graphite & Iris — across every surface: popup, dashboard, overlays, block page, onboarding. Warm graphite, a single iris accent, hairline borders, spring easing. Restraint is the aesthetic; nothing glows, nothing begs.",
                "Motion celebrates only what's earned. Rings close with a quiet spark, once per day, and every animation honors prefers-reduced-motion. Calm software shouldn't fight the operating system's accessibility settings to feel alive.",
              ],
            },
            {
              h: "Privacy philosophy",
              p: [
                "Local-first is an architecture, not a policy. There is no server to betray you because there is no server. History lives in chrome.storage.local; sync writes plain JSON to a folder you own; AI summaries talk straight from your browser to your provider.",
                "The extension ships as readable source. Every permission is listed with its reason, every data flow is inspectable, and SECURITY.md documents both the wins and the honest limitations.",
              ],
            },
            {
              h: "How it's built",
              p: [
                "FocusTube is a hardened Manifest V3 extension: one service worker for timers and sync, focused content scripts per concern, and a single storage layer as the source of truth. Modules stay small; docs live beside code.",
                "It's under active, honest development — v1.17 shipped the researched wave of companions, intent and streak insurance, and the roadmap is public. Selector drift on YouTube is named as the main maintenance cost, not hidden.",
              ],
            },
          ].map((b, i) => (
            <Reveal key={b.h} delay={i * 0.06}>
              <div className="card-ft h-full p-8 md:p-10">
                <h2 className="ft-h2 text-[1.5rem]">{b.h}</h2>
                {b.p.map((para, j) => (
                  <p key={j} className="mt-4 text-[0.95rem] leading-relaxed text-ink2">
                    {para}
                  </p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Evolution timeline */}
      <section className="hairline-t py-20 md:py-28">
        <div className="ft-container">
          <SectionHead
            eyebrow="Evolution"
            title="From blocker to practice."
            lead="Each release added a layer: first the interface cleanup, then the systems, then the research."
          />
          <div className="mx-auto mt-14 max-w-3xl">
            {[
              ["1.0", "April 2026", "The cleanup — ads, Shorts, autoplay, comments. YouTube, minus the machine."],
              ["1.1 – 1.2", "Spring 2026", "The generalization — universal site blocking, Smart Lists, the first design system, Focus Score and heatmap."],
              ["1.7 – 1.8", "August 2026", "The systems — cross-browser file sync, timezone-accurate history, and the Graphite & Iris redesign."],
              ["1.17", "Now", "The research — companions, Watch Intent, streak insurance, adaptive goals, Sleep Guard, graduated friction."],
            ].map(([v, d, t], i) => (
              <Reveal key={v} delay={i * 0.08}>
                <div className="relative grid gap-2 border-l border-line py-6 pl-8 md:grid-cols-[130px_1fr] md:gap-6">
                  <span
                    className="absolute -left-[5px] top-9 h-2.5 w-2.5 rounded-full"
                    style={{ background: i === 3 ? "var(--iris)" : "var(--line-strong)" }}
                    aria-hidden
                  />
                  <div>
                    <span className="font-mono text-[0.9rem] font-semibold text-ink">v{v}</span>
                    <span className="block text-[0.78rem] text-ink3">{d}</span>
                  </div>
                  <p className="text-[0.95rem] leading-relaxed text-ink2">{t}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      {/* The Maker */}
      <section className="hairline-t py-20 md:py-28">
        <div className="ft-container">
          <SectionHead
            eyebrow="The Maker"
            title="Built by one person, for everyone."
            lead="Meet the developer behind FocusTube."
          />
          <div className="mx-auto mt-14 max-w-4xl">
            <Reveal>
              <div className="card-ft overflow-hidden">
                {/* Header band */}
                <div
                  className="relative h-32 md:h-40"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--iris) 0%, var(--iris2) 60%, var(--ring-focused) 100%)",
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                      backgroundSize: "60px 60px",
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative px-8 pb-10 md:px-12 md:pb-12">
                  {/* Avatar */}
                  <div className="-mt-14 mb-6 flex items-end gap-5 md:-mt-16">
                    <img
                      src="/About/Profile.jpeg"
                      alt="Prince Chouhan"
                      className="h-28 w-28 shrink-0 rounded-2xl border-4 border-paper object-cover shadow-lg md:h-32 md:w-32"
                    />
                  </div>

                  {/* Name & tagline */}
                  <h2 className="ft-h2 text-[clamp(1.7rem,3.5vw,2.4rem)]">
                    Prince Chouhan
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-iris">
                      <Sparkles size={14} /> AI Enthusiast
                    </span>
                    <span className="text-ink3">·</span>
                    <span className="inline-flex items-center gap-1.5 text-[0.9rem] text-ink2">
                      <GraduationCap size={14} /> B.Tech CSE · 3rd Year
                    </span>
                  </div>
                  <p className="mt-1.5 text-[0.92rem] italic text-ink3">
                    I got tired of losing hours to YouTube. So I built the tool I
                    wished existed.
                  </p>

                  {/* Story */}
                  <div className="mt-8 space-y-4">
                    <p className="text-[0.95rem] leading-relaxed text-ink2">
                      FocusTube didn&apos;t start as a class assignment or a portfolio
                      piece — it started because I was the problem. I&apos;d sit down
                      to watch one tutorial and surface two hours later, deep in a
                      rabbit hole I never chose. I knew the algorithm was designed
                      to do exactly that, and I wanted a way to fight back without
                      leaving the platform entirely.
                    </p>
                    <p className="text-[0.95rem] leading-relaxed text-ink2">
                      So I built the tool I wished someone had handed me: layered
                      blocking, watch-intent prompts, focus rings, honest
                      analytics — all running 100% on your device. No server, no
                      account, no telemetry. AI&nbsp;summaries go straight from your
                      browser to the provider you choose, and the entire codebase
                      is open-source and auditable end-to-end. You never have to
                      trust me — you can read every line it runs.
                    </p>
                    <p className="text-[0.95rem] leading-relaxed text-ink2">
                      If this problem is yours too — if you&apos;re a student losing
                      study hours, a developer stuck in the feed, or just someone
                      who wants YouTube on your terms — FocusTube is free, the
                      source is public, and contributions, forks and feedback are
                      all very welcome.
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: Code,
                        label: "Open source",
                        detail: "Fully auditable, MIT-style",
                      },
                      {
                        icon: ShieldCheck,
                        label: "Privacy-first",
                        detail: "No server, no telemetry",
                      },
                      {
                        icon: GraduationCap,
                        label: "Born from struggle",
                        detail: "Built to solve my own problem",
                      },
                    ].map((h) => (
                      <div
                        key={h.label}
                        className="flex items-start gap-3 rounded-xl border border-line bg-surface/60 px-4 py-3.5"
                      >
                        <h.icon
                          size={17}
                          className="mt-0.5 shrink-0 text-iris"
                        />
                        <div>
                          <span className="text-[0.88rem] font-semibold text-ink">
                            {h.label}
                          </span>
                          <span className="block text-[0.78rem] text-ink3">
                            {h.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Social links */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    {[
                      {
                        icon: Linkedin,
                        label: "LinkedIn",
                        href: "https://www.linkedin.com/in/prince-chouhan06/",
                      },
                      {
                        icon: Github,
                        label: "GitHub",
                        href: "https://github.com/princechouhan19",
                      },
                      {
                        icon: Instagram,
                        label: "Instagram",
                        href: "https://www.instagram.com/princechouhan06/",
                      },
                    ].map((s) => (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-4 py-2.5 text-[0.88rem] font-medium text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-iris/40 hover:text-iris"
                      >
                        <s.icon size={16} />
                        {s.label}
                        <ExternalLink size={12} className="text-ink3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
      <FinalCTA />
    </PageIn>
  );
}

/* ═══════════ CHANGELOG ═══════════ */
const kindColor: Record<string, string> = {
  New: "var(--ring-focused)",
  Fixed: "var(--ring-saved)",
  Security: "var(--ring-deflected)",
  Privacy: "var(--iris)",
  Redesigned: "var(--iris)",
};

export function ChangelogPage() {
  return (
    <PageIn>
      <section className="relative overflow-hidden pb-14 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">Changelog</span>
          </Reveal>
          <WordReveal
            text="Every release, in plain language."
            className="ft-display mt-5 max-w-3xl text-[clamp(2.2rem,5.2vw,4rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-6 max-w-2xl">
              From the first cleanup to the researched wave — what changed,
              what broke, and what got fixed, taken from the project&apos;s own
              release notes.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-28">
        <div className="ft-container max-w-3xl">
          {changelog.map((entry, i) => (
            <Reveal key={entry.version} delay={Math.min(i * 0.04, 0.2)}>
              <div className="relative border-l border-line pb-16 pl-8 last:pb-0 md:pl-12">
                <span
                  className={`absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-2xl border-2 ${
                    i === 0 ? "border-iris bg-iris" : "border-line2 bg-paper"
                  }`}
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="font-mono text-[1.35rem] font-semibold tracking-tight text-ink">
                    v{entry.version}
                  </h2>
                  <span className="text-[0.84rem] text-ink3">{entry.date}</span>
                  {entry.tag && (
                    <span className="rounded-full border border-iris/40 bg-iris/10 px-2.5 py-0.5 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-iris">
                      {entry.tag}
                    </span>
                  )}
                </div>
                {entry.groups.map((g) => (
                  <div key={g.kind} className="mt-7">
                    <span
                      className="inline-flex items-center gap-2 text-[0.74rem] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: kindColor[g.kind] ?? "var(--fg-2)" }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: kindColor[g.kind] ?? "var(--fg-2)" }} />
                      {g.kind}
                    </span>
                    <div className="mt-4 space-y-5">
                      {g.items.map((it) => (
                        <div key={it.title} className="card-ft p-5">
                          <h3 className="text-[0.98rem] font-semibold tracking-tight text-ink">
                            {it.title}
                          </h3>
                          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink2">
                            {it.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
          <Reveal>
            <a
              href={`${REPO_URL}/blob/main/IMPROVEMENTS.md`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[0.9rem] font-medium text-iris hover:text-iris2"
            >
              Read the full engineering notes on GitHub <ExternalLink size={14} />
            </a>
          </Reveal>
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ SECURITY ═══════════ */
export function SecurityPage() {
  const dos = [
    "Computes your Focus Score, rings and analytics on-device",
    "Reads public page DOM on sites you browse (required for blocking)",
    "Stores history and settings in chrome.storage.local on your machine",
    "Writes plain JSON archives only to a folder you explicitly pick",
    "Sends AI summary requests straight from your browser to your chosen provider, using your key",
    "Validates every internal message payload before handling it",
  ];
  const donts = [
    "Operates any server, account, or telemetry pipeline — there is nothing to send data to",
    "Reads your private Google/YouTube account data — no account scopes are requested",
    "Includes API keys, passwords or emails in sync or export files — explicitly excluded",
    "Logs your API keys — they are redacted from all log output",
    "Phones home on install, update, or uninstall — there is no endpoint",
    "Shares anything with third parties — there is no one to share with",
  ];

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-14 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">Security &amp; privacy</span>
          </Reveal>
          <WordReveal
            text="A tool that touches your browsing should earn the benefit of the doubt."
            className="ft-display mt-5 max-w-4xl text-[clamp(2.1rem,5vw,3.9rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-7 max-w-2xl">
              FocusTube interacts with how you browse, so it holds itself to a
              published standard. This page summarizes the repository&apos;s
              SECURITY.md — the threat model, the hardening history, and the
              honest limitations. No unverifiable claims.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Does / doesn't */}
      <section className="py-14 md:py-20">
        <div className="ft-container grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="card-ft h-full p-8">
              <h2 className="flex items-center gap-3 text-[1.2rem] font-semibold tracking-tight text-ink">
                <ShieldCheck size={19} className="text-focused" /> What FocusTube does
              </h2>
              <ul className="mt-6 space-y-3.5">
                {dos.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-[0.9rem] leading-relaxed text-ink2">
                    <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-focused" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="card-ft h-full p-8">
              <h2 className="flex items-center gap-3 text-[1.2rem] font-semibold tracking-tight text-ink">
                <CircleSlash size={19} className="text-deflected" /> What it deliberately doesn&apos;t
              </h2>
              <ul className="mt-6 space-y-3.5">
                {donts.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-[0.9rem] leading-relaxed text-ink2">
                    <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-deflected" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Permissions */}
      <section className="hairline-t py-16 md:py-24">
        <div className="ft-container">
          <SectionHead
            eyebrow="Transparency"
            title="Every permission, with its reason."
            lead="Requested in manifest.json, verbatim. If a permission loses its justification, it loses its place in the manifest."
          />
          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-line">
            {[
              "storage",
              "tabs",
              "scripting",
              "activeTab",
              "tabGroups",
              "notifications",
              "declarativeNetRequest",
              "idle",
              "alarms",
            ].map((name, i) => {
              const why = [
                "All settings, history and ring data live in chrome.storage.local on your device.",
                "Time tracking, tab manager workspaces and applying blocks to the right tab.",
                "Injecting the blocking and UI logic into pages you visit.",
                "Acting on the page you're on when you invoke the popup.",
                "Tab Manager workspaces and grouping.",
                "Local reminders — wind-down briefing, session ends. No remote pushes.",
                "Blocking ad/tracking network requests efficiently, without reading page data.",
                "Auto-pause on inactivity — stop counting time when you've stepped away.",
                "Scheduled blocks, sync ticks and archive rotation.",
              ][i];
              return (
                <Reveal key={name} delay={i * 0.03}>
                  <div className={`grid gap-1 px-6 py-4 sm:grid-cols-[220px_1fr] sm:gap-6 ${i > 0 ? "border-t border-line" : ""} ${i % 2 ? "bg-surface/50" : "bg-surface"}`}>
                    <code className="font-mono text-[0.84rem] font-medium text-iris">{name}</code>
                    <span className="text-[0.86rem] leading-relaxed text-ink2">{why}</span>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Threat model + hardening */}
      <section className="hairline-t py-16 md:py-24">
        <div className="ft-container grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <span className="eyebrow">Threat model</span>
            </Reveal>
            <h2 className="ft-h2 mt-4 text-[clamp(1.6rem,3vw,2.3rem)]">
              Where the trust boundaries are.
            </h2>
            <Reveal delay={0.1}>
              <p className="mt-5 text-[0.95rem] leading-relaxed text-ink2">
                SECURITY.md names three: the pages FocusTube runs on (hostile by
                assumption), the messages passed between popup, worker and
                content scripts (validated at every boundary), and anything that
                ever renders as HTML (escaped, always). The AI pipeline is
                treated as untrusted input too — provider output is HTML-escaped
                before it ever touches the page.
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-6 rounded-2xl border border-deflected/25 bg-deflected/[0.06] p-5">
                <p className="flex items-start gap-3 text-[0.88rem] leading-relaxed text-ink2">
                  <TriangleAlert size={17} className="mt-0.5 shrink-0 text-deflected" />
                  <span>
                    <strong className="text-ink">Known limitation, stated honestly:</strong>{" "}
                    FocusTube reads public page DOM by design and cannot protect
                    anything outside the browser. Selector drift on YouTube is
                    the main maintenance cost and is tracked openly.
                  </span>
                </p>
              </div>
            </Reveal>
          </div>
          <div>
            <Reveal>
              <span className="eyebrow">Hardening history</span>
            </Reveal>
            <h2 className="ft-h2 mt-4 text-[clamp(1.6rem,3vw,2.3rem)]">
              Fixed, documented, kept fixed.
            </h2>
            <ul className="mt-5 space-y-2.5">
              {[
                "XSS via AI summary content — HTML-escaped (v1.0.1, HIGH)",
                "XSS via stored domains, avatars and keyword overlays — DOM APIs instead of HTML strings",
                "Message payloads — validated before any handler runs",
                "API keys — redacted from every log path",
                "web_accessible_resources — tightened to the minimum surface",
                "Overlay re-creation and listener duplication — stability passes with tests-by-hand documented",
              ].map((h, i) => (
                <Reveal key={h} delay={0.05 + i * 0.05}>
                  <li className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[0.87rem] text-ink2">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-focused" />
                    {h}
                  </li>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.3}>
              <p className="mt-6 text-[0.88rem] leading-relaxed text-ink2">
                Found something? Report it. The policy asks for details by
                GitHub issue or the contacts on this site — and fixes have
                historically shipped in days, with credit.
              </p>
              <A
                href={`${REPO_URL}/blob/main/SECURITY.md`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-[0.9rem] font-medium text-iris hover:text-iris2"
              >
                Read the full SECURITY.md <ExternalLink size={14} />
              </A>
            </Reveal>
          </div>
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ FAQ ═══════════ */
export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const filtered = faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q.toLowerCase()) ||
        f.a.toLowerCase().includes(q.toLowerCase())
    );
    const map = new Map<string, typeof faqs>();
    for (const f of filtered) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return Array.from(map.entries());
  }, [q]);

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">FAQ</span>
          </Reveal>
          <WordReveal
            text="Asked, answered, sourced."
            className="ft-display mt-5 text-[clamp(2.2rem,5.2vw,4rem)]"
          />
          <Reveal delay={0.12}>
            <p className="ft-lead mt-6 max-w-2xl">
              Real questions about installing, data, blocking behavior and the
              companions — answered from how the product actually works.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <label className="relative mt-8 block max-w-md">
              <span className="sr-only">Search FAQ</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search questions…"
                className="w-full rounded-2xl border border-line bg-surface px-5 py-3.5 text-[0.95rem] outline-none transition-colors placeholder:text-ink3 focus:border-line2"
              />
            </label>
          </Reveal>
        </div>
      </section>

      <section className="pb-28">
        <div className="ft-container max-w-3xl space-y-12">
          {groups.map(([group, items]) => (
            <div key={group}>
              <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ink3">
                {group}
              </h2>
              <div className="mt-4 space-y-3">
                {items.map((f) => {
                  const globalIdx = faqs.indexOf(f);
                  const isOpen = open === globalIdx;
                  return (
                    <div
                      key={f.q}
                      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                        isOpen ? "border-line2 bg-surface" : "border-line bg-surface/60"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : globalIdx)}
                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                      >
                        <span className="text-[1rem] font-medium tracking-tight text-ink">
                          {f.q}
                        </span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="shrink-0 text-ink3"
                        >
                          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                          >
                            <p className="px-6 pb-6 text-[0.92rem] leading-relaxed text-ink2">
                              {f.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="py-16 text-center text-ink3">
              No questions match “{q}”. Try “data” or “install”.
            </p>
          )}
          <Reveal>
            <div className="card-ft flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[1.05rem] font-semibold tracking-tight text-ink">
                  Still curious?
                </h2>
                <p className="mt-1 text-[0.88rem] text-ink2">
                  The documentation covers installation, architecture, API and
                  security in depth.
                </p>
              </div>
              <A href="/docs" className="btn btn-ghost shrink-0">
                Open the docs
              </A>
            </div>
          </Reveal>
        </div>
      </section>
    </PageIn>
  );
}
