'use client';

import { useAuthStore } from '@/lib/store';
import { getInitials } from '@sms/utils';
import { GraduationCap, BookOpen, CreditCard, FileText } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const quickLinks = [
    { name: 'Grades', href: '/grades', icon: BookOpen, description: 'View student grades and report cards' },
    { name: 'Attendance', href: '/attendance', icon: GraduationCap, description: 'Track attendance records' },
    { name: 'Billing', href: '/billing', icon: CreditCard, description: 'View statement of account and pay fees' },
    { name: 'Documents', href: '/documents', icon: FileText, description: 'Request and download documents' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-gray-900">SchoolSuite</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
              {user ? getInitials(`${user.firstName} ${user.lastName}`) : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {user ? `${user.firstName} ${user.lastName}` : 'Parent'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName || 'Parent'}!</h1>
          <p className="mt-1 text-gray-600">View your children&apos;s academic information and manage school-related tasks.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <a key={link.name} href={link.href}
              className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <link.icon className="h-8 w-8 text-primary" />
              <h2 className="mt-4 font-semibold text-gray-900">{link.name}</h2>
              <p className="mt-1 text-sm text-gray-600">{link.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Student Profiles</h2>
          <p className="mt-2 text-sm text-gray-600">
            Student profiles will appear here once enrollment data is available (Phase 4+).
          </p>
        </div>
      </main>
    </div>
  );
}
