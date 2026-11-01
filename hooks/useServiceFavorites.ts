// hooks/useServiceFavorites.ts
"use client";

import { useCallback, useEffect, useState } from "react";

/** Module-level store — shared by every useServiceFavorites() caller */
let memory: Record<string, boolean> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setMemory(next: Record<string, boolean>) {
  memory = next;
  emit();
}

function patchMemory(serviceId: string, value: boolean | null) {
  const next = { ...memory };
  if (value === null) delete next[serviceId];
  else next[serviceId] = value;
  setMemory(next);
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function useServiceFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>(
    () => memory
  );

  // Subscribe to shared store
  useEffect(() => {
    const sync = () => setFavoriteIds({ ...memory });
    listeners.add(sync);
    sync(); // pick up current memory on mount
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const refreshFavorites = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setMemory({});
      return;
    }

    try {
      const res = await fetch("/api/bookmarks?itemType=Service", {
        method: "GET",
        credentials: "include",
        headers: authHeaders(),
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !Array.isArray(json.bookmarks)) {
        setMemory({});
        return;
      }

      const next: Record<string, boolean> = {};
      for (const bookmark of json.bookmarks) {
        const id = String(bookmark.itemId || bookmark.item?._id || "").trim();
        if (id) next[id] = true;
      }
      setMemory(next);
    } catch {
      setMemory({});
    }
  }, []);

  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  const isFavorited = useCallback(
    (serviceId: string) => Boolean(favoriteIds[String(serviceId)]),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (serviceId: string, nextState: boolean) => {
      const id = String(serviceId || "").trim();
      if (!id) return;

      const token = getToken();
      if (!token) {
        if (typeof window !== "undefined") {
          window.location.href = "/?auth=login";
        }
        return;
      }

      // Optimistic update (all subscribers see it)
      patchMemory(id, nextState);

      try {
        const res = await fetch("/api/bookmarks", {
          method: nextState ? "POST" : "DELETE",
          credentials: "include",
          headers: authHeaders(true),
          body: JSON.stringify({
            itemType: "Service",
            itemId: id,
          }),
        });

        const json = await res.json().catch(() => ({}));

        // 409 = already bookmarked → treat as success
        if (!res.ok && !(nextState && res.status === 409)) {
          // Rollback
          patchMemory(id, nextState ? null : true);
          console.error(
            "Bookmark toggle failed:",
            json.message || `HTTP ${res.status}`
          );
          throw new Error(json.message || "Could not update favourite");
        }
      } catch (err) {
        // Network error — rollback if still optimistic
        patchMemory(id, nextState ? null : true);
        console.error("Bookmark toggle network error:", err);
        throw err;
      }
    },
    []
  );

  return {
    favoriteIds,
    isFavorited,
    toggleFavorite,
    refreshFavorites,
  };
}