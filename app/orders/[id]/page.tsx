// app/orders/[id]/page.tsx
// Keep existing metadata style + client

import OrderSuccessClient from "./client";

export const metadata = {
  title: "Order | Thick Nine",
  description: "Order confirmation and details.",
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await Promise.resolve(params);
  return <OrderSuccessClient orderId={id} />;
}
