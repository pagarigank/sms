'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Archive, CheckCircle2, Info } from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useToast,
  useConfirm,
} from '@sms/ui';
import { apiClient } from '@/lib/api';
import { useTenantStore } from '@/lib/store';

export default function GradeComponentsPage() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [order, setOrder] = useState('');

  const { data: systemsRes } = useQuery({
    queryKey: ['grading-systems', currentTenantId],
    queryFn: () => apiClient.grading.listGradingSystems(),
    enabled: !!currentTenantId,
  });

  const { data: componentsRes, isLoading } = useQuery({
    queryKey: ['grade-components', selectedSystemId],
    queryFn: () => apiClient.grading.listGradeComponents(selectedSystemId),
    enabled: !!selectedSystemId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiClient.grading.createGradeComponent(data),
    onSuccess: () => {
      toast({ title: 'Component created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['grade-components'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error creating component', description: err.message, variant: 'destructive' });
    },
  });

  const systems = (systemsRes?.data ?? []) as any[];
  const components = (componentsRes?.data ?? []) as any[];
  const selectedSystem = systems.find((s: any) => s.id === selectedSystemId);
  const isDescriptiveKS1 = selectedSystem?.type === 'descriptive_ks1';

  const handleOpenModal = () => {
    setName('');
    setWeight('');
    setOrder('');
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Weight (%)', accessorKey: 'weight' },
    { header: 'Order', accessorKey: 'order' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Components"
        description="Define the weighted components (e.g., Written Work, Exams) for a grading system."
        actions={
          <Button onClick={handleOpenModal} disabled={!selectedSystemId || isDescriptiveKS1} title={isDescriptiveKS1 ? 'KS1 Descriptive systems have no grade components' : undefined}>
            <Plus className="mr-2 h-4 w-4" /> Add Component
          </Button>
        }
      />

      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Components</CardTitle>
            <div className="w-72">
              <Select value={selectedSystemId} onValueChange={setSelectedSystemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Grading System..." />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedSystemId ? (
            <DataTable
              columns={columns}
              data={components}
              isLoading={isLoading}
              searchKey="name"
            />
          ) : (
            <div className="flex h-48 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a Grading System above to view its components.
            </div>
          )}
        </CardContent>
      </Card>

      {/* KS1 Descriptive Info Panel */}
      {isDescriptiveKS1 && selectedSystem && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-sm">
          <Info className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-amber-300">Descriptive KS1 System — No Weighted Components</p>
            <p className="text-amber-200/80 mt-1">
              This grading system uses qualitative descriptors instead of numeric scores.
              Teachers will select a descriptor per student per subject per term directly in the Gradebook.
            </p>
            {selectedSystem.config?.descriptors && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedSystem.config.descriptors.map((d: any) => (
                  <span key={d.value} className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                    <span className="font-bold text-amber-300">{d.shortLabel}</span> — {d.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Grade Component</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                gradingSystemId: selectedSystemId,
                name,
                weight: Number(weight),
                order: Number(order) || 0,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Performance Task" />
            </div>

            <div className="space-y-2">
              <Label>Weight (%)</Label>
              <Input type="number" required min="0" max="100" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 30" />
            </div>

            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" required value={order} onChange={(e) => setOrder(e.target.value)} placeholder="e.g. 1" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !name || !weight}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
