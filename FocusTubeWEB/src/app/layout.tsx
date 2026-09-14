import type { Metadata, Viewport } from "next";
import { Shell } from "@/features/shell/shell";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL("https://focustube.app"),
  title: {
    default: "FocusTube — Take back control of YouTube",
    template: "%s · FocusTube",
  },
  description:
    "FocusTube is a privacy-first Chrome extension (Manifest V3) that turns YouTube from a distraction engine into a focused learning environment. Block distractions, close your daily Focus Rings, and get a morning briefing — 100% local, no account, no telemetry.",
  keywords: [
    "FocusTube",
    "YouTube focus",
    "distraction control",
    "Chrome extension",
    "Manifest V3",
    "productivity",
    "digital wellbeing",
    "focus rings",
    "block shorts",
    "privacy",
  ],
  authors: [{ name: "FocusTube" }],
  creator: "FocusTube",
  icons: {
    icon: [
      { url: "/brand/icon16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/brand/icon48.png?v=2", sizes: "48x48", type: "image/png" },
    ],
    apple: "/brand/apple-touch-icon.png?v=2",
  },
  openGraph: {
    type: "website",
    siteName: "FocusTube",
    title: "FocusTube — Take back control of YouTube",
    description:
      "A privacy-first Chrome extension that turns YouTube from a slot machine back into a tool. Focus Rings, Daily Briefing, layered blocking — 100% local.",
    url: "https://focustube.app",
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
    title: "FocusTube — Take back control of YouTube",
    description:
      "Turn YouTube from a distraction engine into a focused learning environment. 100% local. No account. No telemetry.",
    images: ["/brand/twittercard.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('ft-theme');
    if (t === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.add('dark');
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-paper text-ink"
      >
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
