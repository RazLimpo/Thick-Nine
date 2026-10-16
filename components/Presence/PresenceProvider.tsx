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
    // Re-check on storage changes (other tabs login/logout)
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  usePresenceHeartbeat(enabled);

  return <>{children}</>;
}
