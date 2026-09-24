"use client";

import { useEffect } from "react";

/**
 * PwaRegister mounts on the root layout to safely register the service worker
 * when running in production or supported browsers without blocking hydration.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Service worker successfully registered
          if (process.env.NODE_ENV === "development") {
            console.log("[PWA] ServiceWorker registered with scope:", registration.scope);
          }
        })
        .catch((error) => {
          console.error("[PWA] ServiceWorker registration failed:", error);
        });
    }
  }, []);

  return null;
}
