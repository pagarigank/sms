import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber?: string;
  lrn?: string;
  branchId?: string;
}

interface StudentState {
  students: Student[];
  selectedStudentId: string | null;
  setStudents: (students: Student[]) => void;
  selectStudent: (id: string) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      students: [],
      selectedStudentId: null,
      setStudents: (students) => {
        set({ students });
        // Auto-select first student if none selected
        if (!get().selectedStudentId && students.length > 0) {
          set({ selectedStudentId: students[0].id });
        }
      },
      selectStudent: (id) => set({ selectedStudentId: id }),
    }),
    { name: 'guardian-portal-students' }
  )
);
