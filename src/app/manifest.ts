import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ETHQuest — The Protocol Playground",
    short_name: "ETHQuest",
    description: "Learn Ethereum standards, collect every EIP as a pixel trading card and battle your friends. By EIPsInsight.",
    id: "/play",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#24302f",
    theme_color: "#24302f",
    categories: ["education", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Daily challenge", url: "/play/daily", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My cards", url: "/play/cards", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Battle", url: "/play/battle", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
