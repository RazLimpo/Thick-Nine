import { API_BASE_URL } from "@/lib/constants";
import type { Service } from "@/types/service";

/**
 * Fetch marketplace services from the Express backend.
 * Returns a raw array for mapService().
 */
export async function getServices(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/services`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ||
        "Failed to fetch marketplace services."
    );
  }

  // Support both shapes during transition
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray((data as { services?: unknown }).services)) {
    return (data as { services: any[] }).services;
  }

  return [];
}