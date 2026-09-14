'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { Check, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Badge, statusToVariant } from '@sms/ui';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { id: 'student', title: 'Select Student', description: 'Choose the student to enroll' },
  { id: 'curriculum', title: 'Select Curriculum', description: 'Choose curriculum for this school year' },
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
    enabled: !!currentTenantId && currentStep === 2,
  });

  const { data: selectedStudent } = useQuery({
    queryKey: ['student', formData.studentId],
    queryFn: () => apiClient.sis.getStudent(formData.studentId),
    enabled: !!formData.studentId && currentStep === 3,
  });

  // Check for holds
  const { data: holds } = useQuery({
    queryKey: ['holds', formData.studentId],
    queryFn: () => apiClient.sis.getStudentHolds(formData.studentId),
    enabled: !!formData.studentId,
  });

  const createEnrollment = useMutation({
    mutationFn: () => apiClient.sis.createEnrollment({
      studentId: formData.studentId,
      schoolYearId: formData.schoolYearId,
      curriculumId: formData.curriculumId,
      sectionId: formData.sectionId || undefined,
      notes: formData.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setCurrentStep(0);
      setFormData({ studentId: '', schoolYearId: '', curriculumId: '', sectionId: '', notes: '' });
    },
  });

  const assignSection = useMutation({
    mutationFn: (enrollmentId: string) =>
      apiClient.sis.assignToSection(enrollmentId, formData.sectionId),
  });

  const activeHolds = ((holds?.data as any[]) ?? []).filter((h: any) => h.isActive);
  const hasBlockingHolds = activeHolds.some((h: any) => h.blocksSchedule);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!formData.studentId;
      case 1: return !!formData.schoolYearId && !!formData.curriculumId;
      case 2: return true; // Section is optional
      case 3: return !hasBlockingHolds;
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
            <h2 className="text-lg font-semibold">Select Student</h2>
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

        {currentStep === 3 && (
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
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={!canProceed()}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
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
