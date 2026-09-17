'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Check, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { Badge, statusToVariant } from '@sms/ui';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { id: 'student', title: 'Select Student', description: 'Choose the student to enroll' },
  { id: 'curriculum', title: 'Select Curriculum', description: 'Choose curriculum for this school year' },
  { id: 'subjects', title: 'Select Subjects', description: 'Select subjects to enroll in' },
  { id: 'section', title: 'Assign Section', description: 'Place student in a class section' },
  { id: 'confirm', title: 'Confirm', description: 'Review and confirm enrollment' },
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
    enabled: !!currentTenantId && currentStep === 1,
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

  // Check for holds
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
      // Assuming createEnrollment returns the created enrollment object
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
      case 2: return true; // Subjects are optional
      case 3: return true; // Section is optional
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
      // error surfaced via createEnrollment.isError below
    }
  };

  const studentList = ((students?.data as any[]) ?? []).filter((s: any) =>
    s.status === 'active'
  ).filter((s: any) =>
    !studentSearch ||
    `${s.firstName} ${s.lastName} ${s.lrn ?? ''} ${s.studentNumber ?? ''}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const curriculumList = ((curricula?.data as any[]) ?? []).filter((c: any) =>
    c.schoolYearId === formData.schoolYearId && c.status === 'active'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enrollment Wizard</h1>
        <p className="text-muted-foreground">Enroll a student into a school year, curriculum, and section</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index < currentStep ? 'bg-green-500 text-white' :
              index === currentStep ? 'bg-primary text-primary-foreground' :
              'bg-muted text-muted-foreground'
            }`}>
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < STEPS.length - 1 && <div className="w-12 h-px bg-muted mx-4" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6 shadow-sm min-h-[300px]">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Select Student</h2>
              <div className="flex bg-muted/50 p-1 rounded-md">
                <button 
                  className={`px-3 py-1 rounded-sm text-sm font-medium ${!formData.isNewStudent ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setFormData({ ...formData, isNewStudent: false })}
                >
                  Existing Student
                </button>
                <button 
                  className={`px-3 py-1 rounded-sm text-sm font-medium ${formData.isNewStudent ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setFormData({ ...formData, isNewStudent: true, studentId: '' })}
                >
                  New Student
                </button>
              </div>
            </div>

            {!formData.isNewStudent ? (
              <>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name, LRN, or student number..."
                  className="flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {studentList.map((student: any) => (
                    <button
                      key={student.id}
                      onClick={() => setFormData({ ...formData, studentId: student.id })}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        formData.studentId === student.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium">{student.lastName}, {student.firstName}</p>
                      <p className="text-sm text-muted-foreground">LRN: {student.lrn || 'N/A'} | #{student.studentNumber || '—'}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-muted/10">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name *</label>
                  <input type="text" value={formData.newStudentFirstName} onChange={e => setFormData({ ...formData, newStudentFirstName: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name *</label>
                  <input type="text" value={formData.newStudentLastName} onChange={e => setFormData({ ...formData, newStudentLastName: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">LRN</label>
                  <input type="text" value={formData.newStudentLrn} onChange={e => setFormData({ ...formData, newStudentLrn: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" placeholder="12 digits" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Birth Date</label>
                  <input type="date" value={formData.newStudentBirthDate} onChange={e => setFormData({ ...formData, newStudentBirthDate: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gender</label>
                  <select value={formData.newStudentGender} onChange={e => setFormData({ ...formData, newStudentGender: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1">
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <input type="email" value={formData.newStudentEmail} onChange={e => setFormData({ ...formData, newStudentEmail: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <input type="text" value={formData.newStudentPhone} onChange={e => setFormData({ ...formData, newStudentPhone: e.target.value })} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
              </div>
            )}
            
            {createNewStudent.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Failed to create student</p>
                  <p className="text-sm text-red-600">
                    {createNewStudent.error instanceof Error ? createNewStudent.error.message : 'Please check the fields and try again.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Select Curriculum</h2>
            <div>
              <label className="text-sm font-medium">School Year</label>
              <select
                value={formData.schoolYearId}
                onChange={(e) => setFormData({ ...formData, schoolYearId: e.target.value, curriculumId: '' })}
                className="flex h-9 w-full max-w-md rounded-md border px-3 py-1 text-sm mt-1"
              >
                <option value="">Select school year...</option>
                {(schoolYears?.data ?? []).map((sy: any) => (
                  <option key={sy.id} value={sy.id}>{sy.name}</option>
                ))}
              </select>
            </div>
            {formData.schoolYearId && (
              <div>
                <label className="text-sm font-medium">Curriculum</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 max-h-[300px] overflow-y-auto">
                  {curriculumList.map((curr: any) => (
                    <button
                      key={curr.id}
                      onClick={() => setFormData({ ...formData, curriculumId: curr.id })}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        formData.curriculumId === curr.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <p className="font-medium">{curr.versionLabel || 'Curriculum'}</p>
                      <p className="text-sm text-muted-foreground">
                        Level: {curr.educationLevelId} {curr.gradeLevelId ? `| Grade: ${curr.gradeLevelId}` : ''}
                      </p>
                    </button>
                  ))}
                  {curriculumList.length === 0 && (
                    <p className="text-muted-foreground text-sm col-span-2">No active curricula for this school year</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Subjects</h2>
            <p className="text-sm text-muted-foreground">Optional — load batch subjects from curriculum or select manually</p>
            
            <div className="flex flex-col md:flex-row items-end gap-2 mb-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex-1 w-full">
                <label className="text-sm font-medium">Target Year Level</label>
                <select
                  value={formData.targetYearLevelId}
                  onChange={(e) => setFormData({ ...formData, targetYearLevelId: e.target.value })}
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                >
                  <option value="">Any / All</option>
                  {((currYearLevels?.data as any[]) ?? []).map((yl: any) => (
                    <option key={yl.id} value={yl.id}>{yl.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="text-sm font-medium">Target Term</label>
                <select
                  value={formData.targetTermId}
                  onChange={(e) => setFormData({ ...formData, targetTermId: e.target.value })}
                  className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1"
                >
                  <option value="">Any / All</option>
                  {((curriculumTerms?.data as any[]) ?? []).map((term: any) => (
                    <option key={term.id} value={term.id}>{term.name}</option>
                  ))}
                </select>
              </div>
              <button 
                className="inline-flex items-center rounded-md border bg-white px-4 h-9 text-sm font-medium"
                onClick={() => {
                  const currSubjectsList = (curriculumSubjects?.data as any[]) ?? [];
                  const filtered = currSubjectsList.filter((cs: any) => {
                    let match = true;
                    if (formData.targetYearLevelId && cs.yearLevelId !== formData.targetYearLevelId) match = false;
                    if (formData.targetTermId && cs.termId !== formData.targetTermId) match = false;
                    return match;
                  });
                  const ids = filtered.map((cs) => cs.subjectId);
                  setFormData({ ...formData, subjectIds: Array.from(new Set([...formData.subjectIds, ...ids])) });
                }}
              >
                Load Batch Subjects
              </button>
            </div>

            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Selected Subjects ({formData.subjectIds.length})</h3>
              <button 
                className="text-xs text-red-500 hover:underline"
                onClick={() => setFormData({ ...formData, subjectIds: [] })}
              >
                Clear All
              </button>
            </div>

            {formData.subjectIds.length > 0 ? (
              <div className="space-y-1 border rounded-md p-2 max-h-[300px] overflow-y-auto">
                {formData.subjectIds.map(subjectId => {
                  const allSubjectsList = (allSubjects?.data as any[]) ?? [];
                  const subject = allSubjectsList.find(s => s.id === subjectId);
                  return (
                    <div key={subjectId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors">
                      <p className="text-sm font-medium">{subject?.code ?? 'Unknown'} — {subject?.title ?? subjectId}</p>
                      <button 
                        onClick={() => setFormData({
                          ...formData,
                          subjectIds: formData.subjectIds.filter(id => id !== subjectId)
                        })}
                        className="text-muted-foreground hover:text-red-500 p-1"
                        title="Remove subject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-8 border rounded-md text-center bg-muted/10">No subjects selected for this enrollment</p>
            )}

            <div className="mt-4 border rounded-md p-4">
              <p className="text-sm font-medium mb-2">Add Irregular/Extra Subject</p>
              <select 
                className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value && !formData.subjectIds.includes(e.target.value)) {
                    setFormData({ ...formData, subjectIds: [...formData.subjectIds, e.target.value] });
                  }
                }}
              >
                <option value="">Select subject to add...</option>
                {((allSubjects?.data as any[]) ?? []).filter(s => !formData.subjectIds.includes(s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.title}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Assign Section</h2>
            <p className="text-sm text-muted-foreground">Optional — you can assign a section now or later</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {((sections?.data as any[]) ?? []).map((section: any) => (
                <button
                  key={section.id}
                  onClick={() => setFormData({ ...formData, sectionId: section.id })}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    formData.sectionId === section.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{section.name}</p>
                    <Badge variant={statusToVariant(section.isActive)}>
                      {section.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Capacity: {section.capacity} | Homeroom: {section.homeroom || '—'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm Enrollment</h2>

            {hasBlockingHolds && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Blocking Holds Detected</p>
                  <p className="text-sm text-red-600">This student has active holds that block enrollment. Release the holds before proceeding.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Student</p>
                <p className="font-medium">{(selectedStudent?.data as any)?.firstName} {(selectedStudent?.data as any)?.lastName}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">School Year</p>
                <p className="font-medium">
                  {((schoolYears?.data as any[]) ?? []).find((sy) => sy.id === formData.schoolYearId)?.name ?? formData.schoolYearId}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Curriculum</p>
                <p className="font-medium">
                  {((curricula?.data as any[]) ?? []).find((c) => c.id === formData.curriculumId)?.versionLabel ?? 'Curriculum'}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Section</p>
                <p className="font-medium">
                  {((sections?.data as any[]) ?? []).find((s) => s.id === formData.sectionId)?.name ?? 'Not assigned'}
                </p>
              </div>
            </div>

            {createEnrollment.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800">Enrollment Failed</p>
                  <p className="text-sm text-red-600">
                    {createEnrollment.error instanceof Error ? createEnrollment.error.message : 'Please review and try again.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Payment Plan (Generates Invoice)</label>
              <select
                value={formData.paymentPlanId}
                onChange={(e) => setFormData({ ...formData, paymentPlanId: e.target.value })}
                className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm mt-1"
              >
                <option value="">Full Payment (Default)</option>
                {((paymentPlans?.data as any[]) ?? []).map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.numberOfInstallments} Installments)
                  </option>
                ))}
                <option value="custom">Custom (Specify number of installments)</option>
              </select>
            </div>

            {formData.paymentPlanId === 'custom' && (
              <div>
                <label className="text-sm font-medium text-blue-700">Number of Installments</label>
                <input
                  type="number"
                  min={1}
                  value={formData.customInstallmentsCount || ''}
                  onChange={(e) => setFormData({ ...formData, customInstallmentsCount: parseInt(e.target.value) || 0 })}
                  className="flex h-10 w-full rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm mt-1"
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-blue-600 mt-1">The total balance will be split equally across these installments.</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="flex w-full rounded-md border px-3 py-2 text-sm mt-1"
                rows={3}
                placeholder="Add any notes about this enrollment..."
              />
            </div>

            {activeHolds.length > 0 && !hasBlockingHolds && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Note: This student has {activeHolds.length} non-blocking hold(s).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={async () => {
              if (currentStep === 0 && formData.isNewStudent) {
                try {
                  const res = await createNewStudent.mutateAsync();
                  setFormData({ ...formData, studentId: (res.data as any).id, isNewStudent: false });
                  setCurrentStep(1);
                  queryClient.invalidateQueries({ queryKey: ['students'] });
                } catch {
                  // error handled by createNewStudent.isError UI
                }
              } else {
                setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
              }
            }}
            disabled={!canProceed() || createNewStudent.isPending}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createNewStudent.isPending && currentStep === 0 ? 'Creating...' : 'Next'} <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || createEnrollment.isPending}
            className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {createEnrollment.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
          </button>
        )}
      </div>
    </div>
  );
}
