import OrderSuccessClient from './client';

export const metadata = {
  title: 'Order Confirmation | Thick 9',
  description: 'Your order details and escrow confirmation.',
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrderSuccessClient orderId={id} />;
}