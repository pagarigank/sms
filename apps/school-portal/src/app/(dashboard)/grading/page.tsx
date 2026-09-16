import { redirect } from 'next/navigation';

// Section index: the sidebar's "Grading Config" parent links here.
export default function GradingIndexPage() {
  redirect('/grading/systems');
}
