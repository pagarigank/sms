'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search, Eye, AlertCircle } from 'lucide-react';
import {
  Badge,
  // Import ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusDot,
  statusToVariant,
  useToast,
} from '@sms/ui';

export default function StudentsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ firstName: '', middleName: '', lastName: '', birthDate: '', sex: '', lrn: '' });

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  const createStudent = useMutation({
    mutationFn: () =>
      apiClient.sis.createStudent({
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        birthDate: form.birthDate || undefined,
        sex: form.sex || undefined,
        lrn: form.lrn || undefined,
        status: 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowCreate(false);
      setForm({ firstName: '', middleName: '', lastName: '', birthDate: '', sex: '', lrn: '' });
      toast({ title: 'Student created', description: 'The student record has been created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['student-360', selectedStudent],
    queryFn: () => apiClient.sis.getStudent360(selectedStudent!),
    enabled: !!selectedStudent,
  });

  const filteredStudents = ((students?.data as any[]) ?? []).filter((s: any) =>
    `${s.firstName} ${s.lastName} ${s.lrn} ${s.studentNumber}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedStudent && profile) {
    return <StudentProfile360 profile={profile.data} onBack={() => setSelectedStudent(null)} />;
  }

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'studentNumber',
      header: 'Student #',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[hsl(var(--foreground))]">
          {row.original.studentNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'lastName',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">
          {row.original.lastName}, {row.original.firstName} {row.original.middleName || ''}
        </span>
      ),
    },
    {
      accessorKey: 'lrn',
      header: 'LRN',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-[hsl(var(--ink-200))]">{row.original.lrn || '—'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.status)}>
          <StatusDot />
          {row.original.status ? row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1) : 'Unknown'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSelectedStudent(row.original.id)}
            aria-label={`View ${row.original.firstName} ${row.original.lastName}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records and profiles"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={filteredStudents}
        isLoading={isLoading}
        toolbar={
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, LRN, or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search students"
              />
            </div>
          </div>
        }
        onRowClick={(row) => setSelectedStudent(row.id)}
        emptyMessage="No students found."
        emptyDescription="Add your first student to get started."
        emptyAction={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        }
      />

      {/* Create Student dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Create a new student record.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createStudent.mutate(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student-first-name">First Name *</Label>
                <Input
                  id="student-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="student-last-name">Last Name *</Label>
                <Input
                  id="student-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="student-middle-name">Middle Name</Label>
                <Input
                  id="student-middle-name"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="student-birth-date">Birth Date</Label>
                <Input
                  id="student-birth-date"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="student-lrn">LRN</Label>
                <Input
                  id="student-lrn"
                  value={form.lrn}
                  onChange={(e) => setForm({ ...form, lrn: e.target.value })}
                  maxLength={12}
                  placeholder="12 digits"
                  className="mt-1"
                />
                {form.lrn && !/^\d{12}$/.test(form.lrn) && (
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--status-danger-ink))' }}>
                    LRN must be exactly 12 digits
                  </p>
                )}
              </div>
            </div>
            {createStudent.isError && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg border"
                style={{
                  backgroundColor: 'hsl(var(--status-danger-surface))',
                  borderColor: 'hsl(var(--status-danger-ink) / 0.2)',
                  color: 'hsl(var(--status-danger-ink))',
                }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  {createStudent.error instanceof Error ? createStudent.error.message : 'Failed to create student'}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? 'Creating...' : 'Create Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="min-w-0 flex-1">
          <PageHeader title={`${student.lastName}, ${student.firstName}`} />
          <p className="text-muted-foreground">
            LRN: {student.lrn || 'N/A'} ·{' '}
            <span className="inline-flex translate-y-0.5">
              <Badge variant={statusToVariant(student.status)}>
                <StatusDot />
                {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Unknown'}
              </Badge>
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
                  {g.isPrimary && <Badge variant="accent">Primary</Badge>}
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
                  <Badge variant={statusToVariant(e.status)}>
                    <StatusDot />
                    {e.status}
                  </Badge>
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
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{
                    backgroundColor: 'hsl(var(--status-danger-surface))',
                    borderColor: 'hsl(var(--status-danger-ink) / 0.2)',
                  }}
                >
                  <div>
                    <p className="font-medium" style={{ color: 'hsl(var(--status-danger-ink))' }}>{h.holdType}</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--status-danger-ink))', opacity: 0.85 }}>{h.reason || '—'}</p>
                  </div>
                  <div className="text-sm" style={{ color: 'hsl(var(--status-danger-ink))', opacity: 0.75 }}>
                    {h.blocksSchedule ? 'Blocks Schedule' : ''} {h.blocksTor ? 'Blocks TOR' : ''}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
        {activeTab === 'health' && <p className="text-muted-foreground py-4">{healthRecords.length === 0 ? 'No health records' : `${healthRecords.length} records`}</p>}
        {activeTab === 'discipline' && <p className="text-muted-foreground py-4">{incidents.length === 0 ? 'No incidents recorded' : `${incidents.length} incidents`}</p>}
      </div>
    </div>
  );
}
