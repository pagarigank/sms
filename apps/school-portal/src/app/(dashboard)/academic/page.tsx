import { redirect } from 'next/navigation';

// Section index: the sidebar's "Academic Setup" parent links here.
export default function AcademicIndexPage() {
  redirect('/academic/school-years');
}
