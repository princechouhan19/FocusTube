"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer, Nav } from "./chrome";
import { DocsFooter } from "../docs/pages";

/* ── App shell: fixed nav, animated page outlet, route-aware footer.
       Rendered once in the root layout so the nav never remounts
       between routes — only the page content swaps below it. ── */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  const isDocs = pathname === "/docs" || pathname.startsWith("/docs/");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav route={pathname} />
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <div key={pathname}>{children}</div>
        </AnimatePresence>
      </div>
      {/* Docs pages get a concise single-row footer; everything else the full one */}
      {isDocs ? <DocsFooter /> : <Footer />}
    </div>
  );
}
