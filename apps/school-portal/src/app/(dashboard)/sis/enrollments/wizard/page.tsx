'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, AlertTriangle, X, Search, User, BookOpen, Layers, Users, CheckSquare } from 'lucide-react';
import { Button, Card, PageHeader } from '@sms/ui';
import { cn } from '@sms/utils';
import { FormStepper } from '@/components/sis/form-stepper';
import { StudentSearchStep, CurriculumStep, SubjectsStep, SectionStep } from './steps';
import { ConfirmStep } from './confirm-step';
import { EnrollmentFormData, EnrollmentFormDataPatch } from './types';

const STEPS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'student', label: 'Student', icon: User },
  { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
  { id: 'subjects', label: 'Subjects', icon: Layers },
  { id: 'section', label: 'Section', icon: Users },
  { id: 'confirm', label: 'Confirm', icon: CheckSquare },
];

const INITIAL_FORM: EnrollmentFormData = {
  studentId: '', schoolYearId: '', curriculumId: '', sectionId: '', notes: '', subjectIds: [],
  targetYearLevelId: '', targetTermId: '', isNewStudent: false,
  newStudentFirstName: '', newStudentLastName: '', newStudentEmail: '', newStudentPhone: '',
  newStudentGender: '', newStudentBirthDate: '', newStudentLrn: '',
  paymentPlanId: '', customInstallmentsCount: 0,
};

export default function EnrollmentWizardPage() {
  const { currentTenantId, currentBranchId } = useTenantStore();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [formData, setFormData] = useState<EnrollmentFormData>(INITIAL_FORM);

  const update = (patch: EnrollmentFormDataPatch) => setFormData({ ...formData, ...patch });

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
      setFormData(INITIAL_FORM);
    },
  });

  const assignSection = useMutation({
    mutationFn: (enrollmentId: string) => apiClient.sis.assignToSection(enrollmentId, formData.sectionId),
  });

  const activeHolds = ((holds?.data as any[]) ?? []).filter((h: any) => h.isActive);
  const hasBlockingHolds = activeHolds.some((h: any) => h.blocksSchedule);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.isNewStudent
        ? !!formData.newStudentFirstName && !!formData.newStudentLastName
        : !!formData.studentId;
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

  const handleNext = async () => {
    if (currentStep === 0 && formData.isNewStudent) {
      try {
        const res = await createNewStudent.mutateAsync();
        update({ studentId: (res.data as any).id, isNewStudent: false });
        setCurrentStep(1);
        queryClient.invalidateQueries({ queryKey: ['students'] });
      } catch {
        // error handled by UI
      }
    } else {
      setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
    }
  };

  const onCreateStudentError = createNewStudent.isError && !createNewStudent.isSuccess;
  const onCreateStudentErrorMessage = onCreateStudentError
    ? (createNewStudent.error instanceof Error ? createNewStudent.error.message : 'Please check the fields and try again.')
    : '';

  const onEnrollmentError = createEnrollment.isError;
  const onEnrollmentErrorMessage = onEnrollmentError
    ? (createEnrollment.error instanceof Error ? createEnrollment.error.message : 'Please review the details and try again.')
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="text-center space-y-2 animate-in slide-in-from-top-4 fade-in duration-500">
        <PageHeader title="Enrollment Wizard" description="Enroll a student into a school year, curriculum, and section." />
      </div>

      <div className="relative mt-8 mb-12 animate-in fade-in duration-700 delay-100 hidden sm:block">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0" />
        <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
        <FormStepper steps={STEPS} currentStep={currentStep} />
      </div>

      <Card className="p-8 shadow-lg shadow-foreground/5 border-muted/50 overflow-hidden relative">
        <div key={currentStep} className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both min-h-[360px]">
          {currentStep === 0 && (
            <StudentSearchStep
              formData={formData} students={students} studentSearch={studentSearch}
              onCreateStudent={() => createNewStudent.mutate()} onCreateStudentError={onCreateStudentError}
              onCreateStudentErrorMessage={onCreateStudentErrorMessage} onUpdate={update}
            />
          )}
          {currentStep === 1 && (
            <CurriculumStep
              formData={formData} schoolYears={schoolYears} curricula={curricula} onUpdate={update}
            />
          )}
          {currentStep === 2 && (
            <SubjectsStep
              formData={formData} curriculumSubjects={curriculumSubjects} allSubjects={allSubjects}
              currYearLevels={currYearLevels} curriculumTerms={curriculumTerms} onUpdate={update}
            />
          )}
          {currentStep === 3 && (
            <SectionStep formData={formData} sections={sections} onUpdate={update} />
          )}
          {currentStep === 4 && (
            <ConfirmStep
              formData={formData} selectedStudent={selectedStudent} schoolYears={schoolYears}
              curricula={curricula} sections={sections} hasBlockingHolds={hasBlockingHolds}
              activeHolds={activeHolds} paymentPlans={paymentPlans}
              onCreateEnrollmentError={onEnrollmentError} onCreateEnrollmentErrorMessage={onEnrollmentErrorMessage}
              onUpdate={update}
            />
          )}
        </div>

        <div className="mt-8 pt-6 border-t flex items-center justify-between relative z-10 bg-background">
          <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} className="w-28">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext} disabled={!canProceed() || createNewStudent.isPending}
              className="w-28"
            >
              {createNewStudent.isPending && currentStep === 0 ? 'Wait...' : 'Next'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || createEnrollment.isPending} className="min-w-[140px]">
              {createEnrollment.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          )}
        </div>
      </Card>

      {onCreateStudentError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">Failed to create student</p>
            <p className="text-xs text-destructive/90 mt-0.5">{onCreateStudentErrorMessage}</p>
          </div>
        </div>
      )}

      {onEnrollmentError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">Enrollment Failed</p>
            <p className="text-xs text-destructive/90 mt-0.5">{onEnrollmentErrorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
