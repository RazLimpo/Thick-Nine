// app/service-dashboard/[id]/page.tsx

import { Metadata } from "next";
import ServiceDashboardClient from "./client";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  return {
    title: `Service Dashboard | Thick Nine`,
    description: `Manage service ${id}`,
  };
}

export default async function ServiceDashboardPage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  return <ServiceDashboardClient serviceId={id} />;
}