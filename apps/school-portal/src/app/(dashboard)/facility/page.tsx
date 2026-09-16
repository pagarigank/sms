import { redirect } from 'next/navigation';

// Section index: the sidebar's "Facility" parent links here.
export default function FacilityIndexPage() {
  redirect('/facility/buildings');
}
