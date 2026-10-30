import type { MetadataRoute } from "next";

// Installing the app ("Add to Home Screen") opens it full screen, like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aprender Más",
    short_name: "Aprender",
    description: "Spanish grammar for real fluency.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070e26",
    theme_color: "#070e26",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
