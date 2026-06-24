import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

export interface TeacherRow {
  id: string;
  status: string;
  user: { id: string; name: string; email: string; phone: string | null; status: string };
  subject: { id: string; name: string };
  teacherClasses: {
    classId: string;
    subjectId?: string;
    class: { id: string; name: string; grade: string | null; section: string | null };
    subject?: { id: string; name: string } | null;
  }[];
  status: string;
}

export interface BulkTeacherRow {
  name: string;
  email: string;
  phone?: string;
}

export interface BulkResult {
  success: boolean;
  name: string;
  email: string;
  error?: string;
  emailSent?: boolean;
  warning?: string;
}

export interface CreateTeacherResponse {
  teacher: { id: string };
  emailSent: boolean;
  emailError?: string;
  restored?: boolean;
}

export function useTeachers(params: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['teachers', params],
    queryFn: () =>
      api.getPaginated<TeacherRow>('/teachers', {
        page: params.page ?? 1,
        pageSize: 20,
        search: params.search,
      }),
  });
}

export function useCreateTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      phone?: string;
      classIds: string[];
      assignments: { classId: string; subjectId: string }[];
    }) => api.post<CreateTeacherResponse>('/teachers', body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      if (data.restored) {
        toast.success(
          data.emailSent
            ? 'Teacher restored and credentials emailed.'
            : `Teacher restored. Email not sent: ${data.emailError ?? 'check SMTP settings'}`,
        );
      } else if (data.emailSent) {
        toast.success('Teacher created. Login credentials were emailed.');
      } else {
        toast.warning(
          `Teacher created but credentials email failed: ${data.emailError ?? 'check SMTP settings'}`,
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkCreateTeachers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (teachers: BulkTeacherRow[]) =>
      api.post<{ results: BulkResult[]; succeeded: number; failed: number }>('/teachers/bulk', {
        teachers,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      const emailWarnings = data.results.filter((r) => r.success && r.warning).length;
      if (data.succeeded > 0) {
        toast.success(
          emailWarnings > 0
            ? `${data.succeeded} teacher(s) saved; ${emailWarnings} without email (check SMTP)`
            : `${data.succeeded} teacher${data.succeeded > 1 ? 's' : ''} imported`,
        );
      }
      if (data.failed > 0)
        toast.error(`${data.failed} teacher${data.failed > 1 ? 's' : ''} failed`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Teacher deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTeacherStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      api.patch(`/teachers/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(status === 'SUSPENDED' ? 'Teacher suspended' : 'Teacher reactivated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
