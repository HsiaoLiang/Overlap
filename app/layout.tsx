import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { Logo } from "@/components/logo";
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

// Colours the browser's address bar on phones to match the page.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
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
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
