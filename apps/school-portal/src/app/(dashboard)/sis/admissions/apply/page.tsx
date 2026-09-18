'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';
import { CheckCircle2, Upload, AlertCircle, ChevronLeft, ChevronRight, User, GraduationCap, Users, FileText, ArrowLeft, Sparkles } from 'lucide-react';
import { Input, Label, Button, Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import Link from 'next/link';

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

const STEPS_CONFIG = [
  { id: 'student', label: 'Student Info', icon: User },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'guardian', label: 'Guardian', icon: Users },
  { id: 'documents', label: 'Documents', icon: FileText },
];

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
              onClick={() => {
                setSubmitted(false);
                setStep(0);
                setFormData({
                  firstName: '', middleName: '', lastName: '', suffix: '',
                  birthDate: '', sex: '', address: '', phone: '', email: '',
                  priorSchool: '', lrn: '', educationLevelId: '', gradeLevelId: '',
                  guardianFirstName: '', guardianLastName: '', guardianPhone: '',
                  guardianEmail: '', guardianRelationship: '',
                });
              }}
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

  // Validation
  const isStepValid = () => {
    if (step === 0) return !!(formData.firstName && formData.lastName && formData.birthDate && formData.sex && formData.address);
    if (step === 1) return !!(formData.educationLevelId && formData.gradeLevelId);
    if (step === 2) return !!(formData.guardianFirstName && formData.guardianLastName && formData.guardianRelationship && formData.guardianPhone);
    return true; // docs are optional
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/10 py-10">
      <div className="max-w-3xl mx-auto space-y-8 px-4">
        {/* Header */}
        <div className="text-center space-y-2 animate-in slide-in-from-top-4 fade-in duration-500">
          <h1 className="text-4xl font-extrabold tracking-tight">Student Application</h1>
          <p className="text-muted-foreground text-lg">Complete the form below to apply for enrollment</p>
        </div>

        {/* Custom Stepper */}
        <div className="relative mb-12 mt-8 animate-in fade-in duration-700 delay-100">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0"></div>
          <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" style={{ width: `${(step / (STEPS_CONFIG.length - 1)) * 100}%` }}></div>
          
          <div className="relative z-10 flex justify-between">
            {STEPS_CONFIG.map((config, index) => {
              const Icon = config.icon;
              const isCompleted = index < step;
              const isCurrent = index === step;
              
              return (
                <div key={config.id} className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25' 
                      : isCurrent
                        ? 'bg-background border-primary text-primary shadow-lg shadow-primary/20 scale-110'
                        : 'bg-background border-border text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="p-8 shadow-lg shadow-foreground/5 border-muted/50 bg-background overflow-hidden relative">
          <div 
            key={step} 
            className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-both"
          >
            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Personal Details</h2>
                  <p className="text-sm text-muted-foreground">Provide the applicant's basic personal information.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-4 space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input id="middleName" value={formData.middleName} onChange={(e) => updateField('middleName', e.target.value)} />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="suffix">Suffix</Label>
                    <Input id="suffix" value={formData.suffix} onChange={(e) => updateField('suffix', e.target.value)} placeholder="Jr., III" />
                  </div>
                  <div className="md:col-span-5 space-y-2">
                    <Label htmlFor="birthDate">Birth Date <span className="text-destructive">*</span></Label>
                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => updateField('birthDate', e.target.value)} required />
                  </div>
                  <div className="md:col-span-4 space-y-2">
                    <Label htmlFor="sex">Sex <span className="text-destructive">*</span></Label>
                    <Select value={formData.sex} onValueChange={(val) => updateField('sex', val)}>
                      <SelectTrigger id="sex">
                        <SelectValue placeholder="Select sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-12 space-y-2">
                    <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                    <Input id="address" value={formData.address} onChange={(e) => updateField('address', e.target.value)} required placeholder="Full residential address" />
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+63 900 000 0000" />
                  </div>
                  <div className="md:col-span-6 space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="student@example.com" />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Academic History</h2>
                  <p className="text-sm text-muted-foreground">Select the program and level the applicant is applying for.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="educationLevelId">Education Level <span className="text-destructive">*</span></Label>
                    <Select value={formData.educationLevelId} onValueChange={(val) => updateField('educationLevelId', val)}>
                      <SelectTrigger id="educationLevelId">
                        <SelectValue placeholder="Select level..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(educationLevels?.data ?? []).map((level: any) => (
                          <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevelId">Grade/Year Level <span className="text-destructive">*</span></Label>
                    <Select value={formData.gradeLevelId} onValueChange={(val) => updateField('gradeLevelId', val)} disabled={!formData.educationLevelId}>
                      <SelectTrigger id="gradeLevelId">
                        <SelectValue placeholder={formData.educationLevelId ? "Select grade..." : "Select education level first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(gradeLevels?.data ?? []).map((level: any) => (
                          <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lrn">Learner Reference Number (LRN)</Label>
                    <Input id="lrn" value={formData.lrn} onChange={(e) => updateField('lrn', e.target.value)} placeholder="12-digit LRN (Optional)" maxLength={12} />
                    {formData.lrn && !/^\d{12}$/.test(formData.lrn) && (
                      <p className="text-xs text-destructive font-medium">LRN must be exactly 12 digits</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priorSchool">Previous School</Label>
                    <Input id="priorSchool" value={formData.priorSchool} onChange={(e) => updateField('priorSchool', e.target.value)} placeholder="Name of previous school (Optional)" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Guardian Information</h2>
                  <p className="text-sm text-muted-foreground">Emergency contact and primary guardian details.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="guardianFirstName">Guardian First Name <span className="text-destructive">*</span></Label>
                    <Input id="guardianFirstName" value={formData.guardianFirstName} onChange={(e) => updateField('guardianFirstName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianLastName">Guardian Last Name <span className="text-destructive">*</span></Label>
                    <Input id="guardianLastName" value={formData.guardianLastName} onChange={(e) => updateField('guardianLastName', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianRelationship">Relationship <span className="text-destructive">*</span></Label>
                    <Select value={formData.guardianRelationship} onValueChange={(val) => updateField('guardianRelationship', val)}>
                      <SelectTrigger id="guardianRelationship">
                        <SelectValue placeholder="Select relationship..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="guardian">Legal Guardian</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Contact Number <span className="text-destructive">*</span></Label>
                    <Input id="guardianPhone" type="tel" value={formData.guardianPhone} onChange={(e) => updateField('guardianPhone', e.target.value)} required placeholder="+63 900 000 0000" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="guardianEmail">Email Address</Label>
                    <Input id="guardianEmail" type="email" value={formData.guardianEmail} onChange={(e) => updateField('guardianEmail', e.target.value)} placeholder="guardian@example.com" />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Supporting Documents</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload necessary requirements. You may skip this and submit physical copies to the registrar later.
                  </p>
                </div>
                
                <div className="space-y-3 mt-4">
                  {['Birth Certificate (PSA)', 'Report Card / Form 138', 'Certificate of Good Moral Character', 'Medical Certificate'].map((docType) => (
                    <div key={docType} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 transition-colors bg-muted/20">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-background rounded-lg border shadow-sm">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{docType}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, or PNG (max 5MB)</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-9">
                        <Upload className="h-4 w-4 mr-2" /> Upload
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Ready to submit?</p>
                    <p className="text-sm text-primary/80 mt-1 leading-relaxed">
                      By submitting this application, you certify that all information provided is true and correct to the best of your knowledge.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-10 pt-6 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="w-28"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid()}
                className="w-28"
              >
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => submitApplication.mutate()}
                disabled={submitApplication.isPending}
                className="min-w-[140px]"
              >
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
