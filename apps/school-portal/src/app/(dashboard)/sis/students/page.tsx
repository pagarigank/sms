'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search, Eye, Edit } from 'lucide-react';

export default function StudentsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  const { data: profile } = useQuery({
    queryKey: ['student-360', selectedStudent],
    queryFn: () => apiClient.sis.getStudent360(selectedStudent!),
    enabled: !!selectedStudent,
  });

  const filteredStudents = ((students?.data as any[]) ?? []).filter((s: any) =>
    `${s.firstName} ${s.lastName} ${s.lrn} ${s.studentNumber}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full" /></div>;

  if (selectedStudent && profile) {
    return <StudentProfile360 profile={profile.data} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records and profiles</p>
        </div>
        <button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" /> Add Student
        </button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search by name, LRN, or student number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm"
            />
          </div>
        </div>
        <div className="p-4">
          {filteredStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students found. Add your first student to get started.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Student #</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">LRN</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student: any) => (
                  <tr key={student.id} className="border-b last:border-0">
                    <td className="py-3 font-mono text-sm">{student.studentNumber || '—'}</td>
                    <td className="py-3 font-medium">{student.lastName}, {student.firstName} {student.middleName || ''}</td>
                    <td className="py-3 font-mono text-sm">{student.lrn || '—'}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{student.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedStudent(student.id)} className="p-1 hover:bg-muted rounded"><Eye className="h-4 w-4" /></button>
                        <button className="p-1 hover:bg-muted rounded"><Edit className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentProfile360({ profile, onBack }: { profile: any; onBack: () => void }) {
  const { student, guardians, enrollments, documents, holds, incidents, healthRecords } = profile;
  const [activeTab, setActiveTab] = useState('info');

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'guardians', label: `Guardians (${guardians.length})` },
    { id: 'enrollments', label: `Enrollments (${enrollments.length})` },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'holds', label: `Holds (${holds.length})` },
    { id: 'health', label: `Health (${healthRecords.length})` },
    { id: 'discipline', label: 'Discipline' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{student.lastName}, {student.firstName}</h1>
          <p className="text-muted-foreground">LRN: {student.lrn || 'N/A'} | Status: {student.status}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-sm text-muted-foreground">Full Name</p><p className="font-medium">{student.firstName} {student.middleName} {student.lastName} {student.suffix}</p></div>
            <div><p className="text-sm text-muted-foreground">Birth Date</p><p>{student.birthDate || '—'}</p></div>
            <div><p className="text-sm text-muted-foreground">Sex</p><p>{student.sex || '—'}</p></div>
            <div><p className="text-sm text-muted-foreground">Address</p><p>{student.address || '—'}</p></div>
            <div><p className="text-sm text-muted-foreground">Prior School</p><p>{student.priorSchool || '—'}</p></div>
            <div><p className="text-sm text-muted-foreground">Gov ID</p><p>{student.govIdType ? `${student.govIdType}: ${student.govIdNumber}` : '—'}</p></div>
          </div>
        )}
        {activeTab === 'guardians' && (
          guardians.length === 0 ? <p className="text-muted-foreground py-4">No guardians linked</p> : (
            <div className="space-y-2">
              {guardians.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><p className="font-medium">{g.guardianId}</p><p className="text-sm text-muted-foreground">{g.relationship}</p></div>
                  {g.isPrimary && <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">Primary</span>}
                </div>
              ))}
            </div>
          )
        )}
        {activeTab === 'enrollments' && (
          enrollments.length === 0 ? <p className="text-muted-foreground py-4">No enrollments</p> : (
            <div className="space-y-2">
              {enrollments.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><p className="font-medium">School Year: {e.schoolYearId}</p><p className="text-sm text-muted-foreground">Section: {e.sectionId || '—'}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'enrolled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          )
        )}
        {activeTab === 'documents' && <p className="text-muted-foreground py-4">{documents.length === 0 ? 'No documents uploaded' : `${documents.length} documents`}</p>}
        {activeTab === 'holds' && (
          holds.length === 0 ? <p className="text-muted-foreground py-4">No active holds</p> : (
            <div className="space-y-2">
              {holds.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                  <div><p className="font-medium text-red-800">{h.holdType}</p><p className="text-sm">{h.reason || '—'}</p></div>
                  <div className="text-sm text-muted-foreground">{h.blocksSchedule ? 'Blocks Schedule' : ''} {h.blocksTor ? 'Blocks TOR' : ''}</div>
                </div>
              ))}
            </div>
          )
        )}
        {activeTab === 'health' && <p className="text-muted-foreground py-4">{healthRecords.length === 0 ? 'No health records' : `${healthRecords.length} records`}</p>}
        {activeTab === 'discipline' && <p className="text-muted-foreground py-4">No incidents recorded</p>}
      </div>
    </div>
  );
}
