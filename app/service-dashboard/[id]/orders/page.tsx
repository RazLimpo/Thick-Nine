// app/service-dashboard/[id]/orders/page.tsx

import { Metadata } from "next";
import ServiceOrderManagerClient from "./client";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  return {
    title: "Service Orders | Thick Nine",
    description: `Manage orders for service ${id}`,
  };
}

export default async function ServiceOrdersPage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  return <ServiceOrderManagerClient serviceId={id} />;
}
