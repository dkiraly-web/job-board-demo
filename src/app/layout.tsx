import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Board Demo — Bosch Group Listings",
  description:
    "Unofficial demo job board. Displays live public job listings from Bosch Group's SmartRecruiters feed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <div className="bg-slate-900 px-6 py-1.5 text-center text-xs text-slate-300">
          Unofficial demo project — not affiliated with or endorsed by Robert Bosch GmbH.
        </div>
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-indigo-600">
                Job Board Demo
              </span>
              <span className="text-sm font-medium text-zinc-500">Bosch Group listings</span>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-zinc-600 hover:text-zinc-900">
                Browse jobs
              </Link>
              <Link href="/cv-match" className="text-zinc-600 hover:text-zinc-900">
                Match my CV
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-zinc-500">
            Job listings sourced live from{" "}
            <a
              href="https://careers.smartrecruiters.com/BoschGroup"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-700"
            >
              careers.smartrecruiters.com/BoschGroup
            </a>
            . This is an independent demo project built to showcase live API integration; it is
            not affiliated with, endorsed by, or operated on behalf of Robert Bosch GmbH.
          </div>
        </footer>
      </body>
    </html>
  );
}
