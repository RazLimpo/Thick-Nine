import { API_BASE_URL } from "@/lib/constants";
import type { Service } from "@/types/service";

/**
 * Fetch all marketplace services.
 * Uses the live Express backend.
 */
export async function getServices(): Promise<Service[]> {
  const response = await fetch(`${API_BASE_URL}/api/services`, {
    method: "GET",
    headers: {  
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch marketplace services.");
  }

  return response.json();
}