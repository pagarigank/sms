import { redirect } from 'next/navigation';

// Section index: the sidebar's "Billing" parent links here.
export default function BillingIndexPage() {
  redirect('/billing/fee-types');
}
