'use client';

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Badge } from '@sms/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Layers, X, AlertTriangle } from 'lucide-react';
import { cn } from '@sms/utils';
import { EnrollmentFormData, EnrollmentFormDataPatch } from './types';

interface StudentSearchStepProps {
  formData: EnrollmentFormData;
  students?: any;
  studentSearch: string;
  onCreateStudent: () => void;
  onCreateStudentError: boolean;
  onCreateStudentErrorMessage: string;
  onUpdate: (patch: EnrollmentFormDataPatch) => void;
}

export function StudentSearchStep({
  formData, students, studentSearch, onCreateStudent, onCreateStudentError,
  onCreateStudentErrorMessage, onUpdate,
}: StudentSearchStepProps) {
  const studentList = ((students?.data as any[]) ?? [])
    .filter((s: any) => s.status === 'active' || s.status === 'admitted')
    .filter((s: any) =>
      !studentSearch ||
      `${s.firstName} ${s.lastName} ${s.lrn ?? ''} ${s.studentNumber ?? ''}`.toLowerCase().includes(studentSearch.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Select Student</h2>
          <p className="text-sm text-muted-foreground">Find an existing student or create a new profile.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          <button
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              !formData.isNewStudent ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
            onClick={() => onUpdate({ isNewStudent: false })}
          >
            Existing Student
          </button>
          <button
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              formData.isNewStudent ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
            onClick={() => onUpdate({ isNewStudent: true, studentId: '' })}
          >
            New Student
          </button>
        </div>
      </div>

      {!formData.isNewStudent ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text" value={studentSearch} onChange={(e) => onUpdate({ studentSearch: e.target.value })}
              placeholder="Search by name, LRN, or student number..." className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2">
            {studentList.map((student: any) => (
              <button
                key={student.id}
                onClick={() => onUpdate({ studentId: student.id })}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40',
                  formData.studentId === student.id ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-transparent bg-muted/40',
                )}
              >
                <p className="font-semibold">{student.lastName}, {student.firstName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  LRN: {student.lrn || 'N/A'} <span className="mx-1">•</span> ID: {student.studentNumber || '—'}
                </p>
              </button>
            ))}
            {studentList.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">No students found matching your search.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-dashed bg-muted/10">
          <div className="space-y-2">
            <Label htmlFor="newStudentFirstName">First Name <span className="text-destructive">*</span></Label>
            <Input id="newStudentFirstName" value={formData.newStudentFirstName} onChange={(e) => onUpdate({ newStudentFirstName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentLastName">Last Name <span className="text-destructive">*</span></Label>
            <Input id="newStudentLastName" value={formData.newStudentLastName} onChange={(e) => onUpdate({ newStudentLastName: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentLrn">LRN</Label>
            <Input id="newStudentLrn" value={formData.newStudentLrn} onChange={(e) => onUpdate({ newStudentLrn: e.target.value })} placeholder="12 digits" maxLength={12} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentBirthDate">Birth Date</Label>
            <Input id="newStudentBirthDate" type="date" value={formData.newStudentBirthDate} onChange={(e) => onUpdate({ newStudentBirthDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentGender">Gender</Label>
            <Select value={formData.newStudentGender} onValueChange={(val) => onUpdate({ newStudentGender: val })}>
              <SelectTrigger id="newStudentGender"><SelectValue placeholder="Select gender..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentEmail">Email</Label>
            <Input id="newStudentEmail" type="email" value={formData.newStudentEmail} onChange={(e) => onUpdate({ newStudentEmail: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newStudentPhone">Phone</Label>
            <Input id="newStudentPhone" type="tel" value={formData.newStudentPhone} onChange={(e) => onUpdate({ newStudentPhone: e.target.value })} />
          </div>
        </div>
      )}

      {onCreateStudentError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-sm text-destructive">Failed to create student</p>
            <p className="text-xs text-destructive/90 mt-0.5">{onCreateStudentErrorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface CurriculumStepProps {
  formData: EnrollmentFormData;
  schoolYears?: { data?: any[] };
  curricula?: { data?: any[] };
  onUpdate: (patch: Partial<EnrollmentFormData>) => void;
}

export function CurriculumStep({ formData, schoolYears, curricula, onUpdate }: CurriculumStepProps) {
  const curriculumList = ((curricula?.data as any[]) ?? []).filter(
    (c: any) => c.schoolYearId === formData.schoolYearId && c.status === 'active',
  );
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Select Curriculum</h2>
        <p className="text-sm text-muted-foreground">Choose the active school year and appropriate curriculum.</p>
      </div>
      <div className="space-y-6">
        <div className="space-y-2 max-w-md">
          <Label htmlFor="schoolYearId">School Year <span className="text-destructive">*</span></Label>
          <Select value={formData.schoolYearId} onValueChange={(val) => onUpdate({ schoolYearId: val, curriculumId: '' })}>
            <SelectTrigger id="schoolYearId"><SelectValue placeholder="Select school year..." /></SelectTrigger>
            <SelectContent>
              {(schoolYears?.data ?? []).map((sy: any) => (
                <SelectItem key={sy.id} value={sy.id}>{sy.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {formData.schoolYearId && (
          <div className="space-y-3">
            <Label>Curriculum <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {curriculumList.map((curr: any) => (
                <button
                  key={curr.id}
                  onClick={() => onUpdate({ curriculumId: curr.id })}
                  className={cn(
                    'text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40',
                    formData.curriculumId === curr.id ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-transparent bg-muted/40',
                  )}
                >
                  <p className="font-semibold">{curr.versionLabel || 'Curriculum'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Level: {curr.educationLevelId} {curr.gradeLevelId ? `| Grade: ${curr.gradeLevelId}` : ''}
                  </p>
                </button>
              ))}
              {curriculumList.length === 0 && (
                <div className="col-span-full py-8 text-center text-muted-foreground rounded-xl border border-dashed">
                  No active curricula available for this school year.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SubjectsStepProps {
  formData: EnrollmentFormData;
  curriculumSubjects?: { data?: any[] };
  allSubjects?: { data?: any[] };
  currYearLevels?: { data?: any[] };
  curriculumTerms?: { data?: any[] };
  onUpdate: (patch: Partial<EnrollmentFormData>) => void;
}

export function SubjectsStep({ formData, curriculumSubjects, allSubjects, currYearLevels, curriculumTerms, onUpdate }: SubjectsStepProps) {
  const loadBatchSubjects = () => {
    const currSubjectsList = (curriculumSubjects?.data as any[]) ?? [];
    const filtered = currSubjectsList.filter((cs: any) => {
      let match = true;
      if (formData.targetYearLevelId && formData.targetYearLevelId !== 'none' && cs.yearLevelId !== formData.targetYearLevelId) match = false;
      if (formData.targetTermId && formData.targetTermId !== 'none' && cs.termId !== formData.targetTermId) match = false;
      return match;
    });
    const ids = filtered.map((cs: any) => cs.subjectId);
    onUpdate({ subjectIds: Array.from(new Set([...formData.subjectIds, ...ids])) });
  };

  const allSubjectsList = (allSubjects?.data as any[]) ?? [];
  const selectedSubjects = formData.subjectIds.map((id) => allSubjectsList.find((s: any) => s.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="space-y-1 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Select Subjects</h2>
          <p className="text-sm text-muted-foreground">Load batch subjects from curriculum or select manually (Optional).</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-end gap-3 p-5 border rounded-xl bg-muted/20">
        <div className="flex-1 w-full space-y-2">
          <Label htmlFor="targetYearLevelId">Target Year Level</Label>
          <Select value={formData.targetYearLevelId} onValueChange={(val) => onUpdate({ targetYearLevelId: val })}>
            <SelectTrigger id="targetYearLevelId"><SelectValue placeholder="Any / All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any / All</SelectItem>
              {((currYearLevels?.data as any[]) ?? []).map((yl: any) => (
                <SelectItem key={yl.id} value={yl.id}>{yl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 w-full space-y-2">
          <Label htmlFor="targetTermId">Target Term</Label>
          <Select value={formData.targetTermId} onValueChange={(val) => onUpdate({ targetTermId: val })}>
            <SelectTrigger id="targetTermId"><SelectValue placeholder="Any / All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any / All</SelectItem>
              {((curriculumTerms?.data as any[]) ?? []).map((term: any) => (
                <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={loadBatchSubjects}>Load Batch Subjects</Button>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">Selected Subjects <Badge variant="secondary" className="ml-1">{formData.subjectIds.length}</Badge></h3>
        {formData.subjectIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onUpdate({ subjectIds: [] })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            Clear All
          </Button>
        )}
      </div>

      {formData.subjectIds.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {selectedSubjects.map((subject: any) => (
            <div key={subject.id} className="flex items-center justify-between p-3 border rounded-xl bg-card hover:border-primary/40 transition-colors shadow-sm">
              <div>
                <p className="text-sm font-semibold">{subject?.code ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{subject?.title ?? subject.id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onUpdate({ subjectIds: formData.subjectIds.filter((id) => id !== subject.id) })} className="text-muted-foreground hover:text-destructive shrink-0" title="Remove subject">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 border rounded-xl text-center bg-muted/10 border-dashed">
          <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No subjects selected for this enrollment</p>
        </div>
      )}

      <div className="pt-4 mt-6 border-t space-y-3">
        <Label htmlFor="addSubject">Add Irregular/Extra Subject</Label>
        <Select
          value=""
          onValueChange={(val) => {
            if (val && !formData.subjectIds.includes(val)) {
              onUpdate({ subjectIds: [...formData.subjectIds, val] });
            }
          }}
        >
          <SelectTrigger id="addSubject"><SelectValue placeholder="Search and select subject to add..." /></SelectTrigger>
          <SelectContent>
            {allSubjectsList
              .filter((s: any) => !formData.subjectIds.includes(s.id))
              .map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.title}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface SectionStepProps {
  formData: EnrollmentFormData;
  sections?: { data?: any[] };
  onUpdate: (patch: Partial<EnrollmentFormData>) => void;
}

export function SectionStep({ formData, sections, onUpdate }: SectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Assign Section</h2>
        <p className="text-sm text-muted-foreground">Select a section for the student (Optional — can be done later).</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2">
        {((sections?.data as any[]) ?? []).map((section: any) => (
          <button
            key={section.id}
            onClick={() => onUpdate({ sectionId: section.id })}
            className={cn(
              'text-left p-4 rounded-xl border-2 transition-all hover:border-primary/40',
              formData.sectionId === section.id ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-transparent bg-muted/40',
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">{section.name}</p>
              <Badge variant={section.isActive ? 'default' : 'secondary'}>{section.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Homeroom: {section.homeroom || 'Unassigned'} <span className="mx-1">•</span> Capacity: {section.capacity}
            </p>
          </button>
        ))}
        {((sections?.data as any[]) ?? []).length === 0 && (
          <div className="col-span-full py-8 text-center text-muted-foreground border rounded-xl border-dashed">
            No active sections found for this branch.
          </div>
        )}
      </div>
    </div>
  );
}
