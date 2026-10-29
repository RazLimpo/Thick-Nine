// app/services/details/[id]/page.tsx

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getServiceById } from "@/lib/api/services";
import ServiceDetailsClient from "./client";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

/** Build optional auth headers so owner can load paused/draft previews. */
async function authHeadersForServiceFetch(): Promise<
  Record<string, string> | undefined
> {
  try {
    const h = await headers();
    const cookieStore = await cookies();
    const out: Record<string, string> = {};

    const authorization = h.get("authorization");
    if (authorization) out.Authorization = authorization;

    const cookieHeader = h.get("cookie");
    if (cookieHeader) out.Cookie = cookieHeader;

    const tokenCookie = cookieStore.get("token")?.value;
    if (tokenCookie && !out.Authorization) {
      out.Authorization = `Bearer ${tokenCookie}`;
    }

    return Object.keys(out).length ? out : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await Promise.resolve(params);
  const service = await getServiceById(resolved.id);

  if (!service) {
    return { title: "Service Not Found | Thick Nine" };
  }

  return {
    title: `${service.title} | Thick Nine`,
    description:
      service.description?.slice(0, 160) ||
      "View this freelance service on Thick Nine marketplace.",
  };
}

export default async function ServiceDetailsPage({ params }: Props) {
  const resolved = await Promise.resolve(params);
  const extraHeaders = await authHeadersForServiceFetch();

  let service = null;
  try {
    service = await (getServiceById as (
      id: string,
      headers?: Record<string, string>
    ) => Promise<unknown>)(resolved.id, extraHeaders);
  } catch {
    service = await getServiceById(resolved.id);
  }

  if (!service) {
    notFound();
  }

  return <ServiceDetailsClient service={service as never} />;
}
