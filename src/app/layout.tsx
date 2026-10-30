import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Aprender Más",
  description: "Spanish grammar for real fluency.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* The flag as a thin stripe across the top of every page. */}
        <div aria-hidden="true" className="flag-stripe pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]" />
        {children}
      </body>
    </html>
  );
}
