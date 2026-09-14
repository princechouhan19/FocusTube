"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  Clock3,
  Link2,
  Search,
  X,
} from "lucide-react";
import { A, EASE, PageIn, Reveal, WordReveal } from "../shared/kit";
import { categories, posts } from "./data";

/* ═══════════ BLOG INDEX ═══════════ */
export function BlogIndex() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (p.title.toLowerCase().includes(q.toLowerCase()) ||
            p.excerpt.toLowerCase().includes(q.toLowerCase()))
      ),
    [cat, q]
  );
  const featured = filtered.find((p) => p.featured) ?? filtered[0];
  const rest = filtered.filter((p) => p !== featured);

  return (
    <PageIn>
      <section className="relative overflow-hidden pb-12 pt-36 md:pt-44">
        <div className="ft-container">
          <Reveal>
            <span className="eyebrow">The FocusTube journal</span>
          </Reveal>
          <WordReveal
            text="Notes on attention, engineering, and calm software."
            className="ft-display mt-5 max-w-4xl text-[clamp(2.2rem,5.4vw,4.2rem)]"
          />
          <Reveal delay={0.15}>
            <p className="ft-lead mt-6 max-w-2xl">
              Essays from the project&apos;s development: why the feed fights
              you, how the rings were designed, what MV3 resistance looks like,
              and the psychology behind every nudge.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    aria-pressed={cat === c}
                    className={`rounded-full border px-4 py-2 text-[0.84rem] font-medium transition-all duration-300 ${
                      cat === c
                        ? "border-transparent bg-ink text-paper"
                        : "border-line text-ink2 hover:border-line2 hover:text-ink"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <label className="relative ml-auto">
                <span className="sr-only">Search articles</span>
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink3" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="w-44 rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-[0.86rem] outline-none transition-colors placeholder:text-ink3 focus:border-line2"
                />
              </label>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="ft-container">
          {featured && (
            <Reveal>
              <A
                href={`/blog/${featured.slug}`}
                className="card-ft group grid overflow-hidden p-0 lg:grid-cols-2"
              >
                <div className="overflow-hidden">
                  { }
                  <img
                    src={featured.cover}
                    alt=""
                    className="h-full min-h-[260px] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col justify-center p-8 md:p-12">
                  <span
                    className="inline-flex w-fit items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em]"
                    style={{ background: "color-mix(in srgb, currentColor 10%, transparent)", color: featured.accent }}
                  >
                    {featured.category} · Featured
                  </span>
                  <h2 className="ft-h2 mt-5 text-[clamp(1.5rem,2.8vw,2.2rem)] transition-colors duration-300 group-hover:text-iris">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-ink2">
                    {featured.excerpt}
                  </p>
                  <p className="mt-6 flex items-center gap-4 text-[0.8rem] text-ink3">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} /> {featured.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={13} /> {featured.readingTime}
                    </span>
                  </p>
                </div>
              </A>
            </Reveal>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {rest.map((p, i) => (
                <motion.div
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.05, duration: 0.55, ease: EASE }}
                >
                  <A
                    href={`/blog/${p.slug}`}
                    className="card-ft group flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:border-line2"
                  >
                    <div className="overflow-hidden">
                      { }
                      <img
                        src={p.cover}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center justify-between text-[0.74rem]">
                        <span className="font-semibold uppercase tracking-[0.12em]" style={{ color: p.accent }}>
                          {p.category}
                        </span>
                        <span className="text-ink3">{p.readingTime}</span>
                      </div>
                      <h3 className="mt-3 text-[1.08rem] font-semibold leading-snug tracking-[-0.02em] text-ink transition-colors duration-300 group-hover:text-iris">
                        {p.title}
                      </h3>
                      <p className="mt-2.5 flex-1 text-[0.86rem] leading-relaxed text-ink2">
                        {p.excerpt.length > 120 ? p.excerpt.slice(0, 120) + "…" : p.excerpt}
                      </p>
                      <p className="mt-5 flex items-center justify-between text-[0.78rem] text-ink3">
                        {p.date}
                        <ArrowRight
                          size={14}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      </p>
                    </div>
                  </A>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filtered.length === 0 && (
            <p className="py-20 text-center text-ink3">
              No articles match. Try a different category or search term.
            </p>
          )}
        </div>
      </section>
    </PageIn>
  );
}

/* ═══════════ BLOG ARTICLE ═══════════ */
export function BlogArticle({ slug }: { slug: string }) {
  const idx = posts.findIndex((p) => p.slug === slug);
  const post = posts[idx];
  const [copied, setCopied] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  if (!post) {
    return (
      <PageIn>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="ft-h2 text-4xl">Article not found</h1>
          <A href="/blog" className="btn btn-primary mt-8">
            Back to the journal
          </A>
        </div>
      </PageIn>
    );
  }

  const related = posts.filter(
    (p) => post.related.includes(p.slug) || (p.category === post.category && p.slug !== post.slug)
  ).slice(0, 2);

  return (
    <PageIn>
      {/* Reading progress */}
      <motion.div
        style={{ scaleX: progress, transformOrigin: "left" }}
        className="fixed inset-x-0 top-0 z-[55] h-[2.5px] bg-gradient-to-r from-iris2 to-iris"
        aria-hidden
      />

      <article className="pb-24 pt-32 md:pt-40">
        <header className="ft-container max-w-3xl">
          <Reveal>
            <A
              href="/blog"
              className="inline-flex items-center gap-2 text-[0.84rem] text-ink3 transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} /> All articles
            </A>
          </Reveal>
          <Reveal delay={0.05}>
            <span
              className="mt-7 inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em]"
              style={{ color: post.accent, background: "color-mix(in srgb, currentColor 10%, transparent)" }}
            >
              {post.category}
            </span>
          </Reveal>
          <WordReveal
            text={post.title}
            as="h1"
            className="ft-display mt-5 text-[clamp(2rem,4.8vw,3.6rem)]"
          />
          <Reveal delay={0.15}>
            <div className="mt-7 flex flex-wrap items-center gap-5 border-b border-line pb-8 text-[0.84rem] text-ink3">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {post.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 size={14} /> {post.readingTime} read
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${location.origin}/blog/${post.slug}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-ink2 transition-colors hover:border-line2 hover:text-ink"
              >
                {copied ? <Check size={13} className="text-focused" /> : <Link2 size={13} />}
                {copied ? "Link copied" : "Share"}
              </button>
            </div>
          </Reveal>
        </header>

        <Reveal delay={0.1} className="ft-container mt-10 max-w-4xl">
          { }
          <img
            src={post.cover}
            alt=""
            className="w-full rounded-3xl border border-line"
            fetchPriority="high"
          />
        </Reveal>

        <div className="ft-container mt-14 grid gap-12 lg:grid-cols-[1fr_200px]">
          <Reveal delay={0.12} className="max-w-3xl">
            <p className="text-[1.12rem] font-medium leading-relaxed text-ink">
              {post.excerpt}
            </p>
            <div className="prose-ft mt-8">
              {post.sections.map((s, i) => (
                <section key={i} id={`s-${i}`}>
                  <h3>{s.heading}</h3>
                  {s.paragraphs.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </section>
              ))}
            </div>
          </Reveal>
          <aside className="hidden lg:block" aria-label="Table of contents">
            <div className="sticky top-28">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ink3">
                In this article
              </p>
              <ul className="mt-3 space-y-2 border-l border-line pl-4">
                {post.sections.map((s, i) => (
                  <li key={i}>
                    <a
                      href={`#s-${i}`}
                      className="text-[0.8rem] leading-snug text-ink2 transition-colors hover:text-iris"
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="ft-container mt-20 max-w-5xl">
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-ink3">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {related.map((r) => (
                <A
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="card-ft group flex items-center gap-5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line2"
                >
                  { }
                  <img
                    src={r.cover}
                    alt=""
                    loading="lazy"
                    className="h-20 w-28 shrink-0 rounded-xl object-cover object-top"
                  />
                  <div className="min-w-0">
                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em]" style={{ color: r.accent }}>
                      {r.category}
                    </span>
                    <h3 className="mt-1.5 line-clamp-2 text-[0.98rem] font-semibold leading-snug tracking-tight text-ink group-hover:text-iris">
                      {r.title}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1 text-[0.78rem] text-ink3">
                      Read <ArrowUpRight size={12} />
                    </span>
                  </div>
                </A>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageIn>
  );
}
