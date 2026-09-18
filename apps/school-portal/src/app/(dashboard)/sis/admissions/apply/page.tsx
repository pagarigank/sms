'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button, Card } from '@sms/ui';
import Link from 'next/link';
import { FormStepper } from '@/components/sis/form-stepper';
import { StudentInfoStep, AcademicStep, GuardianStep, DocumentsStep } from './steps';
import { EducationFormData } from './types';

const STEPS_CONFIG = [
  { id: 'student', label: 'Student Info', icon: undefined },
  { id: 'academic', label: 'Academic', icon: undefined },
  { id: 'guardian', label: 'Guardian', icon: undefined },
  { id: 'documents', label: 'Documents', icon: undefined },
];

const INITIAL_FORM: EducationFormData = {
  firstName: '', middleName: '', lastName: '', suffix: '',
  birthDate: '', sex: '', address: '', phone: '', email: '',
  priorSchool: '', lrn: '', educationLevelId: '', gradeLevelId: '',
  guardianFirstName: '', guardianLastName: '', guardianPhone: '', guardianEmail: '', guardianRelationship: '',
};

export default function ApplicationFormPage() {
  const { currentTenantId } = useTenantStore();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<EducationFormData>(INITIAL_FORM);

  const { data: educationLevels } = useQuery({
    queryKey: ['education-levels', currentTenantId],
    queryFn: () => apiClient.academic.listEducationLevels(),
    enabled: !!currentTenantId,
  });

  const { data: gradeLevels } = useQuery({
    queryKey: ['grade-levels', currentTenantId, formData.educationLevelId],
    queryFn: () => apiClient.academic.listGradeLevels({ educationLevelId: formData.educationLevelId }),
    enabled: !!currentTenantId && !!formData.educationLevelId,
  });

  const submitApplication = useMutation({
    mutationFn: async () => {
      const guardianNote = formData.guardianFirstName
        ? `Guardian: ${formData.guardianFirstName} ${formData.guardianLastName}` +
          ` (${formData.guardianRelationship || 'guardian'})` +
          (formData.guardianPhone ? ` — ${formData.guardianPhone}` : '') +
          (formData.guardianEmail ? ` — ${formData.guardianEmail}` : '')
        : undefined;
      return apiClient.admissions.createApplicant({
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        birthDate: formData.birthDate || undefined,
        gender: formData.sex || undefined,
        address: formData.address || undefined,
        previousSchool: formData.priorSchool || undefined,
        gradeLevelAppliedFor: formData.gradeLevelId || undefined,
        source: 'online-form',
        notes: guardianNote,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  const updateField = (field: keyof EducationFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center space-y-6 p-10 animate-in fade-in zoom-in-95 duration-500 shadow-xl border-primary/10">
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Application Submitted!</h1>
            <p className="text-muted-foreground leading-relaxed">
              Your application has entered the admissions pipeline. The school will review it and contact you shortly regarding the next steps.
            </p>
          </div>
          <div className="pt-6 flex flex-col gap-3">
            <Button
              onClick={() => { setSubmitted(false); setStep(0); setFormData(INITIAL_FORM); }}
              className="w-full h-11 text-base font-medium"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Submit Another Application
            </Button>
            <Button variant="outline" asChild className="w-full h-11 text-base">
              <Link href="/sis/admissions">
                <ArrowLeft className="mr-2 h-4 w-4" /> Return to Pipeline
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isStepValid = () => {
    if (step === 0) return !!(formData.firstName && formData.lastName && formData.birthDate && formData.sex && formData.address);
    if (step === 1) return !!(formData.educationLevelId && formData.gradeLevelId);
    if (step === 2) return !!(formData.guardianFirstName && formData.guardianLastName && formData.guardianRelationship && formData.guardianPhone);
    return true;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/10 py-10">
      <div className="max-w-3xl mx-auto space-y-8 px-4">
        <div className="text-center space-y-2 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl font-extrabold tracking-tight">Student Application</h1>
          <p className="text-muted-foreground text-lg">Complete the form below to apply for enrollment</p>
        </div>

        <FormStepper steps={STEPS_CONFIG} currentStep={step} />

        <Card className="p-8 shadow-lg shadow-foreground/5 border-muted/50 bg-background overflow-hidden relative">
          <div key={step} className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both">
            {step === 0 && <StudentInfoStep formData={formData} onUpdate={updateField} />}
            {step === 1 && <AcademicStep formData={formData} educationLevels={educationLevels} gradeLevels={gradeLevels} onUpdate={updateField} />}
            {step === 2 && <GuardianStep formData={formData} onUpdate={updateField} />}
            {step === 3 && <DocumentsStep onSubmit={() => submitApplication.mutate()} isSubmitting={submitApplication.isPending} />}
          </div>

          <div className="mt-10 pt-6 border-t flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="w-28">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!isStepValid()} className="w-28">
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => submitApplication.mutate()} disabled={submitApplication.isPending} className="min-w-[140px]">
                {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </Card>

        {submitApplication.isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Submission Failed</p>
              <p className="text-sm text-destructive/80 mt-1">
                {submitApplication.error instanceof Error ? submitApplication.error.message : 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}