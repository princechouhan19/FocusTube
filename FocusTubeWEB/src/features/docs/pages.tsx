"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  FileText,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { A, CodeBlock, EASE, PageIn, Reveal, WordReveal } from "../shared/kit";
import { docGroups, docSections } from "./data";
import { REPO_URL, VERSION } from "../shell/site";

/* ═══════════ DOCS HUB ═══════════ */
export function DocsHub() {
  const [q, setQ] = useState("");
  const filtered = docSections.filter(
    (s) =>
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      s.description.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-14 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">Documentation</span>
          </Reveal>
          <WordReveal
            text="Everything about FocusTube, in the open."
            className="ft-display mt-5 max-w-3xl text-[clamp(2.2rem,5.4vw,4.2rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-6 max-w-2xl">
              Built from the project&apos;s own documentation — quick start,
              architecture, API, security and the rest. The same docs that ship
              in the repository, given a reading room.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <label className="relative mt-9 block max-w-md">
              <span className="sr-only">Search documentation</span>
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink3"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the docs…"
                className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-11 pr-10 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink3 focus:border-line2"
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
                >
                  <X size={15} />
                </button>
              )}
            </label>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="ft-container space-y-14">
          {docGroups.map((group) => {
            const sections = filtered.filter((s) => s.group === group);
            if (!sections.length) return null;
            return (
              <div key={group}>
                <Reveal>
                  <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ink3">
                    {group}
                  </h2>
                </Reveal>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sections.map((s, i) => (
                    <Reveal key={s.slug} delay={i * 0.06}>
                      <A
                        href={`/docs/${s.slug}`}
                        className="card-ft group flex h-full flex-col p-6 transition-all duration-300 hover:border-line2 hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <FileText size={17} className="text-iris" />
                          <span className="font-mono text-[0.7rem] text-ink3">
                            {s.updated}
                          </span>
                        </div>
                        <h3 className="mt-4 text-[1.05rem] font-semibold tracking-tight text-ink">
                          {s.title}
                        </h3>
                        <p className="mt-2 flex-1 text-[0.86rem] leading-relaxed text-ink2">
                          {s.description}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[0.83rem] font-medium text-iris opacity-0 transition-all duration-300 group-hover:opacity-100">
                          Read section <ArrowRight size={13} />
                        </span>
                      </A>
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-16 text-center text-ink3">
              Nothing matches “{q}”. Try “installation” or “security”.
            </p>
          )}
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ CONCISE DOCS FOOTER ═══════════
   Docs pages read better without the full site footer —
   this is the quiet, single-row alternative. */
export function DocsFooter() {
  return (
    <footer className="hairline-t mt-auto">
      <div className="ft-container flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/icon128.png?v=2"
            alt=""
            width={22}
            height={22}
            className="rounded-[6px]"
          />
          <span className="text-[0.88rem] font-semibold tracking-tight text-ink">
            FocusTube Docs
          </span>
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[0.68rem] text-ink3">
            v{VERSION}
          </span>
        </div>
        <nav
          aria-label="Documentation footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8rem] text-ink2"
        >
          <A href="/docs" className="transition-colors hover:text-ink">
            All documentation
          </A>
          <A href="/security" className="transition-colors hover:text-ink">
            Security
          </A>
          <A href="/faq" className="transition-colors hover:text-ink">
            FAQ
          </A>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-ink"
          >
            GitHub <ArrowUpRight size={12} />
          </a>
        </nav>
      </div>
    </footer>
  );
}

/* ═══════════ DOC ARTICLE ═══════════ */
export function DocArticle({ slug }: { slug: string }) {
  const router = useRouter();
  const idx = docSections.findIndex((s) => s.slug === slug);
  const section = docSections[idx];
  const [activeHeading, setActiveHeading] = useState<number | null>(null);

  /* Scroll-spy: highlight the TOC entry of the section in view */
  useEffect(() => {
    if (!section) return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("#doc-article section[id^='h-']")
    );
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const n = Number(e.target.id.slice(2));
            if (!Number.isNaN(n)) setActiveHeading(n);
          }
        }
      },
      { rootMargin: "-12% 0px -72% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [section]);

  /* In-page jump that never touches location.hash (the hash drives the router) */
  const jump = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    document
      .getElementById(`h-${i}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!section) {
    return (
      <PageIn>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="ft-h2 text-4xl">Section not found</h1>
          <p className="mt-4 text-ink2">
            The documentation section you requested doesn&apos;t exist.
          </p>
          <A href="/docs" className="btn btn-primary mt-8">
            Back to documentation
          </A>
        </div>
      </PageIn>
    );
  }

  /* Stable TOC data: body index paired with heading text */
  const toc = section.body
    .map((b, i) => ({ heading: b.heading, index: i }))
    .filter((t): t is { heading: string; index: number } => Boolean(t.heading));
  const prev = docSections[idx - 1];
  const next = docSections[idx + 1];

  return (
    <PageIn>
      <div className="ft-container grid gap-10 pb-16 pt-32 md:pt-36 lg:grid-cols-[250px_minmax(0,1fr)_190px]">
        {/* Sidebar — pinned below the navbar; only scrolls internally if ever needed */}
        <aside className="hidden lg:block" aria-label="Documentation navigation">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col">
            <A
              href="/docs"
              className="inline-flex items-center gap-2 pb-4 text-[0.82rem] text-ink3 transition-colors hover:text-ink"
            >
              <ArrowLeft size={13} /> All documentation
            </A>
            <nav
              className="-mx-3 flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Documentation sections"
            >
              {docGroups.map((g) => (
                <div key={g}>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink3">
                    {g}
                  </p>
                  <ul className="mt-1.5 space-y-px">
                    {docSections
                      .filter((s) => s.group === g)
                      .map((s) => (
                        <li key={s.slug}>
                          <A
                            href={`/docs/${s.slug}`}
                            aria-current={s.slug === slug ? "page" : undefined}
                            className={`relative block rounded-lg px-3 py-[7px] text-[0.84rem] leading-snug transition-colors duration-200 ${
                              s.slug === slug
                                ? "bg-iris/[0.08] font-medium text-iris"
                                : "text-ink2 hover:bg-surface hover:text-ink"
                            }`}
                          >
                            {s.slug === slug && (
                              <span
                                className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-iris"
                                aria-hidden
                              />
                            )}
                            {s.title}
                          </A>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Article */}
        <motion.article
          key={slug}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="min-w-0 max-w-[46rem]"
          id="doc-article"
        >
          {/* Mobile section picker — replaces the sidebar on small screens */}
          <div className="lg:hidden">
            <label className="relative block">
              <span className="sr-only">Documentation section</span>
              <select
                value={slug}
                onChange={(e) => {
                  router.push(`/docs/${e.target.value}`);
                }}
                className="w-full appearance-none rounded-xl border border-line bg-surface px-4 py-3 pr-10 text-[0.9rem] text-ink outline-none transition-colors focus:border-line2"
              >
                {docGroups.map((g) => (
                  <optgroup key={g} label={g}>
                    {docSections
                      .filter((s) => s.group === g)
                      .map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronRight
                size={15}
                aria-hidden
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-ink3"
              />
            </label>
          </div>

          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="mt-6 flex items-center gap-1.5 text-[0.8rem] text-ink3 lg:mt-0"
          >
            <A href="/docs" className="hover:text-ink">Docs</A>
            <ChevronRight size={12} aria-hidden />
            <span>{section.group}</span>
            <ChevronRight size={12} aria-hidden />
            <span className="text-ink2">{section.title}</span>
          </nav>

          <h1 className="ft-h2 mt-5 text-[clamp(1.9rem,4vw,2.85rem)] text-ink">
            {section.title}
          </h1>
          <p className="mt-3 text-[1.02rem] leading-relaxed text-ink2">
            {section.description}
          </p>
          <p className="mt-2 font-mono text-[0.74rem] uppercase tracking-[0.12em] text-ink3">
            Source · {section.updated}
          </p>

          <div className="prose-ft mt-9">
            {section.body.map((b, i) => (
              <section
                key={i}
                id={b.heading ? `h-${i}` : undefined}
                className="scroll-mt-28"
              >
                {b.heading && <h3>{b.heading}</h3>}
                {b.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
                {b.list && (
                  <ul>
                    {b.list.map((li, j) => (
                      <li key={j}>{li}</li>
                    ))}
                  </ul>
                )}
                {b.code && <CodeBlock code={b.code.content} lang={b.code.lang} />}
              </section>
            ))}
          </div>

          {/* Prev / next */}
          <nav
            aria-label="Documentation pages"
            className="mt-16 grid gap-3 border-t border-line pt-8 sm:grid-cols-2"
          >
            {prev ? (
              <A
                href={`/docs/${prev.slug}`}
                className="card-ft group p-5 transition-colors hover:border-line2"
              >
                <span className="flex items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.12em] text-ink3">
                  <ArrowLeft size={12} /> Previous
                </span>
                <span className="mt-2 block font-medium text-ink group-hover:text-iris">
                  {prev.title}
                </span>
              </A>
            ) : (
              <span />
            )}
            {next && (
              <A
                href={`/docs/${next.slug}`}
                className="card-ft group p-5 text-right transition-colors hover:border-line2"
              >
                <span className="flex items-center justify-end gap-1.5 text-[0.75rem] uppercase tracking-[0.12em] text-ink3">
                  Next <ArrowRight size={12} />
                </span>
                <span className="mt-2 block font-medium text-ink group-hover:text-iris">
                  {next.title}
                </span>
              </A>
            )}
          </nav>
        </motion.article>

        {/* TOC — pinned; active entry follows the reading position */}
        <aside className="hidden lg:block" aria-label="Table of contents">
          <div className="sticky top-24">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink3">
              On this page
            </p>
            <ul className="mt-3 space-y-1 border-l border-line pl-4">
              {toc.map((t) => (
                <li key={t.index}>
                  <a
                    href={`#h-${t.index}`}
                    onClick={jump(t.index)}
                    aria-current={activeHeading === t.index ? "true" : undefined}
                    className={`block text-[0.8rem] leading-snug transition-colors duration-200 ${
                      activeHeading === t.index
                        ? "text-iris"
                        : "text-ink2 hover:text-ink"
                    }`}
                  >
                    {t.heading}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={`${REPO_URL}/tree/main/docs`}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-block text-[0.78rem] text-ink3 underline underline-offset-4 hover:text-ink"
            >
              View source on GitHub
            </a>
          </div>
        </aside>
      </div>
    </PageIn>
  );
}
