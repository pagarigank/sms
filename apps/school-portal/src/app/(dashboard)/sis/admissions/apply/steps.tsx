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
    <div className="space-y-8">
      {/* Personal Details */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Personal Details</h2>
          <p className="text-sm text-muted-foreground">Provide the applicant's basic personal information.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">First Name <span className="text-destructive">*</span></label>
            <Input id="firstName" value={formData.firstName} onChange={(e) => onUpdate('firstName', e.target.value)} required />
          </div>
          <div className="md:col-span-4 space-y-2">
            <label htmlFor="middleName" className="text-sm font-medium">Middle Name</label>
            <Input id="middleName" value={formData.middleName} onChange={(e) => onUpdate('middleName', e.target.value)} />
          </div>
          <div className="md:col-span-4 space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">Last Name <span className="text-destructive">*</span></label>
            <Input id="lastName" value={formData.lastName} onChange={(e) => onUpdate('lastName', e.target.value)} required />
          </div>
          <div className="md:col-span-3 space-y-2">
            <label htmlFor="suffix" className="text-sm font-medium">Suffix</label>
            <Input id="suffix" value={formData.suffix} onChange={(e) => onUpdate('suffix', e.target.value)} placeholder="Jr., III, etc." />
          </div>
          <div className="md:col-span-5 space-y-2">
            <label htmlFor="birthDate" className="text-sm font-medium">Birth Date <span className="text-destructive">*</span></label>
            <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => onUpdate('birthDate', e.target.value)} required />
          </div>
          <div className="md:col-span-4 space-y-2">
            <label htmlFor="sex" className="text-sm font-medium">Sex <span className="text-destructive">*</span></label>
            <Select value={formData.sex} onValueChange={(val) => onUpdate('sex', val)}>
              <SelectTrigger id="sex"><SelectValue placeholder="Select sex" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-12 space-y-2">
            <label htmlFor="address" className="text-sm font-medium">Residential Address <span className="text-destructive">*</span></label>
            <Input id="address" value={formData.address} onChange={(e) => onUpdate('address', e.target.value)} required placeholder="Full residential address" />
          </div>
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
            <Input id="phone" type="tel" value={formData.phone} onChange={(e) => onUpdate('phone', e.target.value)} placeholder="+63 900 000 0000" />
          </div>
          <div className="md:col-span-6 space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email Address</label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => onUpdate('email', e.target.value)} placeholder="student@example.com" />
          </div>
        </div>
      </div>

      {/* Government ID */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Government Identification</h3>
          <p className="text-sm text-muted-foreground">For PSA/COMELEC verification purposes. Optional but recommended.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="govIdType" className="text-sm font-medium">ID Type</label>
            <Select value={formData.govIdType ?? ''} onValueChange={(val) => onUpdate('govIdType', val)}>
              <SelectTrigger id="govIdType"><SelectValue placeholder="Select ID type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PSA Birth Certificate">PSA Birth Certificate</SelectItem>
                <SelectItem value="PhilSys ID">PhilSys ID (National ID)</SelectItem>
                <SelectItem value="Passport">Passport</SelectItem>
                <SelectItem value="UMID">UMID</SelectItem>
                <SelectItem value="Driver's License">Driver's License</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="govIdNumber" className="text-sm font-medium">ID Number</label>
            <Input id="govIdNumber" value={formData.govIdNumber ?? ''} onChange={(e) => onUpdate('govIdNumber', e.target.value)} placeholder="ID number" />
          </div>
        </div>
      </div>

      {/* Health & Special Needs */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Health & Special Needs</h3>
          <p className="text-sm text-muted-foreground">Optional information to support the student's welfare.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label htmlFor="healthFlags" className="text-sm font-medium">Health Flags / Conditions</label>
            <Input id="healthFlags" value={formData.healthFlags ?? ''} onChange={(e) => onUpdate('healthFlags', e.target.value)} placeholder="e.g., Asthma, Diabetes, Allergy to penicillin" />
          </div>
          <div className="space-y-2">
            <label htmlFor="iepNotes" className="text-sm font-medium">IEP / Special Education Notes</label>
            <Input id="iepNotes" value={formData.iepNotes ?? ''} onChange={(e) => onUpdate('iepNotes', e.target.value)} placeholder="e.g., Student has an IEP for dyslexia" />
          </div>
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
