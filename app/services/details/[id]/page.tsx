// app/services/details/[id]/page.tsx

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/api/services";
import ServiceDetailsClient from "./client";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

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
  const service = await getServiceById(resolved.id);

  if (!service) {
    notFound();
  }

  return <ServiceDetailsClient service={service} />;
}