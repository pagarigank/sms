import { redirect } from 'next/navigation';

// Section index: the sidebar's "SIS" parent links here. Land on the primary
// child so the parent link never 404s (children render once this route is
// active, since it starts with /sis).
export default function SisIndexPage() {
  redirect('/sis/students');
}
