import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { apiClient } from '@/lib/api';

export function ScreeningModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { screeningType: 'vision', screeningName: '', screeningDate: '', result: '', status: 'complete', followUpRequired: false });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { screeningType: 'vision', screeningName: '', screeningDate: '', result: '', status: 'complete', followUpRequired: false }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateScreening(studentId, initialData.id, form) : apiClient.sis.addScreening(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Screening' : 'Add Screening'}</DialogTitle>
          <DialogDescription>Record a screening</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Type</Label>
            <Select value={form.screeningType} onValueChange={(v: any) => setForm({ ...form, screeningType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vision">Vision</SelectItem>
                <SelectItem value="hearing">Hearing</SelectItem>
                <SelectItem value="scoliosis">Scoliosis</SelectItem>
                <SelectItem value="dental">Dental</SelectItem>
                <SelectItem value="developmental">Developmental</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Screening Date</Label><Input type="date" value={form.screeningDate} onChange={(e: any) => setForm({ ...form, screeningDate: e.target.value })} /></div>
          <div><Label>Result / Value</Label><Input value={form.result} onChange={(e: any) => setForm({ ...form, result: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Follow-up Required?</Label>
            <Select value={form.followUpRequired ? 'yes' : 'no'} onValueChange={(v: any) => setForm({ ...form, followUpRequired: v === 'yes' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
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

export function IEPModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { iepNumber: '', startDate: '', endDate: '', nextReviewDate: '', primaryDisability: '', status: 'active' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { iepNumber: '', startDate: '', endDate: '', nextReviewDate: '', primaryDisability: '', status: 'active' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateIEP(studentId, initialData.id, form) : apiClient.sis.addIEP(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit IEP' : 'Add IEP'}</DialogTitle>
          <DialogDescription>Record Individualized Education Program</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>IEP Number</Label><Input value={form.iepNumber} onChange={(e: any) => setForm({ ...form, iepNumber: e.target.value })} /></div>
          <div><Label>Primary Disability</Label><Input value={form.primaryDisability} onChange={(e: any) => setForm({ ...form, primaryDisability: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e: any) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div><Label>Next Review Date</Label><Input type="date" value={form.nextReviewDate} onChange={(e: any) => setForm({ ...form, nextReviewDate: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
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

export function Plan504Modal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { planNumber: '', disability: '', startDate: '', endDate: '', status: 'active' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { planNumber: '', disability: '', startDate: '', endDate: '', status: 'active' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.update504Plan(studentId, initialData.id, form) : apiClient.sis.add504Plan(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit 504 Plan' : 'Add 504 Plan'}</DialogTitle>
          <DialogDescription>Record a 504 Accessibility Plan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Plan Number</Label><Input value={form.planNumber} onChange={(e: any) => setForm({ ...form, planNumber: e.target.value })} /></div>
          <div><Label>Disability/Condition</Label><Input value={form.disability} onChange={(e: any) => setForm({ ...form, disability: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e: any) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
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

export function EvaluationModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { evaluationType: 'psychological', evaluationDate: '', eligibilityCategory: '', status: 'pending' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { evaluationType: 'psychological', evaluationDate: '', eligibilityCategory: '', status: 'pending' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateEvaluation(studentId, initialData.id, form) : apiClient.sis.addEvaluation(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Evaluation' : 'Add Evaluation'}</DialogTitle>
          <DialogDescription>Record an academic or psychological evaluation</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Type</Label>
            <Select value={form.evaluationType} onValueChange={(v: any) => setForm({ ...form, evaluationType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="psychological">Psychological</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="speech_language">Speech & Language</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="occupational">Occupational Therapy</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Evaluation Date</Label><Input type="date" value={form.evaluationDate} onChange={(e: any) => setForm({ ...form, evaluationDate: e.target.value })} /></div>
          <div><Label>Eligibility Category</Label><Input value={form.eligibilityCategory} onChange={(e: any) => setForm({ ...form, eligibilityCategory: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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

export function AccommodationModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { category: 'testing', description: '', setting: '', status: 'active' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { category: 'testing', description: '', setting: '', status: 'active' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateAccommodation(studentId, initialData.id, form) : apiClient.sis.addAccommodation(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Accommodation' : 'Add Accommodation'}</DialogTitle>
          <DialogDescription>Record a specific accommodation</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v: any) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="classroom">Classroom</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="instructional">Instructional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Setting</Label><Input value={form.setting} onChange={(e: any) => setForm({ ...form, setting: e.target.value })} placeholder="e.g. All classes, Testing only" /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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
