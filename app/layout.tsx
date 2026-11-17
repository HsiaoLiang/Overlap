import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import { Analytics } from "@/components/analytics";
import { CreateLink } from "@/components/create/create-link";
import { Logo } from "@/components/logo";
import { Sky } from "@/components/sky";
import { ThemeToggle } from "@/components/theme-toggle";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = localFont({ src: "../assets/fonts/Geist-Latin.woff2", variable: "--font-geist-sans", display: "swap", weight: "100 900" });
const geistMono = localFont({ src: "../assets/fonts/GeistMono-Latin.woff2", variable: "--font-geist-mono", display: "swap", weight: "100 900", preload: false });
const bricolage = localFont({ src: "../assets/fonts/Bricolage-Latin.woff", variable: "--font-display", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://overlapping.day"),
  title: { default: "Overlap — find your shared moment", template: "%s · Overlap" },
  description: "Different schedules. Different time zones. Find a little room for everyone. Create a free event, share a link, and find your shared moment.",
  twitter: { card: "summary_large_image" },
};

// Colours the browser's address bar on phones to match the page. Same values
// as --canvas in globals.css (metadata can't read CSS variables).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#101c27" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline theme script may add data-theme
    // to <html> before React loads, which is expected.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="site-shell flex min-h-full flex-col font-sans">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Sky />
        <header className="site-header">
          <div className="site-nav">
            <Logo />
            <div className="site-nav-right"><CreateLink /><ThemeToggle /></div>
          </div>
        </header>
        {/* Soft glows may reach past the edge: clip them rather than scroll sideways. */}
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col overflow-x-clip outline-none">{children}</div>
        <footer className="site-footer">
          <span>Small world. Good company.</span>
          <p>
            A sky of our own.{" "}
            <Link
              href="/credits"
              className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
            >
              Visual credits
            </Link>
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
