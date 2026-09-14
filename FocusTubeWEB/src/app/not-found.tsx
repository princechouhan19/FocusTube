import { PageView } from "@/features/shell/view";

/* Rendered when the catch-all page calls notFound() — the nav and
   footer come from the root layout's <Shell>, this is the 404 body.
   Served with a real 404 status code. */
export default function NotFound() {
  return <PageView route="/404" />;
}
