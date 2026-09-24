import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClubOS — Tinkers Hub Management Platform",
    short_name: "ClubOS",
    description: "Institutional management and operations platform for Tinkers Hub.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#153328",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
