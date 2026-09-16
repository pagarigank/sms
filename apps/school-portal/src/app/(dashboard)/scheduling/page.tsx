import { redirect } from 'next/navigation';

// Section index: the sidebar's "Scheduling" parent links here.
export default function SchedulingIndexPage() {
  redirect('/scheduling/timetable');
}
