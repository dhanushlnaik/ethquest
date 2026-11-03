import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ETHQuest — The Protocol Playground",
    short_name: "ETHQuest",
    description: "Explore. Play. Discover. Contribute. Ethereum as a pixel-art game, by EIPsInsight.",
    start_url: "/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e3f4ff",
    theme_color: "#8fdcff",
    categories: ["education", "games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
