'use client';

import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { EducationFormData } from './types';

interface StudentInfoStepProps {
  formData: EducationFormData;
  educationLevels?: { data?: any[] };
  gradeLevels?: { data?: any[] };
  onUpdate: (field: keyof EducationFormData, value: string) => void;
}

export function StudentInfoStep({ formData, onUpdate }: StudentInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Personal Details</h2>
        <p className="text-sm text-muted-foreground">Provide the applicant's basic personal information.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-2">
          <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
          <Input id="firstName" value={formData.firstName} onChange={(e) => onUpdate('firstName', e.target.value)} required />
        </div>
        <div className="md:col-span-4 space-y-2">
          <Label htmlFor="middleName">Middle Name</Label>
          <Input id="middleName" value={formData.middleName} onChange={(e) => onUpdate('middleName', e.target.value)} />
        </div>
        <div className="md:col-span-4 space-y-2">
          <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
          <Input id="lastName" value={formData.lastName} onChange={(e) => onUpdate('lastName', e.target.value)} required />
        </div>
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="suffix">Suffix</Label>
          <Input id="suffix" value={formData.suffix} onChange={(e) => onUpdate('suffix', e.target.value)} placeholder="Jr., III" />
        </div>
        <div className="md:col-span-5 space-y-2">
          <Label htmlFor="birthDate">Birth Date <span className="text-destructive">*</span></Label>
          <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => onUpdate('birthDate', e.target.value)} required />
        </div>
        <div className="md:col-span-4 space-y-2">
          <Label htmlFor="sex">Sex <span className="text-destructive">*</span></Label>
          <Select value={formData.sex} onValueChange={(val) => onUpdate('sex', val)}>
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
          <Input id="address" value={formData.address} onChange={(e) => onUpdate('address', e.target.value)} required placeholder="Full residential address" />
        </div>
        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => onUpdate('phone', e.target.value)} placeholder="+63 900 000 0000" />
        </div>
        <div className="md:col-span-6 space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => onUpdate('email', e.target.value)} placeholder="student@example.com" />
        </div>
      </div>
    </div>
  );
}

interface AcademicStepProps {
  formData: EducationFormData;
  educationLevels?: { data?: any[] };
  gradeLevels?: { data?: any[] };
  onUpdate: (field: keyof EducationFormData, value: string) => void;
}

export function AcademicStep({ formData, educationLevels, gradeLevels, onUpdate }: AcademicStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Academic History</h2>
        <p className="text-sm text-muted-foreground">Select the program and level the applicant is applying for.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="educationLevelId">Education Level <span className="text-destructive">*</span></Label>
          <Select value={formData.educationLevelId} onValueChange={(val) => onUpdate('educationLevelId', val)}>
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
          <Select value={formData.gradeLevelId} onValueChange={(val) => onUpdate('gradeLevelId', val)} disabled={!formData.educationLevelId}>
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
          <Input id="lrn" value={formData.lrn} onChange={(e) => onUpdate('lrn', e.target.value)} placeholder="12-digit LRN (Optional)" maxLength={12} />
          {formData.lrn && !/^\d{12}$/.test(formData.lrn) && (
            <p className="text-xs text-destructive font-medium">LRN must be exactly 12 digits</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="priorSchool">Previous School</Label>
          <Input id="priorSchool" value={formData.priorSchool} onChange={(e) => onUpdate('priorSchool', e.target.value)} placeholder="Name of previous school (Optional)" />
        </div>
      </div>
    </div>
  );
}

interface GuardianStepProps {
  formData: EducationFormData;
  onUpdate: (field: keyof EducationFormData, value: string) => void;
}

export function GuardianStep({ formData, onUpdate }: GuardianStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Guardian Information</h2>
        <p className="text-sm text-muted-foreground">Emergency contact and primary guardian details.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="guardianFirstName">Guardian First Name <span className="text-destructive">*</span></Label>
          <Input id="guardianFirstName" value={formData.guardianFirstName} onChange={(e) => onUpdate('guardianFirstName', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianLastName">Guardian Last Name <span className="text-destructive">*</span></Label>
          <Input id="guardianLastName" value={formData.guardianLastName} onChange={(e) => onUpdate('guardianLastName', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianRelationship">Relationship <span className="text-destructive">*</span></Label>
          <Select value={formData.guardianRelationship} onValueChange={(val) => onUpdate('guardianRelationship', val)}>
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
          <Input id="guardianPhone" type="tel" value={formData.guardianPhone} onChange={(e) => onUpdate('guardianPhone', e.target.value)} required placeholder="+63 900 000 0000" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="guardianEmail">Email Address</Label>
          <Input id="guardianEmail" type="email" value={formData.guardianEmail} onChange={(e) => onUpdate('guardianEmail', e.target.value)} placeholder="guardian@example.com" />
        </div>
      </div>
    </div>
  );
}

export function DocumentsStep() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const docTypes = [
    { name: 'Birth Certificate (PSA)', note: 'Certified true copy from the Philippine Statistics Authority' },
    { name: 'Report Card / Form 138', note: 'Latest report card from the previous school (if applicable)' },
    { name: 'Certificate of Good Moral Character', note: 'Issued by the previous school within the last 6 months' },
    { name: 'Medical Certificate', note: 'Physical exam clearance from a licensed physician' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Supporting Documents</h2>
        <p className="text-sm text-muted-foreground">
          These are the requirements collected by the registrar at submission. Mark which ones you can provide now;
          you may also submit physical copies in person.
        </p>
      </div>
      <div className="space-y-3 mt-4">
        {docTypes.map((docType) => (
          <label
            key={docType.name}
            className="flex items-start gap-4 p-4 border rounded-xl hover:border-primary/50 transition-colors bg-muted/20 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={!!checked[docType.name]}
              onChange={(e) => setChecked((prev) => ({ ...prev, [docType.name]: e.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
            />
            <div className="flex items-start gap-4 flex-1">
              <div className="p-2 bg-background rounded-lg border shadow-sm">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">{docType.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{docType.note}</p>
              </div>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-primary">Ready to submit?</p>
          <p className="text-sm text-primary/80 mt-1 leading-relaxed">
            By submitting this application, you certify that all information provided is true and correct to the best
            of your knowledge. The registrar will verify required documents when they are submitted.
          </p>
        </div>
      </div>
    </div>
  );
}
