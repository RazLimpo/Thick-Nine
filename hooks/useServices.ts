"use client";

import { useCallback, useEffect, useState } from "react";
import { getServices } from "@/lib/api/services";
import type { Service } from "@/types/service";

interface UseServicesResult {
  services: Service[];
  loading: boolean;
  error: string | null;
  refreshServices: () => Promise<void>;
}

export function useServices(): UseServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getServices();

      setServices(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load marketplace services."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshServices();
  }, [refreshServices]);

  return {
    services,
    loading,
    error,
    refreshServices,
  };
}