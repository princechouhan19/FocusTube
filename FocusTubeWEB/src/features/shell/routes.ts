import type { Metadata } from "next";
import { docSections } from "../docs/data";
import { posts } from "../blog/data";
import { faqs } from "../info/data";
import { REPO_URL, VERSION } from "./site";

export const SITE_URL = "https://focustube.app";

/* ── Every top-level route, in nav order (docs/blog articles are
       appended from their data sources) ── */
export const staticRoutes = [
  "/features",
  "/product",
  "/how-it-works",
  "/docs",
  "/blog",
  "/about",
  "/changelog",
  "/security",
  "/faq",
  "/download",
  "/contact",
];

interface RouteInfo {
  title: string;
  description: string;
}

/* ── Per-route SEO copy (title/description rendered server-side) ── */
export const routeInfo: Record<string, RouteInfo> = {
  "/": {
    title: "FocusTube — Take back control of YouTube",
    description:
      "FocusTube is a privacy-first Chrome extension (Manifest V3) that turns YouTube from a distraction engine into a focused learning environment. Block distractions, close your daily Focus Rings, and get a morning briefing — 100% local, no account, no telemetry.",
  },
  "/features": {
    title: "Features",
    description:
      "Layered blocking, focus timers, daily briefings, watch intent, AI summaries, focus companions and honest analytics — every FocusTube feature, 100% local.",
  },
  "/product": {
    title: "Product tour",
    description:
      "A guided tour through every FocusTube surface: the popup, the dashboard, overlays, the block page, onboarding and the companion — with real product screenshots.",
  },
  "/how-it-works": {
    title: "How it works",
    description:
      "From install to closed Focus Rings: the five-step FocusTube loop — install, declare intent, let the layers work, close your rings, review and choose again.",
  },
  "/docs": {
    title: "Documentation",
    description:
      "FocusTube documentation: getting started, installation, architecture, API reference, configuration, security, troubleshooting, project structure and contributing.",
  },
  "/blog": {
    title: "Journal",
    description:
      "Essays from the FocusTube project: attention economy research, Focus Rings design, Manifest V3 engineering, privacy-first analytics and watch-intent psychology.",
  },
  "/about": {
    title: "About",
    description:
      "Why FocusTube exists, how it evolved from a blocker into a complete focus system, and the principles that keep it local, honest and calm.",
  },
  "/changelog": {
    title: "Changelog",
    description:
      "Every FocusTube release — from the v1.0.0 hardening release to v1.17.0's companions, Watch Intent and Streak Insurance.",
  },
  "/security": {
    title: "Security & privacy",
    description:
      "FocusTube's security model: what data stays on your device, the permission-by-permission rationale, hardening history and the honest threat model.",
  },
  "/faq": {
    title: "FAQ",
    description:
      "Answers about installing FocusTube, what data it collects, Focus Rings, the anti-gaming Focus Score, AI summaries, unblock friction and where your data lives.",
  },
  "/download": {
    title: "Download",
    description:
      "Install FocusTube in four steps: clone or download the repository, open chrome://extensions, load it unpacked and pin it. Free and open source.",
  },
  "/contact": {
    title: "Contact",
    description:
      "Reach the FocusTube project: GitHub issues for bugs and features, GitHub Discussions for questions, and SECURITY.md for vulnerability reports.",
  },
};

/* ── Does a path resolve to a real page? (used for 404 handling) ── */
export function routeExists(route: string): boolean {
  if (routeInfo[route]) return true;
  if (route.startsWith("/docs/"))
    return docSections.some((d) => d.slug === route.slice(6));
  if (route.startsWith("/blog/"))
    return posts.some((p) => p.slug === route.slice(6));
  return false;
}

/* ── Server-rendered metadata per route ── */
export function routeMetadata(route: string): Metadata {
  let title: string;
  let description: string;

  if (route.startsWith("/docs/")) {
    const doc = docSections.find((d) => d.slug === route.slice(6));
    title = doc ? doc.title : "Documentation";
    description = doc?.description ?? routeInfo["/docs"].description;
  } else if (route.startsWith("/blog/")) {
    const post = posts.find((p) => p.slug === route.slice(6));
    title = post ? post.title : "Journal";
    description = post?.excerpt ?? routeInfo["/blog"].description;
  } else {
    const info = routeInfo[route];
    title = info?.title ?? "Page not found";
    description =
      info?.description ?? "This page doesn't exist on FocusTube.";
  }

  return {
    title: route === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: route },
    openGraph: {
      title,
      description,
      url: route,
      siteName: "FocusTube",
      type: "website",
      images: [
        {
          url: "/brand/og.png",
          width: 1200,
          height: 630,
          alt: "FocusTube dashboard — Focus Score, Focus Rings and analytics",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/og.png"],
    },
  };
}

/* ── JSON-LD: SoftwareApplication on the home page ── */
export function homeJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FocusTube",
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome",
    softwareVersion: VERSION,
    url: SITE_URL,
    description: routeInfo["/"].description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Organization", name: "FocusTube" },
    sameAs: [REPO_URL],
  });
}

/* ── JSON-LD: FAQPage on /faq (from the real FAQ data) ── */
export function faqJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}
