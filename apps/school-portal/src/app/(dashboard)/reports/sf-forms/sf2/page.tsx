'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, Input } from '@sms/ui';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTenantStore } from '@/lib/store';

export default function Sf2Page() {
  const [sectionId, setSectionId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const { data: sectionsRes } = useQuery({
    queryKey: ['sections', currentTenantId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const sections = (sectionsRes?.data as any[]) ?? [];

  const { data: sf2Data, isLoading } = useQuery({
    queryKey: ['sf2', sectionId, month, year],
    queryFn: () => apiClient.reporting.getSf2(sectionId, { month, year }).then(r => r.data as any),
    enabled: !!sectionId && !!month && !!year,
  });

  const handlePrint = () => {
    window.print();
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: 25 }, (_, i) => i + 1); // DepEd SF2 usually shows 25 columns for weekdays

  return (
    <div className="space-y-6">
      {/* Non-printable UI header */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center space-x-4">
          <Link href="/reports/sf-forms" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SF2 - Daily Attendance</h1>
            <p className="text-muted-foreground">Select a section and month to generate attendance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <Label htmlFor="section-select">Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger id="section-select" className="mt-1">
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.gradeLevel?.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-32">
            <Label htmlFor="month-select">Month</Label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger id="month-select" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-24">
            <Label htmlFor="year-input">Year</Label>
            <Input id="year-input" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="mt-1" />
          </div>

          <Button onClick={handlePrint} disabled={!sf2Data || isLoading}>
            <Printer className="mr-2 h-4 w-4" /> Print Form
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      {sf2Data && (
        <div className="rounded-lg border bg-white p-8 shadow-sm print:m-0 print:border-none print:shadow-none print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: legal landscape; margin: 0.5in; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}} />
          
          <div className="mb-6 text-center text-black">
            <h2 className="text-xl font-bold uppercase">School Form 2 (SF 2) Daily Attendance Report of Learners</h2>
          </div>

          <table className="w-full border-collapse border border-black text-[10px] text-black">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-1 w-48">Name (Last Name, First Name, Middle Name)</th>
                <th colSpan={25} className="border border-black p-1">Dates</th>
                <th colSpan={2} className="border border-black p-1">Total for the Month</th>
              </tr>
              <tr className="bg-gray-100">
                {daysArray.map(d => (
                  <th key={d} className="border border-black p-0.5 w-4">{d}</th>
                ))}
                <th className="border border-black p-0.5 w-10">Absent</th>
                <th className="border border-black p-0.5 w-10">Tardy</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={28} className="border border-black p-1">MALE</td>
              </tr>
              {sf2Data.students.males.map((student: any) => (
                <tr key={student.id}>
                  <td className="border border-black p-1">{`${student.lastName}, ${student.firstName}`}</td>
                  {daysArray.map(d => (
                    <td key={d} className="border border-black p-0.5 text-center"></td>
                  ))}
                  <td className="border border-black p-0.5"></td>
                  <td className="border border-black p-0.5"></td>
                </tr>
              ))}
              
              <tr className="bg-gray-200 font-bold">
                <td colSpan={28} className="border border-black p-1">FEMALE</td>
              </tr>
              {sf2Data.students.females.map((student: any) => (
                <tr key={student.id}>
                  <td className="border border-black p-1">{`${student.lastName}, ${student.firstName}`}</td>
                  {daysArray.map(d => (
                    <td key={d} className="border border-black p-0.5 text-center"></td>
                  ))}
                  <td className="border border-black p-0.5"></td>
                  <td className="border border-black p-0.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
