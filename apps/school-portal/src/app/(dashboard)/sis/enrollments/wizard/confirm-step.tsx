'use client';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from '@sms/ui';
import { AlertTriangle } from 'lucide-react';
import { EnrollmentFormData, EnrollmentFormDataPatch } from './types';

interface ConfirmStepProps {
  formData: EnrollmentFormData;
  selectedStudent?: any;
  schoolYears?: any;
  curricula?: any;
  sections?: any;
  hasBlockingHolds: boolean;
  activeHolds: any[];
  paymentPlans?: any;
  onCreateEnrollmentError: boolean;
  onCreateEnrollmentErrorMessage: string;
  onUpdate: (patch: EnrollmentFormDataPatch) => void;
}

export function ConfirmStep({
  formData, selectedStudent, schoolYears, curricula, sections, hasBlockingHolds, activeHolds,
  paymentPlans, onCreateEnrollmentError, onCreateEnrollmentErrorMessage, onUpdate,
}: ConfirmStepProps) {
  return (
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
            {((schoolYears?.data as any[]) ?? []).find((sy: any) => sy.id === formData.schoolYearId)?.name ?? formData.schoolYearId}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Curriculum</p>
          <p className="font-semibold">
            {((curricula?.data as any[]) ?? []).find((c: any) => c.id === formData.curriculumId)?.versionLabel ?? 'Curriculum'}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Section</p>
          <p className="font-semibold">
            {formData.sectionId ? ((sections?.data as any[]) ?? []).find((s: any) => s.id === formData.sectionId)?.name : 'Not assigned (Enrolled directly)'}
          </p>
        </div>
      </div>

      {onCreateEnrollmentError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">Enrollment Failed</p>
            <p className="text-xs text-destructive/90 mt-0.5">{onCreateEnrollmentErrorMessage}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-semibold text-lg">Billing & Invoice</h3>
        <div className="space-y-3">
          <Label htmlFor="paymentPlanId">Payment Plan (Generates Invoice)</Label>
          <Select value={formData.paymentPlanId} onValueChange={(val) => onUpdate({ paymentPlanId: val })}>
            <SelectTrigger id="paymentPlanId"><SelectValue placeholder="Full Payment (Default)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Full Payment (Default)</SelectItem>
              {((paymentPlans?.data as any[]) ?? []).map((plan: any) => (
                <SelectItem key={plan.id} value={plan.id}>{plan.name} ({plan.numberOfInstallments} Installments)</SelectItem>
              ))}
              <SelectItem value="custom">Custom (Specify installments)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.paymentPlanId === 'custom' && (
          <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <Label htmlFor="customInstallmentsCount" className="text-primary">Number of Installments</Label>
            <Input
              id="customInstallmentsCount" type="number" min={1}
              value={formData.customInstallmentsCount || ''}
              onChange={(e) => onUpdate({ customInstallmentsCount: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 5" className="border-primary/30"
            />
            <p className="text-xs text-primary/80 mt-1">The total balance will be split equally across these installments.</p>
          </div>
        )}
      </div>

      <div className="pt-2">
        <Label htmlFor="notes">Enrollment Notes (Optional)</Label>
        <textarea
          id="notes" value={formData.notes} onChange={(e) => onUpdate({ notes: e.target.value })}
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
  );
}
