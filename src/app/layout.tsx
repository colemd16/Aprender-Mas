import type { Metadata, Viewport } from "next";
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

// iPhone launch screens made by scripts/generate-icons.mjs (keep the two lists in step).
// [css width, css height, pixel ratio]
const SPLASH_SCREENS = [
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 2],
] as const;

export const metadata: Metadata = {
  title: "Aprender Más",
  description: "Spanish grammar for real fluency.",
  // Opened from the home screen: full screen, content running under the status bar.
  appleWebApp: {
    capable: true,
    title: "Aprender",
    statusBarStyle: "black-translucent",
    startupImage: SPLASH_SCREENS.map(([w, h, dpr]) => ({
      url: `/splash/${w * dpr}x${h * dpr}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
};

export const viewport: Viewport = {
  themeColor: "#070e26",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Behind the status bar when installed, so pages scroll under it cleanly. */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-night" />
        {/* The flag as a thin stripe across the top of every page. */}
        <div aria-hidden="true" className="flag-stripe pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 h-[3px]" />
        {children}
      </body>
    </html>
  );
}
