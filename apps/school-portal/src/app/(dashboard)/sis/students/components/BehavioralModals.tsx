import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sms/ui';
import { apiClient } from '@/lib/api';

export function DisciplineIncidentModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { reportDate: '', severity: 'minor', status: 'open' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { reportDate: '', severity: 'minor', status: 'open' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateDisciplineIncident(studentId, initialData.id, form) : apiClient.sis.addDisciplineIncident(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Discipline Incident' : 'Add Discipline Incident'}</DialogTitle>
          <DialogDescription>Record a behavioral incident.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Report Date</Label><Input type="date" value={form.reportDate} onChange={(e: any) => setForm({ ...form, reportDate: e.target.value })} /></div>
          <div>
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v: any) => setForm({ ...form, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
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
                <SelectItem value="open">Open</SelectItem>
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

export function InterventionModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { interventionName: '', tier: 'tier-1', category: '', focusArea: '', startDate: '', status: 'active' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { interventionName: '', tier: 'tier-1', category: '', focusArea: '', startDate: '', status: 'active' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateIntervention(studentId, initialData.id, form) : apiClient.sis.addIntervention(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Intervention' : 'Add Intervention'}</DialogTitle>
          <DialogDescription>Record an MTSS/RTI intervention.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Intervention Name</Label><Input value={form.interventionName} onChange={(e: any) => setForm({ ...form, interventionName: e.target.value })} /></div>
          <div><Label>Focus Area</Label><Input value={form.focusArea} onChange={(e: any) => setForm({ ...form, focusArea: e.target.value })} /></div>
          <div>
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v: any) => setForm({ ...form, tier: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tier-1">Tier 1 (Universal)</SelectItem>
                <SelectItem value="tier-2">Tier 2 (Targeted)</SelectItem>
                <SelectItem value="tier-3">Tier 3 (Intensive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
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

export function SELAssessmentModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { assessmentName: '', assessmentDate: '', assessmentType: '', status: 'complete' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { assessmentName: '', assessmentDate: '', assessmentType: '', status: 'complete' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateSELAssessment(studentId, initialData.id, form) : apiClient.sis.addSELAssessment(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit SEL Assessment' : 'Add SEL Assessment'}</DialogTitle>
          <DialogDescription>Record a Social-Emotional Learning assessment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Assessment Name</Label><Input value={form.assessmentName} onChange={(e: any) => setForm({ ...form, assessmentName: e.target.value })} /></div>
          <div><Label>Assessment Date</Label><Input type="date" value={form.assessmentDate} onChange={(e: any) => setForm({ ...form, assessmentDate: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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

export function LearningProfileModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { primaryLearningStyle: '', secondaryLearningStyle: '', assessmentDate: '' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { primaryLearningStyle: '', secondaryLearningStyle: '', assessmentDate: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateLearningProfile(studentId, initialData.id, form) : apiClient.sis.addLearningProfile(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Learning Profile' : 'Add Learning Profile'}</DialogTitle>
          <DialogDescription>Record learning styles and preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Primary Learning Style</Label>
            <Select value={form.primaryLearningStyle} onValueChange={(v: any) => setForm({ ...form, primaryLearningStyle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="auditory">Auditory</SelectItem>
                <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                <SelectItem value="reading/writing">Reading/Writing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Secondary Learning Style</Label>
            <Select value={form.secondaryLearningStyle} onValueChange={(v: any) => setForm({ ...form, secondaryLearningStyle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="auditory">Auditory</SelectItem>
                <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                <SelectItem value="reading/writing">Reading/Writing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Assessment Date</Label><Input type="date" value={form.assessmentDate} onChange={(e: any) => setForm({ ...form, assessmentDate: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GoalModal({ isOpen, onClose, studentId, initialData }: any) {
  const [form, setForm] = useState(initialData || { title: '', category: '', type: '', status: 'active', startDate: '', targetDate: '' });
  const queryClient = useQueryClient();

  useEffect(() => { setForm(initialData || { title: '', category: '', type: '', status: 'active', startDate: '', targetDate: '' }); }, [initialData, isOpen]);

  const saveMutation = useMutation({
    mutationFn: () => initialData ? apiClient.sis.updateGoal(studentId, initialData.id, form) : apiClient.sis.addGoal(studentId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] });
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open: any) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
          <DialogDescription>Record a student goal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Goal Title</Label><Input value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e: any) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Academic, Behavioral" /></div>
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><Label>Target Date</Label><Input type="date" value={form.targetDate} onChange={(e: any) => setForm({ ...form, targetDate: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="met">Met</SelectItem>
                <SelectItem value="not-met">Not Met</SelectItem>
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
