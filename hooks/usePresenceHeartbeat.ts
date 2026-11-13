// hooks/usePresenceHeartbeat.ts
"use client";

import { useEffect, useRef } from "react";

const INTERVAL_MS = 45_000;

/**
 * Keeps the signed-in user's onlineStatus + lastSeen fresh on the server.
 * Visibility: online while tab focused, away when hidden, offline on unload.
 * Mount once via PresenceProvider in the root layout.
 */
export function usePresenceHeartbeat(enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let stopped = false;
    let timer: number | null = null;

    const token = () => {
      try {
        return localStorage.getItem("token");
      } catch {
        return null;
      }
    };

    const post = (path: string, body: Record<string, string>) => {
      const t = token();
      if (!t) return Promise.resolve();
      return fetch(path, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    };

    const beat = () => {
      if (stopped || !enabledRef.current) return;
      if (!token()) return;
      const status =
        typeof document !== "undefined" && document.hidden ? "away" : "online";
      void post("/api/presence/heartbeat", { status });
      try {
        window.dispatchEvent(
          new CustomEvent("presence:self", { detail: { status } })
        );
      } catch {
        /* ignore */
      }
    };

    const onVis = () => {
      beat();
    };

    const onUnload = () => {
      const t = token();
      if (!t) return;
      // Best-effort offline on tab close
      try {
        const blob = new Blob(
          [JSON.stringify({})],
          { type: "application/json" }
        );
        // fetch keepalive is more reliable than sendBeacon with auth headers
        void fetch("/api/presence/offline", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${t}`,
            "Content-Type": "application/json",
          },
          body: "{}",
          keepalive: true,
        });
      } catch {
        /* ignore */
      }
      void blob;
    };

    beat();
    timer = window.setInterval(beat, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onUnload);

    return () => {
      stopped = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [enabled]);
}

export default usePresenceHeartbeat;
