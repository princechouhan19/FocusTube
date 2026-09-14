import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/features/shell/view";
import {
  faqJsonLd,
  homeJsonLd,
  routeExists,
  routeMetadata,
  staticRoutes,
} from "@/features/shell/routes";
import { docSections } from "@/features/docs/data";
import { posts } from "@/features/blog/data";

/* ── Optional catch-all: every page of the site is statically
       prerendered at these real URLs (no hash routing) ── */
export function generateStaticParams() {
  return [
    { slug: [] as string[] }, // "/"
    ...staticRoutes.map((r) => ({ slug: r.split("/").filter(Boolean) })),
    ...docSections.map((d) => ({ slug: ["docs", d.slug] })),
    ...posts.map((p) => ({ slug: ["blog", p.slug] })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return routeMetadata("/" + (slug ?? []).join("/"));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const route = "/" + (slug ?? []).join("/");

  if (!routeExists(route)) notFound();

  return (
    <>
      {route === "/" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: homeJsonLd() }}
        />
      )}
      {route === "/faq" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqJsonLd() }}
        />
      )}
      <PageView route={route} />
    </>
  );
}
