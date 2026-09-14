"use client";

import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { ArrowRight, Copy, Check } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Link — internal routes go through next/link (client nav, prefetch);
      external URLs and pure hash anchors render as plain anchors ── */
function toInternalHref(href: string): string | null {
  if (href.startsWith("#/")) return href.slice(1) || "/";
  if (href.startsWith("/")) return href;
  return null;
}

export function A({
  href,
  children,
  className,
  onClick,
  ariaLabel,
  target,
  rel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  target?: string;
  rel?: string;
}) {
  const internal = toInternalHref(href);
  if (internal) {
    return (
      <Link
        href={internal}
        onClick={onClick}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      target={target}
      rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
    >
      {children}
    </a>
  );
}

/* ── Scroll reveal ── */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-12% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Staggered word reveal for display headlines ── */
export function WordReveal({
  text,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  if (reduce) {
    return (
      <Tag ref={ref as never} className={className}>
        {text}
      </Tag>
    );
  }
  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{ overflowWrap: "break-word" }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "bottom",
            paddingBottom: "0.16em",
            marginBottom: "-0.16em",
          }}
        >
          <motion.span
            style={{ display: "inline-block", willChange: "transform" }}
            initial={{ y: "120%" }}
            animate={inView ? { y: "0%" } : { y: "120%" }}
            transition={{ duration: 0.85, delay: delay + i * 0.045, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ── Magnetic hover wrapper ── */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 14, mass: 0.4 });
  const y = useSpring(my, { stiffness: 180, damping: 14, mass: 0.4 });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: "inline-block" }}
      onPointerMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Pointer-tilt card ── */
export function TiltCard({
  children,
  className,
  max = 5,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 18 });
  const sry = useSpring(ry, { stiffness: 160, damping: 18 });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX: srx,
        rotateY: sry,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
      onPointerMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Browser window frame ── */
export function BrowserFrame({
  children,
  url = "youtube.com",
  className,
  style,
}: {
  children: ReactNode;
  url?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`browser-frame ${className ?? ""}`} style={style}>
      <div className="browser-bar" aria-hidden>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex h-6 w-full max-w-[280px] items-center justify-center rounded-md border border-line bg-black/20 text-[11px] font-medium tracking-tight text-ink3">
          {url}
        </div>
        <div className="w-10" />
      </div>
      {children}
    </div>
  );
}

/* ── Screenshot inside a frame ── */
export function Shot({
  src,
  alt,
  frame = "browser",
  className,
  imgClassName,
  priority,
  url,
}: {
  src: string;
  alt: string;
  frame?: "browser" | "phone" | "none";
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  url?: string;
}) {
  const img = (
     
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block h-auto w-full ${imgClassName ?? ""}`}
      draggable={false}
    />
  );
  if (frame === "browser")
    return (
      <BrowserFrame url={url} className={className}>
        {img}
      </BrowserFrame>
    );
  if (frame === "phone")
    return (
      <div
        className={`overflow-hidden rounded-[2rem] border border-line2 bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ${className ?? ""}`}
        style={{ maxWidth: 420 }}
      >
        {img}
      </div>
    );
  return <div className={className}>{img}</div>;
}

/* ── Section heading kit ── */
export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={`${align === "center" ? "mx-auto text-center items-center" : "text-left items-start"} flex max-w-3xl flex-col ${className ?? ""}`}
    >
      {eyebrow && (
        <Reveal>
          <span className="eyebrow">{eyebrow}</span>
        </Reveal>
      )}
      <WordReveal
        text={title}
        className="ft-h2 mt-4 text-[clamp(1.9rem,4.2vw,3.3rem)] text-ink"
      />
      {lead && (
        <Reveal delay={0.12}>
          <p className="ft-lead mt-5">{lead}</p>
        </Reveal>
      )}
    </div>
  );
}

/* ── Focus Rings chart (animated SVG, product signature) ── */
export function FocusRings({
  size = 320,
  values = [12, 110, 51],
  goals = [12, 120, 60],
  delay = 0,
  className,
}: {
  size?: number;
  values?: number[];
  goals?: number[];
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const colors = ["var(--ring-deflected)", "var(--ring-focused)", "var(--ring-saved)"];
  const stroke = size * 0.052;
  const gap = size * 0.018;

  const ringsData = [0, 1, 2].map((i) => {
    const r = size / 2 - stroke / 2 - 4 - i * (stroke + gap);
    const c = 2 * Math.PI * r;
    const pct = Math.min(1, (values[i] ?? 0) / (goals[i] ?? 1));
    return { r, c, pct, color: colors[i] };
  });

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Focus Rings: Deflected, Focused and Saved"
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {ringsData.map((ring, i) => (
          <g key={i}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ring.r}
              fill="none"
              stroke="rgba(128,128,128,0.18)"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={ring.c}
              initial={{ strokeDashoffset: reduce ? ring.c * (1 - ring.pct) : ring.c }}
              animate={
                inView || reduce
                  ? { strokeDashoffset: ring.c * (1 - ring.pct) }
                  : { strokeDashoffset: ring.c }
              }
              transition={{
                duration: reduce ? 0 : 1.6,
                delay: reduce ? 0 : delay + i * 0.18,
                ease: EASE,
              }}
            />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: delay + 0.7, duration: 0.6 }}
          className="font-semibold tracking-tight text-ink"
          style={{ fontSize: size * 0.115 }}
        >
          3/3
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: delay + 0.8, duration: 0.6 }}
          className="font-medium uppercase text-ink3"
          style={{ fontSize: size * 0.042, letterSpacing: "0.12em" }}
        >
          rings closed
        </motion.span>
      </div>
    </div>
  );
}

/* ── Live countdown (the Focus Timer moment) ── */
export function useCountdown(fromSeconds = 25 * 60) {
  const [t, setT] = useState(fromSeconds);
  useEffect(() => {
    const id = setInterval(() => setT((v) => (v <= 0 ? fromSeconds : v - 1)), 1000);
    return () => clearInterval(id);
  }, [fromSeconds]);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Countdown({ from = 25 * 60 }: { from?: number }) {
  const t = useCountdown(from);
  return (
    <span className="font-mono tabular-nums" aria-live="off">
      {t}
    </span>
  );
}

/* ── Code block with copy ── */
export function CodeBlock({
  code,
  lang = "text",
}: {
  code: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-2">
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          aria-label="Copy code"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-black/30 text-ink2 opacity-0 transition-all duration-300 hover:text-ink group-hover:opacity-100"
          onClick={() => {
            navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
        >
          {copied ? <Check size={14} className="text-focused" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-2xl border border-line bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] p-5 font-mono text-[0.83rem] leading-relaxed text-ink2">
        <code>{code}</code>
      </pre>
      <span className="pointer-events-none absolute left-5 top-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink3">
        {lang}
      </span>
    </div>
  );
}

/* ── Primary/ghost CTA pair ── */
export function CTAPair({
  primary,
  secondary,
}: {
  primary: { label: string; href: string };
  secondary?: { label: string; href: string; icon?: ReactNode };
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3.5">
      <Magnetic>
        <A href={primary.href} className="btn btn-primary">
          {primary.label}
          <ArrowRight size={16} strokeWidth={2.2} />
        </A>
      </Magnetic>
      {secondary && (
        <Magnetic strength={0.2}>
          <A href={secondary.href} className="btn btn-ghost">
            {secondary.icon}
            {secondary.label}
          </A>
        </Magnetic>
      )}
    </div>
  );
}

/* ── Page shell (transition handled by the router wrapper) ── */
export function PageIn({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: "easeIn" } }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex min-h-screen flex-col"
    >
      {children}
    </motion.main>
  );
}

/* ── Badge chip ── */
export function Chip({
  children,
  active,
  className,
  ...rest
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
} & HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`rounded-full border px-4 py-2 text-[0.86rem] font-medium tracking-tight transition-colors duration-300 ${
        active
          ? "border-transparent bg-iris text-white"
          : "border-line bg-surface text-ink2 hover:border-line2 hover:text-ink"
      } ${className ?? ""}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
