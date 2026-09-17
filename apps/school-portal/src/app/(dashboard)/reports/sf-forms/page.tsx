'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sms/ui';
import { FileText, Users, Calendar, Award } from 'lucide-react';

const SF_FORMS = [
  {
    id: 'sf1',
    name: 'SF1 - School Register',
    description: 'Master list of officially enrolled learners with complete demographics.',
    icon: Users,
    href: '/reports/sf-forms/sf1',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'sf2',
    name: 'SF2 - Daily Attendance',
    description: 'Record of daily attendance, tardiness, and absences.',
    icon: Calendar,
    href: '/reports/sf-forms/sf2',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    id: 'sf9',
    name: 'SF9 - Report Card',
    description: 'Learner progress report card issued every grading period.',
    icon: Award,
    href: '/reports/sf-forms/sf9',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'sf3',
    name: 'SF3 - Books Issued',
    description: 'List of books and materials issued to learners.',
    icon: FileText,
    href: '#',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    comingSoon: true,
  },
];

export default function SfFormsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DepEd School Forms</h1>
        <p className="text-muted-foreground">Standardized reporting forms (SF1 - SF10)</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SF_FORMS.map((form) => {
          const Icon = form.icon;
          return (
            <Card key={form.id} className="group relative overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${form.bg}`}>
                    <Icon className={`h-5 w-5 ${form.color}`} />
                  </div>
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{form.description}</CardDescription>
                {form.comingSoon ? (
                  <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Coming Soon
                  </span>
                ) : (
                  <Link
                    href={form.href}
                    className="inline-block text-sm font-medium text-primary hover:underline after:absolute after:inset-0"
                  >
                    Generate Report &rarr;
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
