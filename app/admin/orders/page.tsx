import AdminOrdersClient from './client';

export const metadata = {
  title: 'Orders & Escrow Oversight | Thick 9 Admin',
  description: 'Manage platform orders, fee splits, and escrow releases.',
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}