"use client";

import Home from "../home/sections";
import { FeaturesPage, HowPage, ProductPage } from "../product/pages";
import { DocArticle, DocsHub } from "../docs/pages";
import { BlogArticle, BlogIndex } from "../blog/pages";
import { AboutPage, ChangelogPage, FaqPage, SecurityPage } from "../info/pages";
import { ContactPage, DownloadPage, NotFoundPage } from "../misc/pages";

/* ── Route table: maps a URL path to its page component.
       The path is resolved on the server (static params / not-found)
       and passed down, so the correct page is server-rendered. ── */
export function PageView({ route }: { route: string }) {
  if (route.startsWith("/docs/")) return <DocArticle slug={route.slice(6)} />;
  if (route.startsWith("/blog/")) return <BlogArticle slug={route.slice(6)} />;
  switch (route) {
    case "/":
      return <Home />;
    case "/features":
      return <FeaturesPage />;
    case "/product":
      return <ProductPage />;
    case "/how-it-works":
      return <HowPage />;
    case "/docs":
      return <DocsHub />;
    case "/blog":
      return <BlogIndex />;
    case "/about":
      return <AboutPage />;
    case "/changelog":
      return <ChangelogPage />;
    case "/security":
      return <SecurityPage />;
    case "/faq":
      return <FaqPage />;
    case "/download":
      return <DownloadPage />;
    case "/contact":
      return <ContactPage />;
    default:
      return <NotFoundPage />;
  }
}
