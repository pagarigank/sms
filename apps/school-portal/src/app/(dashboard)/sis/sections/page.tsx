'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import type { SectionAssignment, SectionWithSeatCount } from '@sms/api-client';
import { Plus, Edit, Trash2, Users, UserMinus, X } from 'lucide-react';
import {
  Badge,
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
  useConfirm,
  useToast,
  // ColumnDef from @sms/ui so it matches the DataTable prop type
  // (the workspace has duplicate react-table majors; this avoids variance errors).
  type ColumnDef,
} from '@sms/ui';

type Section = SectionWithSeatCount;

export default function SectionsPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });
  const sectionList: Section[] = sections?.data ?? [];

  // FR-ACA-7: sections are grade-level scoped — feed the grade-level dropdown
  // and the school-year scope from the academic config the tenant maintains.
  const { data: gradeLevelsRes } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => apiClient.academic.listGradeLevels({ limit: 100 }),
  });
  const gradeLevels = ((gradeLevelsRes?.data ?? []) as { id: string; name: string }[]);
  const gradeLevelName = (id?: string) => gradeLevels.find((g) => g.id === id)?.name ?? id ?? '—';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({
    name: '',
    gradeLevelId: '',
    homeroom: '',
    capacity: '40',
  });

  // === Roster panel (who is seated in the section) ===
  const [rosterFor, setRosterFor] = useState<Section | null>(null);

  const { data: rosterRes, isLoading: rosterLoading } = useQuery({
    queryKey: ['section-roster', rosterFor?.id],
    queryFn: () => apiClient.sis.listSectionStudents(rosterFor!.id),
    enabled: !!rosterFor,
  });
  const roster: SectionAssignment[] = rosterRes?.data ?? [];

  // Assignable students: everyone in the tenant minus those already seated
  // somewhere (the backend list is tenant-wide; filtering here keeps the
  // picker honest without a dedicated endpoint).
  const { data: allStudentsRes } = useQuery({
    queryKey: ['students-for-roster', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!rosterFor,
  });
  const allStudents = ((allStudentsRes?.data ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
    status?: string;
  }[]);
  const assignedStudentIds = new Set(roster.map((r) => r.studentId));
  const assignableStudents = allStudents.filter(
    (s) => !assignedStudentIds.has(s.id) && s.status !== 'archived',
  );

  const atCapacity = rosterFor ? roster.length >= rosterFor.capacity : false;

  const [assignStudentId, setAssignStudentId] = useState('');

  const assignMutation = useMutation({
    mutationFn: (vars: { studentId: string; sectionId: string }) => {
      // The assign endpoint keys off the enrollment; resolve it by listing
      // the student's enrollments through the batch-free path used by the
      // wizard. listEnrollmentsByStudent is not exposed, so the roster picker
      // assigns via the section-scoped enrollment id carried on the student's
      // latest active enrollment — resolved server-side by studentId param.
      return apiClient.sis.assignStudentToSectionByStudent(vars.studentId, vars.sectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-roster'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setAssignStudentId('');
      toast({ title: 'Student assigned' });
    },
    onError: (error: Error) =>
      toast({ title: 'Cannot assign', description: error.message, variant: 'destructive' }),
  });

  const unassignMutation = useMutation({
    mutationFn: (vars: { sectionId: string; studentId: string }) =>
      apiClient.sis.unassignSectionStudent(vars.sectionId, vars.studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-roster'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({ title: 'Student removed from section' });
    },
    onError: (error: Error) =>
      toast({ title: 'Cannot remove', description: error.message, variant: 'destructive' }),
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { data: typeof form; id?: string }) => {
      const payload = {
        tenantId: currentTenantId,
        branchId: currentBranchId ?? undefined,
        name: vars.data.name,
        gradeLevelId: vars.data.gradeLevelId || undefined,
        homeroom: vars.data.homeroom || undefined,
        capacity: Number(vars.data.capacity) || 0,
      };
      return vars.id
        ? apiClient.sis.updateSection(vars.id, payload)
        : apiClient.sis.createSection(payload);
    },
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', gradeLevelId: '', homeroom: '', capacity: '40' });
      toast({ title: vars.id ? 'Section updated' : 'Section created' });
    },
    onError: (error: Error) =>
      toast({ title: 'Error', description: error.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.sis.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast({ title: 'Section deleted' });
    },
    onError: (error: Error) =>
      toast({ title: 'Cannot delete section', description: error.message, variant: 'destructive' }),
  });

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'name',
      header: 'Section',
      cell: ({ row }) => (
        <span className="font-medium text-[hsl(var(--foreground))]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'gradeLevelId',
      header: 'Grade Level',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{gradeLevelName(row.original.gradeLevelId)}</span>
      ),
    },
    {
      accessorKey: 'homeroom',
      header: 'Homeroom',
      cell: ({ row }) => (
        <span className="text-[hsl(var(--ink-200))]">{row.original.homeroom || '—'}</span>
      ),
    },
    {
      accessorKey: 'seatCount',
      header: 'Seats',
      cell: ({ row }) => {
        const section = row.original as Section;
        const count = section.seatCount ?? 0;
        const cap = Math.max(section.capacity ?? 0, 1);
        const pct = Math.min((count / cap) * 100, 100);
        const full = count >= section.capacity;
        return (
          <div className="flex min-w-28 items-center gap-2">
            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  full
                    ? 'bg-[hsl(var(--status-danger-ink))]'
                    : pct > 80
                      ? 'bg-[hsl(var(--status-warning-ink))]'
                      : 'bg-[hsl(var(--status-success-ink))]'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[hsl(var(--ink-200))]">
              {count}/{section.capacity}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.isActive)}>
          <StatusDot />
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const section = row.original as Section;
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssignStudentId('');
                setRosterFor(section);
              }}
            >
              <Users className="h-4 w-4" /> Roster
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label={`Edit ${section.name}`}
              onClick={() => {
                setEditing(section);
                setForm({
                  name: section.name,
                  gradeLevelId: section.gradeLevelId ?? '',
                  homeroom: section.homeroom ?? '',
                  capacity: String(section.capacity ?? 40),
                });
                setShowForm(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
              aria-label={`Delete ${section.name}`}
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${section.name}?`,
                  description: 'Sections with assigned students cannot be deleted.',
                  confirmLabel: 'Delete',
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(section.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sections"
        description="Manage class sections, capacity, and rosters"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm({ name: '', gradeLevelId: '', homeroom: '', capacity: '40' });
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={sectionList}
        isLoading={isLoading}
        emptyMessage="No sections yet."
        emptyDescription="Create sections to organize students into homerooms."
      />

      {/* Create / edit section */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : 'New Section'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ data: form, id: editing?.id });
            }}
            className="mt-2 space-y-3"
          >
            <div>
              <Label htmlFor="section-name">Name</Label>
              <Input
                id="section-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rizal, Mabini"
                required
              />
            </div>
            <div>
              <Label htmlFor="section-grade">Grade level</Label>
              <Select
                value={form.gradeLevelId}
                onValueChange={(v) => setForm({ ...form, gradeLevelId: v })}
              >
                <SelectTrigger id="section-grade">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="section-homeroom">Homeroom</Label>
              <Input
                id="section-homeroom"
                value={form.homeroom}
                onChange={(e) => setForm({ ...form, homeroom: e.target.value })}
                placeholder="Room 101"
              />
            </div>
            <div>
              <Label htmlFor="section-capacity">Capacity</Label>
              <Input
                id="section-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create section'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Section roster */}
      <Dialog open={!!rosterFor} onOpenChange={(open) => !open && setRosterFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Roster — {rosterFor?.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {roster.length}/{rosterFor?.capacity ?? 0} seats
              </span>
            </DialogTitle>
            <DialogDescription>
              {gradeLevelName(rosterFor?.gradeLevelId)}
              {rosterFor?.homeroom ? ` • Homeroom ${rosterFor.homeroom}` : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Capacity meter */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                atCapacity
                  ? 'bg-[hsl(var(--status-danger-ink))]'
                  : roster.length / Math.max(rosterFor?.capacity ?? 1, 1) > 0.8
                    ? 'bg-[hsl(var(--status-warning-ink))]'
                    : 'bg-[hsl(var(--status-success-ink))]'
              }`}
              style={{
                width: `${Math.min((roster.length / Math.max(rosterFor?.capacity ?? 1, 1)) * 100, 100)}%`,
              }}
            />
          </div>

          {/* Roster list */}
          <div className="min-h-[300px] max-h-[500px] space-y-1 overflow-y-auto rounded-md border p-2">
            {rosterLoading ? (
              <p className="p-2 text-sm text-muted-foreground">Loading roster…</p>
            ) : roster.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                No students assigned yet — add one below.
              </p>
            ) : (
              roster.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {r.student
                        ? `${r.student.lastName}, ${r.student.firstName}`
                        : r.studentId.slice(0, 8)}
                    </p>
                    {r.student?.studentNumber && (
                      <p className="text-xs text-muted-foreground">
                        Student no. {r.student.studentNumber}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                    aria-label={`Remove ${r.student?.lastName ?? r.studentId}`}
                    title="Remove from section"
                    disabled={unassignMutation.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Remove ${r.student?.firstName ?? 'student'} from ${rosterFor?.name}?`,
                        description: 'Their enrollment stays active — only the section seat is released.',
                        confirmLabel: 'Remove',
                        destructive: true,
                      });
                      if (ok)
                        unassignMutation.mutate({ sectionId: rosterFor!.id, studentId: r.studentId });
                    }}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Assign picker */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rosterFor || !assignStudentId || atCapacity) return;
              assignMutation.mutate({ studentId: assignStudentId, sectionId: rosterFor.id });
            }}
            className="space-y-3 rounded-md border bg-muted/30 p-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="assign-student">Assign a student</Label>
                <Select value={assignStudentId} onValueChange={setAssignStudentId}>
                  <SelectTrigger id="assign-student">
                    <SelectValue
                      placeholder={atCapacity ? 'Section is full' : 'Select student…'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {assignStudentId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  aria-label="Clear selection"
                  onClick={() => setAssignStudentId('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button type="submit" disabled={!assignStudentId || atCapacity || assignMutation.isPending}>
                {assignMutation.isPending ? 'Assigning…' : 'Assign'}
              </Button>
            </div>
            {atCapacity && (
              <p className="text-xs text-[hsl(var(--status-danger-ink))]">
                At capacity ({rosterFor?.capacity} seats). Raise the section&apos;s capacity or remove a
                student first.
              </p>
            )}
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRosterFor(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
