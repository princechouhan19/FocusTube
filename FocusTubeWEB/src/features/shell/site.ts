/* ─────────────────────────────────────────────────────────────
   FocusTube content layer — every fact sourced from the
   FocusTube repository (README, docs/, SECURITY.md, CHANGELOG,
   manifest.json). No invented features, no fabricated proof.
   ───────────────────────────────────────────────────────────── */

export const REPO_URL = "https://github.com/princechouhan19/FocusTube";
export const VERSION = "1.17.0";

export const nav = [
  { label: "Features", href: "/features" },
  { label: "Product", href: "/product" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Product tour", href: "/product" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
      { label: "Changelog", href: "/changelog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "About", href: "/about" },
      { label: "GitHub", href: REPO_URL, external: true },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" },
    ],
  },
];
