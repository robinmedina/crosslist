import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Crosslist",
  description: "Snap a photo and list it on Depop, Poshmark, Vinted, Whatnot, eBay and Etsy at once.",
};

export const viewport: Viewport = {
  themeColor: "#f9f8f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${interTight.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
              <span aria-hidden className="grid size-5 place-items-center bg-ink-black">
                <span className="size-2 bg-solar" />
              </span>
              Crosslist
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/" className="px-3 py-2 text-sm text-hushed hover:text-ink">
                Inventory
              </Link>
              <Link href="/new" className="btn btn-primary h-9 px-4 text-sm">
                + New listing
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
