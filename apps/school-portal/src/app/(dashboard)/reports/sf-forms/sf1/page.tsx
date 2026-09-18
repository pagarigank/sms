'use client';

import * as React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button, Label, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTenantStore } from '@/lib/store';

export default function Sf1Page() {
  const [sectionId, setSectionId] = useState<string>('');

  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  // We should fetch sections to populate the dropdown.
  // Using a simplified query assuming we have listSections available.
  const { data: sectionsRes } = useQuery({
    queryKey: ['sections', currentTenantId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId,
  });
  const sections = (sectionsRes?.data as any[]) ?? [];

  const { data: sf1Data, isLoading, isError } = useQuery({
    queryKey: ['sf1', sectionId],
    queryFn: () => apiClient.reporting.getSf1(sectionId).then(r => r.data as any),
    enabled: !!sectionId,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Non-printable UI header */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center space-x-4">
          <Link href="/reports/sf-forms" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader title="SF1 - School Register" description="Select a section to generate the master list" />
        </div>

        <div className="flex items-end space-x-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex-1 max-w-xs">
            <Label htmlFor="section-select">Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger id="section-select" className="mt-1">
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.gradeLevel?.name || 'Unknown Grade'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePrint} disabled={!sf1Data || isLoading}>
            <Printer className="mr-2 h-4 w-4" /> Print Form
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center print:hidden">
          <p className="font-medium text-destructive">Failed to load the school register</p>
          <p className="text-sm text-muted-foreground mt-1">Reselect the section or try again later.</p>
        </div>
      ) : sf1Data && (
        <div className="rounded-lg border bg-white p-8 shadow-sm print:m-0 print:border-none print:shadow-none print:p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: legal landscape; margin: 0.5in; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}} />
          
          <div className="mb-6 text-center text-black">
            <h2 className="text-xl font-bold uppercase">School Form 1 (SF 1) School Register</h2>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-4 text-sm font-semibold text-black">
            <div>
              <span>School Name: </span><span className="border-b border-black inline-block w-48 font-normal">{sf1Data.section?.tenantName || 'School Name'}</span>
            </div>
            <div>
              <span>School Year: </span><span className="border-b border-black inline-block w-32 font-normal">{sf1Data.section?.schoolYearName || '2026-2027'}</span>
            </div>
            <div>
              <span>Grade Level: </span><span className="border-b border-black inline-block w-32 font-normal">{sf1Data.section?.gradeLevelName}</span>
            </div>
            <div>
              <span>Section: </span><span className="border-b border-black inline-block w-48 font-normal">{sf1Data.section?.name}</span>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-xs text-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 w-10">Lrn</th>
                <th className="border border-black p-1 text-left">Name (Last Name, First Name, Middle Name)</th>
                <th className="border border-black p-1 w-10">Sex</th>
                <th className="border border-black p-1 w-20">Birth Date</th>
                <th className="border border-black p-1">Mother Tongue</th>
                <th className="border border-black p-1">IP Group</th>
                <th className="border border-black p-1">Religion</th>
                <th className="border border-black p-1">Address</th>
                <th className="border border-black p-1">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {/* Males */}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={9} className="border border-black p-1">MALE</td>
              </tr>
              {sf1Data.students.males.map((student: any, i: number) => (
                <tr key={student.id}>
                  <td className="border border-black p-1 text-center">{student.lrn || '-'}</td>
                  <td className="border border-black p-1">{`${student.lastName}, ${student.firstName} ${student.middleName || ''}`}</td>
                  <td className="border border-black p-1 text-center">M</td>
                  <td className="border border-black p-1 text-center">{student.birthDate ? new Date(student.birthDate).toLocaleDateString() : '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.motherTongue || '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.ipGroup || '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.religion || '-'}</td>
                  <td className="border border-black p-1">{student.address || '-'}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
              <tr>
                <td className="border border-black p-1 font-bold text-right" colSpan={2}>TOTAL MALE</td>
                <td className="border border-black p-1 text-center font-bold">{sf1Data.students.males.length}</td>
                <td className="border border-black p-1" colSpan={6}></td>
              </tr>

              {/* Females */}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={9} className="border border-black p-1">FEMALE</td>
              </tr>
              {sf1Data.students.females.map((student: any, i: number) => (
                <tr key={student.id}>
                  <td className="border border-black p-1 text-center">{student.lrn || '-'}</td>
                  <td className="border border-black p-1">{`${student.lastName}, ${student.firstName} ${student.middleName || ''}`}</td>
                  <td className="border border-black p-1 text-center">F</td>
                  <td className="border border-black p-1 text-center">{student.birthDate ? new Date(student.birthDate).toLocaleDateString() : '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.motherTongue || '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.ipGroup || '-'}</td>
                  <td className="border border-black p-1 text-center">{student.customFields?.religion || '-'}</td>
                  <td className="border border-black p-1">{student.address || '-'}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))}
              <tr>
                <td className="border border-black p-1 font-bold text-right" colSpan={2}>TOTAL FEMALE</td>
                <td className="border border-black p-1 text-center font-bold">{sf1Data.students.females.length}</td>
                <td className="border border-black p-1" colSpan={6}></td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold text-right" colSpan={2}>COMBINED</td>
                <td className="border border-black p-1 text-center font-bold">{sf1Data.students.total}</td>
                <td className="border border-black p-1" colSpan={6}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
