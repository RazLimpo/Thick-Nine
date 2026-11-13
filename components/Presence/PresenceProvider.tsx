"use client";

import { useEffect, useState } from "react";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

/**
 * Mount once in the root layout (client component).
 * Enables heartbeat when a session token is present.
 */
export default function PresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const token = localStorage.getItem("token");
        const loggedIn = localStorage.getItem("isLoggedIn") === "true";
        setEnabled(!!token && loggedIn);
      } catch {
        setEnabled(false);
      }
    };
    check();
    window.addEventListener("storage", check);
    // Same-tab login/logout
    window.addEventListener("auth:changed", check);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("auth:changed", check);
    };
  }, []);

  usePresenceHeartbeat(enabled);

  return <>{children}</>;
}
