'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusDot,
  statusToVariant,
  useConfirm,
  useToast,
} from '@sms/ui';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, GraduationCap, Edit, Trash2, BookOpen } from 'lucide-react';
import { cn } from '@sms/utils';

interface GradeLevel {
  id: string;
  educationLevelId: string;
  code: string;
  name: string;
  sortOrder: number;
  educationLevelName?: string;
  tenantId: string;
  createdAt: string;
}

interface EducationLevel {
  id: string;
  name: string;
  code: string;
}

export default function GradeLevelsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [educationLevelFilter, setEducationLevelFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [form, setForm] = useState({
    educationLevelId: '',
    code: '',
    name: '',
    sortOrder: 0,
  });

  const { data: gradeLevelsRes, isLoading } = useQuery({
    queryKey: ['grade-levels', searchQuery, educationLevelFilter],
    queryFn: () => apiClient.academic.listGradeLevels({
      limit: 100,
      search: searchQuery,
      educationLevelId: educationLevelFilter === 'all' ? undefined : educationLevelFilter,
    }),
  });

  const { data: educationLevelsRes } = useQuery({
    queryKey: ['education-levels'],
    queryFn: () => apiClient.academic.listEducationLevels(),
  });

  const educationLevels: EducationLevel[] = educationLevelsRes?.data ?? [];
  const gradeLevels: GradeLevel[] = gradeLevelsRes?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.academic.createGradeLevel({
      ...data,
      sortOrder: data.sortOrder,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      setShowCreate(false);
      setForm({ educationLevelId: '', code: '', name: '', sortOrder: 0 });
      toast({ title: 'Grade Level created', description: 'Grade level has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: GradeLevel) => apiClient.academic.updateGradeLevel(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      setEditingGradeLevel(null);
      toast({ title: 'Grade Level updated', description: 'Grade level has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.academic.deleteGradeLevel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-levels'] });
      toast({ title: 'Grade Level deleted', description: 'Grade level has been permanently deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (gradeLevel: GradeLevel) => {
    setForm({
      educationLevelId: gradeLevel.educationLevelId,
      code: gradeLevel.code,
      name: gradeLevel.name,
      sortOrder: gradeLevel.sortOrder,
    });
    setEditingGradeLevel(gradeLevel);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sortOrderValue = form.sortOrder;
    if (editingGradeLevel) {
      updateMutation.mutate({ ...form, id: editingGradeLevel.id, sortOrder: sortOrderValue } as GradeLevel);
    } else {
      createMutation.mutate({ ...form, sortOrder: sortOrderValue });
    }
  };

  const columns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.educationLevelName || row.original.educationLevelId}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'educationLevelName',
      header: 'Education Level',
      cell: ({ row }) => row.original.educationLevelName || row.original.educationLevelId,
    },
    {
      accessorKey: 'sortOrder',
      header: 'Order',
      cell: ({ row }) => <span className="font-medium">{row.original.sortOrder}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const gradeLevel = row.original;
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(gradeLevel)}
              className="h-8 w-8 p-0"
              aria-label="Edit grade level"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: `Delete ${gradeLevel.name}?`,
                  description: "This action cannot be undone.",
                  confirmLabel: "Delete",
                  destructive: true,
                });
                if (ok) deleteMutation.mutate(gradeLevel.id);
              }}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              aria-label="Delete grade level"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
            title="Grade Levels"
            description="Manage grade/year levels per education level"
            actions={
              <Button onClick={() => setShowCreate(true)}>
                <span className="flex items-center space-x-1">
                  <Plus className="h-4 w-4" />
                  <span>Add Grade Level</span>
                </span>
              </Button>
            }
          />

        {showCreate && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Grade Level</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="educationLevelId">Education Level</Label>
                  <Select
                    value={form.educationLevelId}
                    onValueChange={(value) => setForm({ ...form, educationLevelId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name} ({level.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="code">Code</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="7, 11, 1st Year"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Grade 7, Grade 11, 1st Year"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {editingGradeLevel && (
          <Dialog open={!!editingGradeLevel} onOpenChange={(open) => !open && setEditingGradeLevel(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Grade Level</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="edit-educationLevelId">Education Level</Label>
                  <Select
                    value={form.educationLevelId}
                    onValueChange={(value) => setForm({ ...form, educationLevelId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name} ({level.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-code">Code</Label>
                    <Input
                      id="edit-code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-sortOrder">Sort Order</Label>
                  <Input
                    id="edit-sortOrder"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingGradeLevel(null)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grade levels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={educationLevelFilter}
              onValueChange={(value) => setEducationLevelFilter(value)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Education Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Education Levels</SelectItem>
                {educationLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={gradeLevels}
          isLoading={isLoading}
          emptyMessage="No grade levels found."
          emptyDescription="Get started by creating your first grade level."
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Create Grade Level</span>
            </Button>
          }
        />

      </div>
    </>
  );
}