import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { Logo } from "@/components/logo";
import { Sky } from "@/components/sky";
import { ThemeToggle } from "@/components/theme-toggle";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Overlap — find a time that works", template: "%s · Overlap" },
  description: "Create an event, share the link, and see when everyone is free. No sign-ups.",
  twitter: { card: "summary_large_image" },
};

// Colours the browser's address bar on phones to match the page. Same values
// as --canvas in globals.css (metadata can't read CSS variables).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9edf2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline theme script may add data-theme
    // to <html> before React loads, which is expected.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Sky />
        <header className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
          <div className="glass flex h-12 items-center justify-between rounded-full pr-2 pl-4">
            <Logo />
            <ThemeToggle />
          </div>
        </header>
        {/* Soft glows may reach past the edge: clip them rather than scroll sideways. */}
        <div className="flex flex-1 flex-col overflow-x-clip">{children}</div>
        <footer className="flex justify-center px-4 pb-5">
          <p className="glass rounded-full px-3 py-1 text-xs text-muted">
            Sky photos from Wikimedia Commons.{" "}
            <Link
              href="/credits"
              className="rounded font-medium text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
            >
              Photo credits
            </Link>
          </p>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
