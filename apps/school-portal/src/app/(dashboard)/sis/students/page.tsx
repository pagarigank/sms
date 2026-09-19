'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { UserPlus, Search, Eye, AlertCircle, Edit2 } from 'lucide-react';
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
  const { 
    student, 
    guardians, 
    enrollments, 
    extendedDocuments,
    holds, 
    incidents, 
    healthRecords,
    immunizations,
    medications,
    carePlans,
    allergies,
    screenings,
    ieps,
    plans504,
    evaluations,
    accommodations,
    disciplineIncidents,
    interventions,
    selAssessments,
    learningProfiles,
    goals,
    familyContexts,
    communicationLogs,
  } = profile;
  const [activeTab, setActiveTab] = useState('info');
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    middleName: student.middleName || '',
    suffix: student.suffix || '',
    birthDate: student.birthDate ? String(student.birthDate).substring(0, 10) : '',
    sex: student.sex || '',
    lrn: student.lrn || '',
    address: student.address || '',
    priorSchool: student.priorSchool || '',
    govIdType: student.govIdType || '',
    govIdNumber: student.govIdNumber || '',
    healthFlags: student.healthFlags || '',
    iepNotes: student.iepNotes || '',
  });
  
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenantStore();

  const updateStudent = useMutation({
    mutationFn: () => apiClient.sis.updateStudent(student.id, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', currentTenantId] });
      queryClient.invalidateQueries({ queryKey: ['student-profile', student.id] });
      setShowEdit(false);
    },
  });

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'guardians', label: `Guardians (${guardians.length})` },
    { id: 'enrollments', label: `Enrollments (${enrollments.length})` },
    { id: 'documents', label: `Documents (${extendedDocuments.length})` },
    { id: 'holds', label: `Holds (${holds.length})` },
    { id: 'health', label: `Health (${healthRecords.length})` },
    { id: 'immunizations', label: `Immunizations (${immunizations.length})` },
    { id: 'medications', label: `Medications (${medications.length})` },
    { id: 'carePlans', label: `Care Plans (${carePlans.length})` },
    { id: 'allergies', label: `Allergies (${allergies.length})` },
    { id: 'screenings', label: `Screenings (${screenings.length})` },
    { id: 'ieps', label: `IEPs (${ieps.length})` },
    { id: 'plans504', label: `504 Plans (${plans504.length})` },
    { id: 'evaluations', label: `Evaluations (${evaluations.length})` },
    { id: 'accommodations', label: `Accommodations (${accommodations.length})` },
    { id: 'discipline', label: `Discipline (${disciplineIncidents.length})` },
    { id: 'interventions', label: `Interventions (${interventions.length})` },
    { id: 'selAssessments', label: `SEL (${selAssessments.length})` },
    { id: 'learningProfile', label: `Learning Profile (${learningProfiles.length})` },
    { id: 'goals', label: `Goals (${goals.length})` },
    { id: 'familyContext', label: `Family Context (${familyContexts.length})` },
    { id: 'communicationLogs', label: `Comm Logs (${communicationLogs.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader title={`${student.lastName}, ${student.firstName}`} />
          <div className="text-muted-foreground">
            LRN: {student.lrn || 'N/A'} ·{' '}
            <span className="inline-flex translate-y-0.5">
              <Badge variant={statusToVariant(student.status)}>
                <StatusDot />
                {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Unknown'}
              </Badge>
            </span>
          </div>
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
                      <div><p className="font-medium">{g.guardianName || g.guardianId}</p><p className="text-sm text-muted-foreground">{g.relationship}</p></div>
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
                      <div><p className="font-medium">School Year: {e.schoolYearName}</p><p className="text-sm text-muted-foreground">Section: {e.sectionName}</p></div>
                      <Badge variant={statusToVariant(e.status)}>
                        <StatusDot />
                        {e.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            )}
        {activeTab === 'documents' && <p className="text-muted-foreground py-4">{extendedDocuments.length === 0 ? 'No documents uploaded' : `${extendedDocuments.length} documents`}</p>}
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
        {activeTab === 'discipline' && (
            disciplineIncidents.length === 0 ? <p className="text-muted-foreground py-4">No discipline incidents</p> : (
              <div className="space-y-2">
                {disciplineIncidents.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{d.incidentType || 'Incident'}</p>
                      <p className="text-sm text-muted-foreground">{new Date(d.incidentDate).toLocaleDateString()} · {d.location}</p>
                    </div>
                    <Badge variant={statusToVariant(d.status)}>{d.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'immunizations' && (
            immunizations.length === 0 ? <p className="text-muted-foreground py-4">No immunizations recorded</p> : (
              <div className="space-y-2">
                {immunizations.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{i.vaccineName}</p>
                      <p className="text-sm text-muted-foreground">{new Date(i.administeredDate).toLocaleDateString()} · Dose: {i.doseNumber || '—'} · {i.status}</p>
                    </div>
                    <Badge variant={i.nextDueDate ? 'warning' : 'success'}>{i.nextDueDate ? 'Due: ' + new Date(i.nextDueDate).toLocaleDateString() : 'Complete'}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'medications' && (
            medications.length === 0 ? <p className="text-muted-foreground py-4">No medications</p> : (
              <div className="space-y-2">
                {medications.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{m.medicationName}</p>
                      <p className="text-sm text-muted-foreground">{m.dosage} · {m.frequency} · {m.status}</p>
                    </div>
                    <Badge variant={statusToVariant(m.status)}>{m.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'carePlans' && (
            carePlans.length === 0 ? <p className="text-muted-foreground py-4">No care plans</p> : (
              <div className="space-y-2">
                {carePlans.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-muted-foreground">{c.condition} · {c.status}</p>
                    </div>
                    <Badge variant={statusToVariant(c.status)}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'allergies' && (
            allergies.length === 0 ? <p className="text-muted-foreground py-4">No allergies recorded</p> : (
              <div className="space-y-2">
                {allergies.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{a.allergen}</p>
                      <p className="text-sm text-muted-foreground">Severity: {a.severity} · Reaction: {a.reaction || '—'}</p>
                    </div>
                    <Badge variant={a.severity === 'severe' ? 'destructive' : a.severity === 'moderate' ? 'warning' : 'success'}>
                      {a.severity || 'Mild'}
                    </Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'screenings' && (
            screenings.length === 0 ? <p className="text-muted-foreground py-4">No screenings recorded</p> : (
              <div className="space-y-2">
                {screenings.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{s.screeningName || s.screeningType}</p>
                      <p className="text-sm text-muted-foreground">{new Date(s.screeningDate).toLocaleDateString()} · Result: {s.result || '—'} · {s.status}</p>
                    </div>
                    <Badge variant={s.followUpRequired ? 'warning' : 'success'}>{s.followUpRequired ? 'Follow-up Required' : 'Complete'}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'ieps' && (
            ieps.length === 0 ? <p className="text-muted-foreground py-4">No IEPs</p> : (
              <div className="space-y-2">
                {ieps.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{i.iepNumber}</p>
                      <p className="text-sm text-muted-foreground">{new Date(i.startDate).toLocaleDateString()} - {new Date(i.endDate).toLocaleDateString()} · {i.primaryDisability}</p>
                    </div>
                    <Badge variant={statusToVariant(i.status)}>{i.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'plans504' && (
            plans504.length === 0 ? <p className="text-muted-foreground py-4">No 504 Plans</p> : (
              <div className="space-y-2">
                {plans504.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{p.planNumber}</p>
                      <p className="text-sm text-muted-foreground">{new Date(p.startDate).toLocaleDateString()} - {p.disability}</p>
                    </div>
                    <Badge variant={statusToVariant(p.status)}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'evaluations' && (
            evaluations.length === 0 ? <p className="text-muted-foreground py-4">No evaluations</p> : (
              <div className="space-y-2">
                {evaluations.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{e.evaluationName || e.evaluationType}</p>
                      <p className="text-sm text-muted-foreground">{new Date(e.evaluationDate).toLocaleDateString()} · {e.status}</p>
                    </div>
                    <Badge variant={statusToVariant(e.status)}>{e.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'accommodations' && (
            accommodations.length === 0 ? <p className="text-muted-foreground py-4">No accommodations</p> : (
              <div className="space-y-2">
                {accommodations.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{a.category}: {a.description}</p>
                      <p className="text-sm text-muted-foreground">{a.setting} · {a.status}</p>
                    </div>
                    <Badge variant={statusToVariant(a.status)}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'interventions' && (
            interventions.length === 0 ? <p className="text-muted-foreground py-4">No interventions</p> : (
              <div className="space-y-2">
                {interventions.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{i.interventionName}</p>
                      <p className="text-sm text-muted-foreground">Tier {i.tier} · {i.focusArea} · {i.status}</p>
                    </div>
                    <Badge variant={statusToVariant(i.status)}>{i.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'selAssessments' && (
            selAssessments.length === 0 ? <p className="text-muted-foreground py-4">No SEL assessments</p> : (
              <div className="space-y-2">
                {selAssessments.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{s.assessmentName}</p>
                      <p className="text-sm text-muted-foreground">{new Date(s.assessmentDate).toLocaleDateString()} · {s.status}</p>
                    </div>
                    <Badge variant={statusToVariant(s.status)}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'learningProfile' && (
            learningProfiles.length === 0 ? <p className="text-muted-foreground py-4">No learning profile</p> : (
              <div className="space-y-2">
                {learningProfiles.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Primary Style: {l.primaryLearningStyle || '—'}</p>
                      <p className="text-sm text-muted-foreground">Assessed: {l.assessmentDate ? new Date(l.assessmentDate).toLocaleDateString() : '—'} · Next: {l.nextReassessmentDate ? new Date(l.nextReassessmentDate).toLocaleDateString() : '—'}</p>
                    </div>
                    <Badge variant="outline">View Details</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'goals' && (
            goals.length === 0 ? <p className="text-muted-foreground py-4">No goals</p> : (
              <div className="space-y-2">
                {goals.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-sm text-muted-foreground">{g.category} · Target: {g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '—'} · {g.status}</p>
                    </div>
                    <Badge variant={statusToVariant(g.status)}>{g.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'familyContext' && (
            familyContexts.length === 0 ? <p className="text-muted-foreground py-4">No family context</p> : (
              <div className="space-y-2">
                {familyContexts.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Household: {f.householdType || '—'}</p>
                      <p className="text-sm text-muted-foreground">Languages: {f.languagesSpoken?.map((l: any) => l.language).join(', ') || '—'}</p>
                    </div>
                    <Badge variant="outline">View Details</Badge>
                  </div>
                ))}
              </div>
            )
          )}
        {activeTab === 'communicationLogs' && (
            communicationLogs.length === 0 ? <p className="text-muted-foreground py-4">No communication logs</p> : (
              <div className="space-y-2">
                {communicationLogs.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{c.subject || c.communicationType}</p>
                      <p className="text-sm text-muted-foreground">{new Date(c.communicationDate).toLocaleDateString()} · {c.contactName} ({c.contactRelationship}) · {c.direction}</p>
                    </div>
                    <Badge variant={statusToVariant(c.status)}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )
          )}

      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information. All changes are saved immediately.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); updateStudent.mutate(); }}
            className="space-y-6"
          >
            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-first-name">First Name *</Label>
                  <Input id="edit-first-name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="edit-last-name">Last Name *</Label>
                  <Input id="edit-last-name" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="mt-1" required />
                </div>
                <div>
                  <Label htmlFor="edit-middle-name">Middle Name</Label>
                  <Input id="edit-middle-name" value={editForm.middleName} onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-suffix">Suffix</Label>
                  <Input id="edit-suffix" value={editForm.suffix} onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })} placeholder="Jr., III, etc." className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-birth-date">Birth Date</Label>
                  <Input id="edit-birth-date" type="date" value={editForm.birthDate} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Sex</Label>
                  <Select value={editForm.sex} onValueChange={(v) => setEditForm({ ...editForm, sex: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Academic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-lrn">LRN (Learner Ref. No.)</Label>
                  <Input id="edit-lrn" value={editForm.lrn} onChange={(e) => setEditForm({ ...editForm, lrn: e.target.value })} maxLength={12} placeholder="12 digits" className="mt-1" />
                  {editForm.lrn && !/^\d{12}$/.test(editForm.lrn) && (
                    <p className="text-xs mt-1 text-destructive">LRN must be exactly 12 digits</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-prior-school">Prior School</Label>
                  <Input id="edit-prior-school" value={editForm.priorSchool} onChange={(e) => setEditForm({ ...editForm, priorSchool: e.target.value })} placeholder="Previous school name" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Government Identification */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Government Identification</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ID Type</Label>
                  <Select value={editForm.govIdType} onValueChange={(v) => setEditForm({ ...editForm, govIdType: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select ID type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSA Birth Certificate">PSA Birth Certificate</SelectItem>
                      <SelectItem value="PhilSys ID">PhilSys ID (National ID)</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="UMID">UMID</SelectItem>
                      <SelectItem value="Driver's License">Driver's License</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-gov-id-number">ID Number</Label>
                  <Input id="edit-gov-id-number" value={editForm.govIdNumber} onChange={(e) => setEditForm({ ...editForm, govIdNumber: e.target.value })} placeholder="Government ID number" className="mt-1" />
                </div>
              </div>
            </div>

            {/* Health & Special Needs */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Health & Special Needs</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="edit-health-flags">Health Flags / Conditions</Label>
                  <Input id="edit-health-flags" value={editForm.healthFlags} onChange={(e) => setEditForm({ ...editForm, healthFlags: e.target.value })} placeholder="e.g., Asthma, Diabetes, Allergy to penicillin" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="edit-iep-notes">IEP / Special Education Notes</Label>
                  <Input id="edit-iep-notes" value={editForm.iepNotes} onChange={(e) => setEditForm({ ...editForm, iepNotes: e.target.value })} placeholder="e.g., Student has an IEP for dyslexia" className="mt-1" />
                </div>
              </div>
            </div>

            {updateStudent.isError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--status-danger-surface))', borderColor: 'hsl(var(--status-danger-ink) / 0.2)', color: 'hsl(var(--status-danger-ink))' }}>
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{updateStudent.error instanceof Error ? updateStudent.error.message : 'Failed to update student'}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={updateStudent.isPending}>
                {updateStudent.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
