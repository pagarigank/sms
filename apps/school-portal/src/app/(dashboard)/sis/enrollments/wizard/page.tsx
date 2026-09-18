'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, X, Search, User, BookOpen, Layers, Users, CheckSquare } from 'lucide-react';
import { Badge, statusToVariant, Input, Label, Button, Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { cn } from '@sms/utils';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: WizardStep[] = [
  { id: 'student', title: 'Student', description: 'Select applicant', icon: User },
  { id: 'curriculum', title: 'Curriculum', description: 'Program & year', icon: BookOpen },
  { id: 'subjects', title: 'Subjects', description: 'Load batch/irregular', icon: Layers },
  { id: 'section', title: 'Section', description: 'Assign class section', icon: Users },
  { id: 'confirm', title: 'Confirm', description: 'Review & finalize', icon: CheckSquare },
];

export default function EnrollmentWizardPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [formData, setFormData] = useState({
    studentId: '',
    schoolYearId: '',
    curriculumId: '',
    sectionId: '',
    notes: '',
    subjectIds: [] as string[],
    targetYearLevelId: '',
    targetTermId: '',
    isNewStudent: false,
    newStudentFirstName: '',
    newStudentLastName: '',
    newStudentEmail: '',
    newStudentPhone: '',
    newStudentGender: '',
    newStudentBirthDate: '',
    newStudentLrn: '',
    paymentPlanId: '',
    customInstallmentsCount: 0,
  });

  // Fetch data for each step
  const { data: students } = useQuery({
    queryKey: ['students', currentTenantId],
    queryFn: () => apiClient.sis.listStudents({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && currentStep === 0,
  });

  const { data: schoolYears } = useQuery({
    queryKey: ['school-years', currentTenantId],
    queryFn: () => apiClient.academic.listSchoolYears(),
    enabled: !!currentTenantId && currentStep === 1,
  });

  const { data: curricula } = useQuery({
    queryKey: ['curricula', currentTenantId, formData.schoolYearId],
    queryFn: () => apiClient.academic.listCurricula({ schoolYearId: formData.schoolYearId }),
    enabled: !!currentTenantId && !!formData.schoolYearId && currentStep === 1,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', currentTenantId, currentBranchId],
    queryFn: () => apiClient.sis.listSections({ tenantId: currentTenantId!, branchId: currentBranchId ?? undefined }),
    enabled: !!currentTenantId && currentStep === 3,
  });

  const { data: curriculumSubjects } = useQuery({
    queryKey: ['curriculum-subjects', formData.curriculumId],
    queryFn: () => apiClient.academic.listCurriculumSubjects(formData.curriculumId),
    enabled: !!formData.curriculumId && currentStep === 2,
  });

  const { data: allSubjects } = useQuery({
    queryKey: ['subjects', currentTenantId],
    queryFn: () => apiClient.academic.listSubjects({ limit: 500 }),
    enabled: !!currentTenantId && currentStep === 2,
  });

  const { data: currYearLevels } = useQuery({
    queryKey: ['grade-levels', currentTenantId],
    queryFn: () => apiClient.academic.listGradeLevels({ limit: 100 }),
    enabled: !!currentTenantId && currentStep === 2,
  });

  const { data: curriculumTerms } = useQuery({
    queryKey: ['terms', formData.schoolYearId],
    queryFn: () => apiClient.academic.listTerms(formData.schoolYearId),
    enabled: !!formData.schoolYearId && currentStep === 2,
  });

  const { data: selectedStudent } = useQuery({
    queryKey: ['student', formData.studentId],
    queryFn: () => apiClient.sis.getStudent(formData.studentId),
    enabled: !!formData.studentId && currentStep === 4,
  });

  const { data: holds } = useQuery({
    queryKey: ['holds', formData.studentId],
    queryFn: () => apiClient.sis.getStudentHolds(formData.studentId),
    enabled: !!formData.studentId && currentStep === 4,
  });

  const { data: paymentPlans } = useQuery({
    queryKey: ['payment-plans', currentTenantId],
    queryFn: () => apiClient.billing.getPaymentPlans({ tenantId: currentTenantId! }),
    enabled: !!currentTenantId && currentStep === 4,
  });

  const createNewStudent = useMutation({
    mutationFn: () => apiClient.sis.createStudent({
      firstName: formData.newStudentFirstName,
      lastName: formData.newStudentLastName,
      email: formData.newStudentEmail || undefined,
      phone: formData.newStudentPhone || undefined,
      gender: formData.newStudentGender || undefined,
      birthDate: formData.newStudentBirthDate || undefined,
      lrn: formData.newStudentLrn || undefined,
    }),
  });

  const createEnrollment = useMutation({
    mutationFn: () => apiClient.sis.createEnrollment({
      studentId: formData.studentId,
      schoolYearId: formData.schoolYearId,
      curriculumId: formData.curriculumId,
      sectionId: formData.sectionId || undefined,
      notes: formData.notes || undefined,
      subjectIds: formData.subjectIds.length > 0 ? formData.subjectIds : undefined,
    }),
    onSuccess: (data: any) => {
      const enrollmentId = data?.data?.id || data?.id;
      if (enrollmentId) {
        generateInvoice.mutate(enrollmentId);
      } else {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        setCurrentStep(0);
        resetForm();
      }
    },
  });

  const generateInvoice = useMutation({
    mutationFn: (enrollmentId: string) => apiClient.invoices.generateInvoice({
      tenantId: currentTenantId,
      branchId: currentBranchId,
      studentId: formData.studentId,
      enrollmentId,
      termId: formData.targetTermId || undefined,
      paymentPlanId: formData.paymentPlanId !== 'custom' ? (formData.paymentPlanId || undefined) : undefined,
      customInstallmentsCount: formData.paymentPlanId === 'custom' ? formData.customInstallmentsCount : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setCurrentStep(0);
      resetForm();
    }
  });

  const resetForm = () => setFormData({ 
    studentId: '', schoolYearId: '', curriculumId: '', sectionId: '', notes: '', subjectIds: [], 
    targetYearLevelId: '', targetTermId: '', isNewStudent: false, newStudentFirstName: '', 
    newStudentLastName: '', newStudentEmail: '', newStudentPhone: '', newStudentGender: '', 
    newStudentBirthDate: '', newStudentLrn: '', paymentPlanId: '', customInstallmentsCount: 0 
  });

  const assignSection = useMutation({
    mutationFn: (enrollmentId: string) =>
      apiClient.sis.assignToSection(enrollmentId, formData.sectionId),
  });

  const activeHolds = ((holds?.data as any[]) ?? []).filter((h: any) => h.isActive);
  const hasBlockingHolds = activeHolds.some((h: any) => h.blocksSchedule);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.isNewStudent ? !!formData.newStudentFirstName && !!formData.newStudentLastName : !!formData.studentId;
      case 1: return !!formData.schoolYearId && !!formData.curriculumId;
      case 2: return true; 
      case 3: return true; 
      case 4: return !hasBlockingHolds;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await createEnrollment.mutateAsync();
      const enrollmentId = (result.data as any)?.id;
      if (formData.sectionId && enrollmentId) {
        await assignSection.mutateAsync(enrollmentId);
      }
    } catch {
      // error surfaced via createEnrollment.isError
    }
  };

  const studentList = ((students?.data as any[]) ?? []).filter((s: any) =>
    s.status === 'active' || s.status === 'admitted'
  ).filter((s: any) =>
    !studentSearch ||
    `${s.firstName} ${s.lastName} ${s.lrn ?? ''} ${s.studentNumber ?? ''}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const curriculumList = ((curricula?.data as any[]) ?? []).filter((c: any) =>
    c.schoolYearId === formData.schoolYearId && c.status === 'active'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="text-center space-y-2 animate-in slide-in-from-top-4 fade-in duration-500">
        <h1 className="text-4xl font-extrabold tracking-tight">Enrollment Wizard</h1>
        <p className="text-muted-foreground text-lg">Enroll a student into a school year, curriculum, and section.</p>
      </div>

      {/* Stepper */}
      <div className="relative mt-8 mb-12 animate-in fade-in duration-700 delay-100 hidden sm:block">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0"></div>
        <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}></div>
        
        <div className="relative z-10 flex justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-3 bg-background px-2" style={{ maxWidth: '120px' }}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25' 
                    : isCurrent
                      ? 'bg-background border-primary text-primary shadow-lg shadow-primary/20 scale-110'
                      : 'bg-background border-border text-muted-foreground'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="text-center">
                  <span className={`block text-sm font-semibold transition-colors ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap">{step.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <Card className="p-8 shadow-lg shadow-foreground/5 border-muted/50 overflow-hidden relative">
        <div key={currentStep} className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both min-h-[360px]">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Select Student</h2>
                  <p className="text-sm text-muted-foreground">Find an existing student or create a new profile.</p>
                </div>
                <div className="flex bg-muted p-1 rounded-lg">
                  <button 
                    className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", !formData.isNewStudent ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setFormData({ ...formData, isNewStudent: false })}
                  >
                    Existing Student
                  </button>
                  <button 
                    className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", formData.isNewStudent ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setFormData({ ...formData, isNewStudent: true, studentId: '' })}
                  >
                    New Student
                  </button>
                </div>
              </div>

              {!formData.isNewStudent ? (
                <div className="space-y-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by name, LRN, or student number..."
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2">
                    {studentList.map((student: any) => (
                      <button
                        key={student.id}
                        onClick={() => setFormData({ ...formData, studentId: student.id })}
                        className={cn(
                          "text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40",
                          formData.studentId === student.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-transparent bg-muted/40"
                        )}
                      >
                        <p className="font-semibold">{student.lastName}, {student.firstName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          LRN: {student.lrn || 'N/A'} <span className="mx-1">•</span> ID: {student.studentNumber || '—'}
                        </p>
                      </button>
                    ))}
                    {studentList.length === 0 && (
                      <div className="col-span-full py-8 text-center text-muted-foreground">
                        No students found matching your search.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-dashed bg-muted/10">
                  <div className="space-y-2">
                    <Label htmlFor="newStudentFirstName">First Name <span className="text-destructive">*</span></Label>
                    <Input id="newStudentFirstName" value={formData.newStudentFirstName} onChange={e => setFormData({ ...formData, newStudentFirstName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentLastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="newStudentLastName" value={formData.newStudentLastName} onChange={e => setFormData({ ...formData, newStudentLastName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentLrn">LRN</Label>
                    <Input id="newStudentLrn" value={formData.newStudentLrn} onChange={e => setFormData({ ...formData, newStudentLrn: e.target.value })} placeholder="12 digits" maxLength={12} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentBirthDate">Birth Date</Label>
                    <Input id="newStudentBirthDate" type="date" value={formData.newStudentBirthDate} onChange={e => setFormData({ ...formData, newStudentBirthDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentGender">Gender</Label>
                    <Select value={formData.newStudentGender} onValueChange={val => setFormData({ ...formData, newStudentGender: val })}>
                      <SelectTrigger id="newStudentGender">
                        <SelectValue placeholder="Select gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentEmail">Email</Label>
                    <Input id="newStudentEmail" type="email" value={formData.newStudentEmail} onChange={e => setFormData({ ...formData, newStudentEmail: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newStudentPhone">Phone</Label>
                    <Input id="newStudentPhone" type="tel" value={formData.newStudentPhone} onChange={e => setFormData({ ...formData, newStudentPhone: e.target.value })} />
                  </div>
                </div>
              )}
              
              {createNewStudent.isError && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-destructive">Failed to create student</p>
                    <p className="text-xs text-destructive/90 mt-0.5">
                      {createNewStudent.error instanceof Error ? createNewStudent.error.message : 'Please check the fields and try again.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Select Curriculum</h2>
                <p className="text-sm text-muted-foreground">Choose the active school year and appropriate curriculum.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="schoolYearId">School Year <span className="text-destructive">*</span></Label>
                  <Select value={formData.schoolYearId} onValueChange={(val) => setFormData({ ...formData, schoolYearId: val, curriculumId: '' })}>
                    <SelectTrigger id="schoolYearId">
                      <SelectValue placeholder="Select school year..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(schoolYears?.data ?? []).map((sy: any) => (
                        <SelectItem key={sy.id} value={sy.id}>{sy.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.schoolYearId && (
                  <div className="space-y-3">
                    <Label>Curriculum <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                      {curriculumList.map((curr: any) => (
                        <button
                          key={curr.id}
                          onClick={() => setFormData({ ...formData, curriculumId: curr.id })}
                          className={cn(
                            "text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40",
                            formData.curriculumId === curr.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-transparent bg-muted/40"
                          )}
                        >
                          <p className="font-semibold">{curr.versionLabel || 'Curriculum'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Level: {curr.educationLevelId} {curr.gradeLevelId ? `| Grade: ${curr.gradeLevelId}` : ''}
                          </p>
                        </button>
                      ))}
                      {curriculumList.length === 0 && (
                        <div className="col-span-full py-8 text-center text-muted-foreground rounded-xl border border-dashed">
                          No active curricula available for this school year.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Select Subjects</h2>
                  <p className="text-sm text-muted-foreground">Load batch subjects from curriculum or select manually (Optional).</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-end gap-3 p-5 border rounded-xl bg-muted/20">
                <div className="flex-1 w-full space-y-2">
                  <Label htmlFor="targetYearLevelId">Target Year Level</Label>
                  <Select value={formData.targetYearLevelId} onValueChange={(val) => setFormData({ ...formData, targetYearLevelId: val })}>
                    <SelectTrigger id="targetYearLevelId">
                      <SelectValue placeholder="Any / All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any / All</SelectItem>
                      {((currYearLevels?.data as any[]) ?? []).map((yl: any) => (
                        <SelectItem key={yl.id} value={yl.id}>{yl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <Label htmlFor="targetTermId">Target Term</Label>
                  <Select value={formData.targetTermId} onValueChange={(val) => setFormData({ ...formData, targetTermId: val })}>
                    <SelectTrigger id="targetTermId">
                      <SelectValue placeholder="Any / All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any / All</SelectItem>
                      {((curriculumTerms?.data as any[]) ?? []).map((term: any) => (
                        <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const currSubjectsList = (curriculumSubjects?.data as any[]) ?? [];
                    const filtered = currSubjectsList.filter((cs: any) => {
                      let match = true;
                      if (formData.targetYearLevelId && formData.targetYearLevelId !== 'none' && cs.yearLevelId !== formData.targetYearLevelId) match = false;
                      if (formData.targetTermId && formData.targetTermId !== 'none' && cs.termId !== formData.targetTermId) match = false;
                      return match;
                    });
                    const ids = filtered.map((cs) => cs.subjectId);
                    setFormData({ ...formData, subjectIds: Array.from(new Set([...formData.subjectIds, ...ids])) });
                  }}
                >
                  Load Batch Subjects
                </Button>
              </div>

              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold">Selected Subjects <Badge variant="secondary" className="ml-1">{formData.subjectIds.length}</Badge></h3>
                {formData.subjectIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, subjectIds: [] })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Clear All
                  </Button>
                )}
              </div>

              {formData.subjectIds.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {formData.subjectIds.map(subjectId => {
                    const allSubjectsList = (allSubjects?.data as any[]) ?? [];
                    const subject = allSubjectsList.find(s => s.id === subjectId);
                    return (
                      <div key={subjectId} className="flex items-center justify-between p-3 border rounded-xl bg-card hover:border-primary/40 transition-colors shadow-sm">
                        <div>
                          <p className="text-sm font-semibold">{subject?.code ?? 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{subject?.title ?? subjectId}</p>
                        </div>
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => setFormData({
                            ...formData,
                            subjectIds: formData.subjectIds.filter(id => id !== subjectId)
                          })}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          title="Remove subject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 border rounded-xl text-center bg-muted/10 border-dashed">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No subjects selected for this enrollment</p>
                </div>
              )}

              <div className="pt-4 mt-6 border-t space-y-3">
                <Label htmlFor="addSubject">Add Irregular/Extra Subject</Label>
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (val && !formData.subjectIds.includes(val)) {
                      setFormData({ ...formData, subjectIds: [...formData.subjectIds, val] });
                    }
                  }}
                >
                  <SelectTrigger id="addSubject">
                    <SelectValue placeholder="Search and select subject to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {((allSubjects?.data as any[]) ?? []).filter(s => !formData.subjectIds.includes(s.id)).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.code} — {s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Assign Section</h2>
                <p className="text-sm text-muted-foreground">Select a section for the student (Optional — can be done later).</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2">
                {((sections?.data as any[]) ?? []).map((section: any) => (
                  <button
                    key={section.id}
                    onClick={() => setFormData({ ...formData, sectionId: section.id })}
                    className={cn(
                      "text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40",
                      formData.sectionId === section.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-transparent bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{section.name}</p>
                      <Badge variant={statusToVariant(section.isActive)}>
                        {section.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Homeroom: {section.homeroom || 'Unassigned'} <span className="mx-1">•</span> Capacity: {section.capacity}
                    </p>
                  </button>
                ))}
                {((sections?.data as any[]) ?? []).length === 0 && (
                  <div className="col-span-full py-8 text-center text-muted-foreground border rounded-xl border-dashed">
                    No active sections found for this branch.
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Confirm Enrollment</h2>
                <p className="text-sm text-muted-foreground">Review the details before finalizing the enrollment.</p>
              </div>

              {hasBlockingHolds && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-destructive">Blocking Holds Detected</p>
                    <p className="text-xs text-destructive/90 mt-0.5">This student has active holds that block enrollment. Release the holds before proceeding.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Student</p>
                  <p className="font-semibold">
                    {formData.isNewStudent ? `${formData.newStudentLastName}, ${formData.newStudentFirstName}` : `${(selectedStudent?.data as any)?.lastName}, ${(selectedStudent?.data as any)?.firstName}`}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">School Year</p>
                  <p className="font-semibold">
                    {((schoolYears?.data as any[]) ?? []).find((sy) => sy.id === formData.schoolYearId)?.name ?? formData.schoolYearId}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Curriculum</p>
                  <p className="font-semibold">
                    {((curricula?.data as any[]) ?? []).find((c) => c.id === formData.curriculumId)?.versionLabel ?? 'Curriculum'}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Section</p>
                  <p className="font-semibold">
                    {formData.sectionId ? ((sections?.data as any[]) ?? []).find((s) => s.id === formData.sectionId)?.name : 'Not assigned (Enrolled directly)'}
                  </p>
                </div>
              </div>

              {createEnrollment.isError && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-destructive">Enrollment Failed</p>
                    <p className="text-xs text-destructive/90 mt-0.5">
                      {createEnrollment.error instanceof Error ? createEnrollment.error.message : 'Please review the details and try again.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-lg">Billing & Invoice</h3>
                <div className="space-y-3">
                  <Label htmlFor="paymentPlanId">Payment Plan (Generates Invoice)</Label>
                  <Select value={formData.paymentPlanId} onValueChange={val => setFormData({ ...formData, paymentPlanId: val })}>
                    <SelectTrigger id="paymentPlanId">
                      <SelectValue placeholder="Full Payment (Default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Full Payment (Default)</SelectItem>
                      {((paymentPlans?.data as any[]) ?? []).map((plan: any) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.numberOfInstallments} Installments)
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom (Specify installments)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentPlanId === 'custom' && (
                  <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <Label htmlFor="customInstallmentsCount" className="text-primary">Number of Installments</Label>
                    <Input
                      id="customInstallmentsCount"
                      type="number"
                      min={1}
                      value={formData.customInstallmentsCount || ''}
                      onChange={(e) => setFormData({ ...formData, customInstallmentsCount: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 5"
                      className="border-primary/30"
                    />
                    <p className="text-xs text-primary/80 mt-1">The total balance will be split equally across these installments.</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Label htmlFor="notes">Enrollment Notes (Optional)</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  placeholder="Add any special notes or remarks..."
                />
              </div>

              {activeHolds.length > 0 && !hasBlockingHolds && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-medium text-amber-800">
                    Note: This student has {activeHolds.length} non-blocking hold(s).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Navigation buttons */}
        <div className="mt-8 pt-6 border-t flex items-center justify-between relative z-10 bg-background">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="w-28"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={async () => {
                if (currentStep === 0 && formData.isNewStudent) {
                  try {
                    const res = await createNewStudent.mutateAsync();
                    setFormData({ ...formData, studentId: (res.data as any).id, isNewStudent: false });
                    setCurrentStep(1);
                    queryClient.invalidateQueries({ queryKey: ['students'] });
                  } catch {
                    // error handled by UI
                  }
                } else {
                  setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
                }
              }}
              disabled={!canProceed() || createNewStudent.isPending}
              className="w-28"
            >
              {createNewStudent.isPending && currentStep === 0 ? 'Wait...' : 'Next'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createEnrollment.isPending}
              className="min-w-[140px]"
            >
              {createEnrollment.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
