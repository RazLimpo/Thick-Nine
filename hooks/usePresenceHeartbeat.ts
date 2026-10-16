"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_MS = 45_000; // 45s — under backend 2min TTL

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

/**
 * Keeps the logged-in user marked online while this component is mounted
 * (put once in root layout or Header).
 * Sends offline on tab close / unmount when possible.
 */
export function usePresenceHeartbeat(enabled = true) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const send = (path: "heartbeat" | "offline", body?: object) => {
      const token = getToken();
      if (!token) return;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Prefer same-origin Next proxy
      const url = `/api/presence/${path}`;

      if (path === "offline" && typeof navigator !== "undefined" && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(body || {})], {
            type: "application/json",
          });
          // sendBeacon cannot set Authorization easily — fall through to fetch keepalive
        } catch {
          /* ignore */
        }
      }

      fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body || {}),
        keepalive: path === "offline",
      }).catch(() => {
        /* ignore network errors for presence */
      });
    };

    const tick = () => {
      if (document.visibilityState === "hidden") {
        send("heartbeat", { status: "away" });
      } else {
        send("heartbeat", { status: "online" });
      }
    };

    // Immediate + interval
    tick();
    intervalRef.current = setInterval(tick, HEARTBEAT_MS);

    const onVisibility = () => tick();
    document.addEventListener("visibilitychange", onVisibility);

    const onUnload = () => send("offline");
    window.addEventListener("pagehide", onUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      send("offline");
    };
  }, [enabled]);
}
