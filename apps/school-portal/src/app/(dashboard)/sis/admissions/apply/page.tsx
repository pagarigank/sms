'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { CheckCircle, Upload, AlertCircle } from 'lucide-react';

interface ApplicationFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  birthDate: string;
  sex: string;
  address: string;
  phone: string;
  email: string;
  priorSchool: string;
  lrn: string;
  educationLevelId: string;
  gradeLevelId: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
}

export default function ApplicationFormPage() {
  const { currentTenantId } = useTenantStore();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: '', middleName: '', lastName: '', suffix: '',
    birthDate: '', sex: '', address: '', phone: '', email: '',
    priorSchool: '', lrn: '',
    educationLevelId: '', gradeLevelId: '',
    guardianFirstName: '', guardianLastName: '', guardianPhone: '',
    guardianEmail: '', guardianRelationship: '',
  });

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
      // Applications enter the admissions pipeline as an Applicant (G-23).
      // A Student record is only created later when the applicant is accepted
      // and converted via POST /admissions/applicants/:id/convert.
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
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const updateField = (field: keyof ApplicationFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="max-w-md w-full text-center space-y-4 p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Application Submitted!</h1>
          <p className="text-muted-foreground">
            Your application has entered the admissions pipeline. The school will review it and contact you shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                firstName: '', middleName: '', lastName: '', suffix: '',
                birthDate: '', sex: '', address: '', phone: '', email: '',
                priorSchool: '', lrn: '',
                educationLevelId: '', gradeLevelId: '',
                guardianFirstName: '', guardianLastName: '', guardianPhone: '',
                guardianEmail: '', guardianRelationship: '',
              });
            }}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="max-w-2xl mx-auto space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Student Application Form</h1>
          <p className="text-muted-foreground mt-2">Fill out the form below to apply for enrollment</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-4">
          {['Student Info', 'Academic', 'Guardian', 'Documents'].map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {index < step ? '✓' : index + 1}
              </div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">Student Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name *</label>
                  <input type="text" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Middle Name</label>
                  <input type="text" value={formData.middleName} onChange={(e) => updateField('middleName', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name *</label>
                  <input type="text" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Suffix</label>
                  <input type="text" value={formData.suffix} onChange={(e) => updateField('suffix', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" placeholder="Jr., Sr., III" />
                </div>
                <div>
                  <label className="text-sm font-medium">Birth Date *</label>
                  <input type="date" value={formData.birthDate} onChange={(e) => updateField('birthDate', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Sex *</label>
                  <select value={formData.sex} onChange={(e) => updateField('sex', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Address *</label>
                  <input type="text" value={formData.address} onChange={(e) => updateField('address', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">Academic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Education Level *</label>
                  <select value={formData.educationLevelId} onChange={(e) => updateField('educationLevelId', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required>
                    <option value="">Select...</option>
                    {(educationLevels?.data ?? []).map((level: any) => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Grade/Year Level *</label>
                  <select value={formData.gradeLevelId} onChange={(e) => updateField('gradeLevelId', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required>
                    <option value="">Select...</option>
                    {(gradeLevels?.data ?? []).map((level: any) => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">LRN (if available)</label>
                  <input type="text" value={formData.lrn} onChange={(e) => updateField('lrn', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" placeholder="12-digit LRN" maxLength={12} />
                  {formData.lrn && !/^\d{12}$/.test(formData.lrn) && (
                    <p className="text-xs text-red-500 mt-1">LRN must be exactly 12 digits</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Prior School</label>
                  <input type="text" value={formData.priorSchool} onChange={(e) => updateField('priorSchool', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">Guardian Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Guardian First Name *</label>
                  <input type="text" value={formData.guardianFirstName} onChange={(e) => updateField('guardianFirstName', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Guardian Last Name *</label>
                  <input type="text" value={formData.guardianLastName} onChange={(e) => updateField('guardianLastName', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Relationship *</label>
                  <select value={formData.guardianRelationship} onChange={(e) => updateField('guardianRelationship', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required>
                    <option value="">Select...</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="guardian">Guardian</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <input type="tel" value={formData.guardianPhone} onChange={(e) => updateField('guardianPhone', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" required />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" value={formData.guardianEmail} onChange={(e) => updateField('guardianEmail', e.target.value)} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm mt-1" />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">Supporting Documents</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upload supporting documents (optional at this stage). You can also submit them later.
              </p>
              <div className="space-y-4">
                {['Birth Certificate', 'Report Card / Form 138', 'Good Moral Character', 'Medical Certificate', 'ID Photos'].map((docType) => (
                  <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{docType}</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
                      </div>
                    </div>
                    <button className="text-sm text-primary hover:underline">Upload</button>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Before Submitting</p>
                    <p className="text-sm text-blue-600">
                      By submitting this application, you confirm that all information provided is accurate to the best of your knowledge.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Submission error */}
        {submitApplication.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Failed to submit application</p>
              <p className="text-sm text-red-600 mt-0.5">
                {submitApplication.error instanceof Error ? submitApplication.error.message : 'Please try again.'}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            ← Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 0 && (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.sex || !formData.address)) ||
                (step === 1 && (!formData.educationLevelId || !formData.gradeLevelId)) ||
                (step === 2 && (!formData.guardianFirstName || !formData.guardianLastName || !formData.guardianRelationship || !formData.guardianPhone))
              }
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => submitApplication.mutate()}
              disabled={submitApplication.isPending}
              className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
