'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button, Label, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTenantStore } from '@/lib/store';

export default function Sf9Page() {
  const [studentId, setStudentId] = useState<string>('');
  const [schoolYearId, setSchoolYearId] = useState<string>('');

  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const { data: studentsRes } = useQuery({
    queryKey: ['students', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const students = (studentsRes?.data as any[]) ?? [];

  const { data: schoolYearsRes } = useQuery({
    queryKey: ['school-years'],
    queryFn: () => apiClient.academic.listSchoolYears(),
  });
  const schoolYears = (schoolYearsRes?.data as any[]) ?? [];

  const { data: sf9Data, isLoading, isError } = useQuery({
    queryKey: ['sf9', studentId, schoolYearId],
    queryFn: () => apiClient.reporting.getSf9(studentId, { schoolYearId }).then(r => r.data as any),
    enabled: !!studentId && !!schoolYearId,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-4">
        <div className="flex items-center space-x-4">
          <Link href="/reports/sf-forms" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader title="SF9 - Report Card" description="Select a student and school year to generate the report card" />
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex-1 min-w-[250px] max-w-xs">
            <Label htmlFor="student-select">Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="student-select" className="mt-1">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.lastName}, {s.firstName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Label htmlFor="sy-select">School Year</Label>
            <Select value={schoolYearId} onValueChange={setSchoolYearId}>
              <SelectTrigger id="sy-select" className="mt-1">
                <SelectValue placeholder="Select School Year" />
              </SelectTrigger>
              <SelectContent>
                {schoolYears.map((sy) => (
                  <SelectItem key={sy.id} value={sy.id}>{sy.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePrint} disabled={!sf9Data || isLoading}>
            <Printer className="mr-2 h-4 w-4" /> Print Form
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center print:hidden">
          <p className="font-medium text-destructive">Failed to load the report card</p>
          <p className="text-sm text-muted-foreground mt-1">Re-select the student or school year and try again.</p>
        </div>
      ) : sf9Data && (
        <div className="rounded-lg border bg-white p-8 shadow-sm print:m-0 print:border-none print:shadow-none print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: a4 portrait; margin: 0.5in; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}} />
          
          <div className="mb-6 text-center text-black">
            <h2 className="text-xl font-bold uppercase">School Form 9 (SF 9) Learner Progress Report Card</h2>
            <p className="text-sm">Republic of the Philippines<br/>Department of Education</p>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 text-sm text-black">
            <div><strong>Name:</strong> {sf9Data.student?.lastName}, {sf9Data.student?.firstName}</div>
            <div><strong>LRN:</strong> {sf9Data.student?.lrn}</div>
            <div><strong>Age:</strong> - </div>
            <div><strong>Sex:</strong> {sf9Data.student?.sex}</div>
          </div>

          <table className="w-full border-collapse border border-black text-sm text-black mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-2 text-left">Learning Areas</th>
                <th colSpan={4} className="border border-black p-2 text-center">Quarter</th>
                <th rowSpan={2} className="border border-black p-2 text-center">Final Grade</th>
                <th rowSpan={2} className="border border-black p-2 text-center">Remarks</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center w-12">1</th>
                <th className="border border-black p-2 text-center w-12">2</th>
                <th className="border border-black p-2 text-center w-12">3</th>
                <th className="border border-black p-2 text-center w-12">4</th>
              </tr>
            </thead>
            <tbody>
              {sf9Data.grades.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-black p-4 text-center italic">No grades found for this school year.</td>
                </tr>
              )}
              {/* Group grades by subject... for demo we just list them */}
              {sf9Data.grades.map((g: any) => (
                <tr key={g.id}>
                  <td className="border border-black p-2">{g.subjectName}</td>
                  <td className="border border-black p-2 text-center">{g.term === 1 ? g.grade : ''}</td>
                  <td className="border border-black p-2 text-center">{g.term === 2 ? g.grade : ''}</td>
                  <td className="border border-black p-2 text-center">{g.term === 3 ? g.grade : ''}</td>
                  <td className="border border-black p-2 text-center">{g.term === 4 ? g.grade : ''}</td>
                  <td className="border border-black p-2 text-center"></td>
                  <td className="border border-black p-2 text-center"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
