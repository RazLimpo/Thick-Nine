/**
 * Shared presence helpers — use on service cards, profiles, messages, etc.
 */

export type PresenceStatus = "online" | "away" | "offline";

export type PresenceUser = {
  _id?: string;
  id?: string;
  onlineStatus?: string | null;
  lastSeen?: string | Date | null;
  isOnline?: boolean;
};

/** Same TTL as backend (2 minutes). */
export const ONLINE_TTL_MS = 2 * 60 * 1000;

export function effectiveStatus(user?: PresenceUser | null): PresenceStatus {
  if (!user) return "offline";

  // Explicit boolean from API
  if (typeof user.isOnline === "boolean") {
    return user.isOnline ? "online" : "offline";
  }

  const raw = (user.onlineStatus || "offline").toLowerCase();
  if (raw === "offline" || !["online", "away", "offline"].includes(raw)) {
    return "offline";
  }

  if (!user.lastSeen) {
    return raw === "online" || raw === "away" ? (raw as PresenceStatus) : "offline";
  }

  const age = Date.now() - new Date(user.lastSeen).getTime();
  if (Number.isNaN(age) || age > ONLINE_TTL_MS) return "offline";
  return raw as PresenceStatus;
}

export function isUserOnline(user?: PresenceUser | null): boolean {
  return effectiveStatus(user) === "online";
}

export function isUserAway(user?: PresenceUser | null): boolean {
  return effectiveStatus(user) === "away";
}

export function presenceLabel(user?: PresenceUser | null): string {
  const s = effectiveStatus(user);
  if (s === "online") return "Online";
  if (s === "away") return "Away";
  return "Offline";
}
