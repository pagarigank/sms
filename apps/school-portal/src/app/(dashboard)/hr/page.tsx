'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Users, Clock, BookOpen, Plus, Search, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  statusToVariant,
  StatusDot,
  useConfirm,
  useToast,
} from '@sms/ui';

/** Backend endpoints may return a bare array, an ApiResponse wrapper, or a paginated envelope. */
function listOf<T>(res: unknown): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  const r = res as any;
  if (Array.isArray(r.data)) return r.data as T[];
  if (Array.isArray(r.data?.data)) return r.data.data as T[];
  return [];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  contactNumber?: string;
  position?: string;
  department?: string;
  employmentStatus?: string;
  hireDate?: string;
  isActive: boolean;
}

interface DtrRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  timeIn?: string;
  timeOut?: string;
  source?: string;
}

interface TeachingLoad {
  id: string;
  employeeId: string;
  classOfferingId: string;
  termId: string;
  isSubstitute: boolean;
}

export default function HrPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'employees' | 'dtr' | 'loads'>('employees');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', contactNumber: '',
    position: '', department: '', employmentStatus: 'permanent', hireDate: '',
  });
  const [dtrForm, setDtrForm] = useState({ employeeId: '', attendanceDate: new Date().toISOString().split('T')[0], timeIn: '', timeOut: '' });
  const [loadForm, setLoadForm] = useState({ employeeId: '', classOfferingId: '', termId: '' });

  const { data: employeesRes, isLoading, error } = useQuery({
    queryKey: ['employees', currentTenantId, currentBranchId],
    queryFn: () => apiClient.hr.getEmployees({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId,
  });

  const { data: dtrRes, isLoading: dtrLoading } = useQuery({
    queryKey: ['dtr-records', currentTenantId],
    queryFn: () => apiClient.hr.getDtrRecords({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && activeTab === 'dtr',
  });

  const { data: loadsRes, isLoading: loadsLoading } = useQuery({
    queryKey: ['teaching-loads', currentTenantId],
    queryFn: () => apiClient.hr.getTeachingLoads({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && activeTab === 'loads',
  });

  const { data: offeringsRes } = useQuery({
    queryKey: ['class-offerings-for-loads', currentTenantId],
    queryFn: () => apiClient.scheduling.listOfferings({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && activeTab === 'loads',
  });

  const { data: syRes } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId && activeTab === 'loads',
  });

  const activeSyId = listOf<{ id: string; status: string }>(syRes).find((sy) => sy.status === 'active')?.id;
  const { data: termsRes } = useQuery({
    queryKey: ['terms-for-loads', activeSyId],
    queryFn: () => apiClient.academic.listTerms(activeSyId!),
    enabled: !!activeSyId && activeTab === 'loads',
  });

  const employees = listOf<Employee>(employeesRes);
  const filteredEmployees = employees.filter((e) =>
    `${e.firstName} ${e.lastName} ${e.position ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const dtrRecords = listOf<DtrRecord>(dtrRes);
  const loads = listOf<TeachingLoad>(loadsRes);
  const offerings = listOf<{ id: string; subjectId: string; sectionId?: string }>(offeringsRes);
  const terms = listOf<{ id: string; name: string }>(termsRes);
  const employeeName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.lastName}, ${e.firstName}` : `Employee ${id.slice(0, 8)}`;
  };

  const createEmployeeMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.hr.createEmployee({
        ...data,
        tenantId: currentTenantId,
        branchId: currentBranchId ?? undefined,
        hireDate: data.hireDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', contactNumber: '', position: '', department: '', employmentStatus: 'permanent', hireDate: '' });
      toast({ title: 'Employee added' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const recordDtrMutation = useMutation({
    mutationFn: (data: typeof dtrForm) =>
      apiClient.hr.recordDtr({
        tenantId: currentTenantId,
        employeeId: data.employeeId,
        attendanceDate: data.attendanceDate,
        timeIn: data.timeIn || null,
        timeOut: data.timeOut || null,
        source: 'manual',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dtr-records'] });
      toast({ title: 'DTR recorded' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const assignLoadMutation = useMutation({
    mutationFn: (data: typeof loadForm) =>
      apiClient.hr.assignTeachingLoad({
        tenantId: currentTenantId,
        employeeId: data.employeeId,
        classOfferingId: data.classOfferingId,
        termId: data.termId,
        schoolYearId: activeSyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      setLoadForm({ employeeId: '', classOfferingId: '', termId: '' });
      toast({ title: 'Teaching load assigned' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const removeLoadMutation = useMutation({
    mutationFn: (id: string) => apiClient.hr.removeTeachingLoad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-loads'] });
      toast({ title: 'Teaching load removed' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const tabs = [
    { id: 'employees' as const, label: 'Employees', icon: Users, count: employees.length },
    { id: 'dtr' as const, label: 'Time Records', icon: Clock, count: undefined },
    { id: 'loads' as const, label: 'Teaching Loads', icon: BookOpen, count: undefined },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="HR-Lite"
          description="Employee records, time tracking, and teaching loads"
          actions={
            activeTab === 'employees' && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            )
          }
        />

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" /> Failed to load employees: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex h-9 w-full max-w-sm rounded-md border px-3 py-1 text-sm" />
                </div>
                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="divide-y">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        {employees.length === 0 ? 'No employees yet. Click "Add Employee" to create one.' : 'No employees match your search.'}
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">{emp.firstName?.[0]}{emp.lastName?.[0]}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{emp.lastName}, {emp.firstName}</p>
                              <p className="text-xs text-muted-foreground">{emp.position || 'No position'} • {emp.department || 'No department'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={statusToVariant(emp.isActive)}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {emp.hireDate && (
                              <p className="text-xs text-muted-foreground mt-1">Hired: {new Date(emp.hireDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DTR Tab */}
            {activeTab === 'dtr' && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold mb-3">Record Time In / Out</h3>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_120px_120px_auto]">
                    <div>
                      <Label>Employee</Label>
                      <select
                        value={dtrForm.employeeId}
                        onChange={(e) => setDtrForm({ ...dtrForm, employeeId: e.target.value })}
                        className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">Select employee…</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input type="date" className="mt-1" value={dtrForm.attendanceDate} onChange={(e) => setDtrForm({ ...dtrForm, attendanceDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Time In</Label>
                      <Input type="time" className="mt-1" value={dtrForm.timeIn} onChange={(e) => setDtrForm({ ...dtrForm, timeIn: e.target.value })} />
                    </div>
                    <div>
                      <Label>Time Out</Label>
                      <Input type="time" className="mt-1" value={dtrForm.timeOut} onChange={(e) => setDtrForm({ ...dtrForm, timeOut: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => recordDtrMutation.mutate(dtrForm)}
                        disabled={!dtrForm.employeeId || recordDtrMutation.isPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Saving the same employee + date again updates the entry (upsert).</p>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="divide-y">
                    {dtrLoading ? (
                      <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : dtrRecords.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">No DTR records yet.</div>
                    ) : (
                      dtrRecords.slice(0, 30).map((rec) => (
                        <div key={rec.id} className="p-3 flex items-center justify-between text-sm">
                          <span className="font-medium">{employeeName(rec.employeeId)}</span>
                          <span className="text-muted-foreground">{rec.attendanceDate}</span>
                          <span>
                            {rec.timeIn ? rec.timeIn.slice(0, 5) : '—'} → {rec.timeOut ? rec.timeOut.slice(0, 5) : '—'}
                          </span>
                          <span className="text-xs capitalize text-muted-foreground">{rec.source ?? 'manual'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Loads Tab */}
            {activeTab === 'loads' && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold mb-3">Assign Teaching Load</h3>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <div>
                      <Label>Employee</Label>
                      <select
                        value={loadForm.employeeId}
                        onChange={(e) => setLoadForm({ ...loadForm, employeeId: e.target.value })}
                        className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">Select employee…</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>{e.lastName}, {e.firstName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Class Offering</Label>
                      <select
                        value={loadForm.classOfferingId}
                        onChange={(e) => setLoadForm({ ...loadForm, classOfferingId: e.target.value })}
                        className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">Select offering…</option>
                        {offerings.map((o) => (
                          <option key={o.id} value={o.id}>Class {o.subjectId.slice(0, 8)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Term</Label>
                      <select
                        value={loadForm.termId}
                        onChange={(e) => setLoadForm({ ...loadForm, termId: e.target.value })}
                        className="mt-1 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">Select term…</option>
                        {terms.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => assignLoadMutation.mutate(loadForm)}
                        disabled={!loadForm.employeeId || !loadForm.classOfferingId || !loadForm.termId || assignLoadMutation.isPending}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card shadow-sm">
                  <div className="divide-y">
                    {loadsLoading ? (
                      <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : loads.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No teaching loads assigned yet for this tenant.
                      </div>
                    ) : (
                      loads.map((l) => (
                        <div key={l.id} className="p-3 flex items-center justify-between text-sm">
                          <span className="font-medium">{employeeName(l.employeeId)}</span>
                          <span className="text-muted-foreground">Class {l.classOfferingId.slice(0, 8)}{l.isSubstitute ? ' (substitute)' : ''}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[hsl(var(--status-danger-ink))] hover:text-[hsl(var(--status-danger-ink))]"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Remove this teaching load?',
                                confirmLabel: 'Remove',
                                destructive: true,
                              });
                              if (ok) removeLoadMutation.mutate(l.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create employee dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEmployeeMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="emp-first">First name</Label>
                  <Input id="emp-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="emp-last">Last name</Label>
                  <Input id="emp-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="emp-email">Email</Label>
                  <Input id="emp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="emp-contact">Contact number</Label>
                  <Input id="emp-contact" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="emp-position">Position</Label>
                  <Input id="emp-position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Math Teacher" />
                </div>
                <div>
                  <Label htmlFor="emp-dept">Department</Label>
                  <Input id="emp-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="emp-status">Employment status</Label>
                  <select
                    id="emp-status"
                    value={form.employmentStatus}
                    onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
                    className="mt-0 flex h-9 w-full rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="probationary">Probationary</option>
                    <option value="contractual">Contractual</option>
                    <option value="part_time">Part-time</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="emp-hire">Hire date</Label>
                  <Input id="emp-hire" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending ? 'Saving…' : 'Add Employee'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
