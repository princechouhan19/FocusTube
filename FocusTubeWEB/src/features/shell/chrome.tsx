"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Download, Moon, Sun, X } from "lucide-react";
import { nav, footerGroups, REPO_URL, VERSION } from "./site";
import { A, EASE, Magnetic } from "../shared/kit";

/* ── Theme as an external store (no setState-in-effect) ── */
const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => themeListeners.delete(cb);
}
function getThemeSnapshot() {
  return document.documentElement.classList.contains("light");
}
function getServerTheme() {
  return false;
}

function useTheme() {
  const light = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerTheme);
  const toggle = () => {
    const el = document.documentElement;
    const next = !el.classList.contains("light");
    el.classList.toggle("light", next);
    el.classList.toggle("dark", !next);
    try {
      localStorage.setItem("ft-theme", next ? "light" : "dark");
    } catch {}
    themeListeners.forEach((l) => l());
  };
  return { light, toggle };
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/brand/icon128.png?v=2"
        alt=""
        width={size}
        height={size}
        className="rounded-[8px]"
        style={{ width: size, height: size }}
        draggable={false}
      />
      <span className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        FocusTube
      </span>
    </span>
  );
}

export function Nav({ route }: { route: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { light, toggle } = useTheme();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change — handled by link onClick in the menu
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => route === href;

  return (
    <>
      <motion.header
        initial={reduce ? false : { y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3.5"
      >
        <nav
          aria-label="Primary"
          className={`flex w-full max-w-4xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-500 ${
            scrolled
              ? "glass-ft shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)]"
              : "border border-transparent bg-transparent"
          }`}
        >
          <A href="/" ariaLabel="FocusTube home">
            <Logo />
          </A>

          <div className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <A
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-3.5 py-2 text-[0.86rem] font-medium tracking-tight transition-colors duration-300 ${
                  isActive(item.href)
                    ? "text-ink"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[color-mix(in_srgb,var(--fg)_9%,transparent)]"
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                )}
              </A>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink2 transition-all duration-300 hover:border-line2 hover:text-ink"
            >
              <motion.span
                key={light ? "sun" : "moon"}
                initial={{ rotate: -60, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex"
              >
                {light ? <Sun size={15.5} /> : <Moon size={15.5} />}
              </motion.span>
            </button>
            <span className="hidden sm:inline-flex">
              <A href="/download" className="btn btn-primary !px-4 !py-2 !text-[0.86rem]">
                Get FocusTube
              </A>
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <span className="flex flex-col gap-[5px]">
                <span className="block h-[1.5px] w-4 bg-current" />
                <span className="block h-[1.5px] w-4 bg-current" />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[60] flex flex-col bg-paper/95 backdrop-blur-2xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between px-6 pt-6">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink"
              >
                <X size={17} />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-1 px-8">
              {[...nav, { label: "Download", href: "/download" }].map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={reduce ? false : { opacity: 0, x: -28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.5, ease: EASE }}
                >
                  <A
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center justify-between border-b border-line py-4 text-[1.7rem] font-semibold tracking-[-0.03em] ${
                      isActive(item.href) ? "text-iris" : "text-ink"
                    }`}
                  >
                    {item.label}
                    <ArrowUpRight
                      size={22}
                      className="text-ink3 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                    />
                  </A>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="px-8 pb-10 text-[0.82rem] text-ink3"
            >
              FocusTube v{VERSION} · 100% local ·{" "}
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-ink2 underline underline-offset-4">
                GitHub
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto hairline-t">
      <div className="ft-container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <A href="/">
              <Logo size={30} />
            </A>
            <p className="mt-5 text-[0.92rem] leading-relaxed text-ink2">
              A calmer way to use YouTube. Privacy-first distraction control,
              built as a hardened Manifest V3 extension — 100% local, no
              account, no telemetry.
            </p>
            <Magnetic strength={0.15}>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[0.85rem] font-medium text-ink2 transition-colors duration-300 hover:border-line2 hover:text-ink"
              >
                <Download size={14} className="rotate-180" />
                Star on GitHub
                <ArrowUpRight size={14} />
              </a>
            </Magnetic>
          </div>
          {footerGroups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h3 className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-ink3">
                {g.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <A
                      href={l.href}
                      className="text-[0.92rem] text-ink2 transition-colors duration-300 hover:text-ink"
                    >
                      {l.label}
                    </A>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-7 text-[0.82rem] text-ink3 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} FocusTube. Open source under active development.</span>
          <span className="flex items-center gap-4">
            <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[0.72rem]">
              v{VERSION}
            </span>
            <span>Designed for focus.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
