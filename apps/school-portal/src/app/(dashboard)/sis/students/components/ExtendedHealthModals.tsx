import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { useTenantStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

export function ImmunizationModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { vaccineName: '', administeredDate: '', status: 'complete', nextDueDate: '', doseNumber: '' });
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenantStore();

  useEffect(() => { setForm(initialData || { vaccineName: '', administeredDate: '', status: 'complete', nextDueDate: '', doseNumber: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateImmunization(studentId, initialData.id, form) : apiClient.sis.addImmunization(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Immunization' : 'Add Immunization'}</DialogTitle>
          <DialogDescription>Record a vaccine administration</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Vaccine Name</Label><Input value={form.vaccineName} onChange={(e: any) => setForm({ ...form, vaccineName: e.target.value })} /></div>
          <div><Label>Administered Date</Label><Input type="date" value={form.administeredDate} onChange={(e: any) => setForm({ ...form, administeredDate: e.target.value })} /></div>
          <div><Label>Next Due Date (Optional)</Label><Input type="date" value={form.nextDueDate} onChange={(e: any) => setForm({ ...form, nextDueDate: e.target.value })} /></div>
          <div><Label>Dose Number</Label><Input value={form.doseNumber} onChange={(e: any) => setForm({ ...form, doseNumber: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="exempt">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MedicationModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { medicationName: '', dosage: '', frequency: '', status: 'active', prescriber: '' });
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenantStore();

  useEffect(() => { setForm(initialData || { medicationName: '', dosage: '', frequency: '', status: 'active', prescriber: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateMedication(studentId, initialData.id, form) : apiClient.sis.addMedication(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
          <DialogDescription>Record a student medication</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Medication Name</Label><Input value={form.medicationName} onChange={(e: any) => setForm({ ...form, medicationName: e.target.value })} /></div>
          <div><Label>Dosage</Label><Input value={form.dosage} onChange={(e: any) => setForm({ ...form, dosage: e.target.value })} /></div>
          <div><Label>Frequency</Label><Input value={form.frequency} onChange={(e: any) => setForm({ ...form, frequency: e.target.value })} /></div>
          <div><Label>Prescriber</Label><Input value={form.prescriber} onChange={(e: any) => setForm({ ...form, prescriber: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
                <SelectItem value="as_needed">As Needed (PRN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CarePlanModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { title: '', condition: '', status: 'active', description: '' });
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenantStore();

  useEffect(() => { setForm(initialData || { title: '', condition: '', status: 'active', description: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateCarePlan(studentId, initialData.id, form) : apiClient.sis.addCarePlan(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Care Plan' : 'Add Care Plan'}</DialogTitle>
          <DialogDescription>Record a student care plan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Plan Title</Label><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Condition</Label><Input value={form.condition} onChange={(e: any) => setForm({ ...form, condition: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AllergyModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { allergen: '', severity: 'mild', reaction: '', status: 'active', treatment: '' });
  const queryClient = useQueryClient();
  const { currentTenantId } = useTenantStore();

  useEffect(() => { setForm(initialData || { allergen: '', severity: 'mild', reaction: '', status: 'active', treatment: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateAllergy(studentId, initialData.id, form) : apiClient.sis.addAllergy(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Allergy' : 'Add Allergy'}</DialogTitle>
          <DialogDescription>Record a student allergy</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Allergen</Label><Input value={form.allergen} onChange={(e: any) => setForm({ ...form, allergen: e.target.value })} /></div>
          <div><Label>Reaction</Label><Input value={form.reaction} onChange={(e: any) => setForm({ ...form, reaction: e.target.value })} /></div>
          <div><Label>Treatment</Label><Input value={form.treatment} onChange={(e: any) => setForm({ ...form, treatment: e.target.value })} /></div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
