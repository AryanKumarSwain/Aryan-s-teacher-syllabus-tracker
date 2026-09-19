import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

export interface TrainingRecordItem {
  id: string;
  teacherId: string;
  academicSessionId: string;
  title: string;
  domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
  annexure?: string | null;
  provider: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
  trainingMode: 'OFFLINE' | 'ONLINE' | 'BLENDED';
  hours: number | string;
  startDate?: string | null;
  endDate?: string | null;
  organizedBy?: string | null;
  locationOrPlatform?: string | null;
  isAcademicActivity: boolean;
  academicActivityKey?: string | null;
  certificateNumber?: string | null;
  certificateUrl?: string | null;
  remarks?: string | null;
  status: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
  createdAt: string;
}

export interface TeacherCpdItem {
  teacherId: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  subjectNames: string[];
  classNames: string[];
  totalHours: number;
  cbseHours: number;
  schoolHours: number;
  domain1Hours: number; // Core Values & Ethics (out of 12)
  domain2Hours: number; // Knowledge & Practice (out of 24)
  domain3Hours: number; // Professional Growth (out of 14)
  academicActivityHours: number;
  offlineHours: number;
  onlineHours: number;
  totalProgress: number; // 0 - 100%
  cbseProgress: number;
  schoolProgress: number;
  domain1Progress: number;
  domain2Progress: number;
  domain3Progress: number;
  hoursRemaining: number;
  complianceStatus: 'COMPLIANT' | 'IN_PROGRESS' | 'NOT_STARTED';
  recordsCount: number;
  recentRecords?: TrainingRecordItem[];
  trainingRecords?: TrainingRecordItem[];
}

export interface SchoolCpdStats {
  totalTeachers: number;
  compliantCount: number;
  inProgressCount: number;
  notStartedCount: number;
  schoolComplianceRate: number;
  totalHoursLogged: number;
  totalCbseHours: number;
  totalSchoolHours: number;
  totalRecords: number;
  standards: {
    TOTAL_HOURS_REQUIRED: number;
    CBSE_HOURS_REQUIRED: number;
    SCHOOL_HOURS_REQUIRED: number;
  };
}

export interface CreateTrainingPayload {
  teacherId?: string;
  teacherIds?: string[];
  title: string;
  domain: 'CORE_VALUES_ETHICS' | 'KNOWLEDGE_PRACTICE' | 'PROFESSIONAL_GROWTH';
  annexure?: string;
  provider?: 'CBSE' | 'SCHOOL' | 'SAHODAYA' | 'OTHER';
  trainingMode?: 'OFFLINE' | 'ONLINE' | 'BLENDED';
  hours: number;
  startDate?: string;
  endDate?: string;
  organizedBy?: string;
  locationOrPlatform?: string;
  isAcademicActivity?: boolean;
  academicActivityKey?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  remarks?: string;
  status?: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
}

export function useTeacherTrainingList(params?: { search?: string; academicSessionId?: string }) {
  return useQuery({
    queryKey: ['teacher-trainings', params],
    queryFn: () =>
      api.get<TeacherCpdItem[]>('/teacher-trainings', {
        search: params?.search || undefined,
        academicSessionId: params?.academicSessionId || undefined,
      }),
  });
}

export function useSchoolCpdStats(params?: { academicSessionId?: string }) {
  return useQuery({
    queryKey: ['school-cpd-stats', params],
    queryFn: () =>
      api.get<SchoolCpdStats>('/teacher-trainings/stats', {
        academicSessionId: params?.academicSessionId || undefined,
      }),
  });
}

export function useTeacherCpdDetail(teacherId?: string, params?: { academicSessionId?: string }) {
  return useQuery({
    queryKey: ['teacher-cpd-detail', teacherId, params],
    queryFn: () =>
      api.get<TeacherCpdItem>(`/teacher-trainings/teacher/${teacherId}`, {
        academicSessionId: params?.academicSessionId || undefined,
      }),
    enabled: !!teacherId,
  });
}

export function useMyCpd(params?: { academicSessionId?: string }) {
  return useQuery({
    queryKey: ['my-cpd', params],
    queryFn: () =>
      api.get<TeacherCpdItem>('/teacher-trainings/my', {
        academicSessionId: params?.academicSessionId || undefined,
      }),
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrainingPayload) => api.post('/teacher-trainings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-trainings'] });
      qc.invalidateQueries({ queryKey: ['school-cpd-stats'] });
      qc.invalidateQueries({ queryKey: ['teacher-cpd-detail'] });
      qc.invalidateQueries({ queryKey: ['my-cpd'] });
      toast.success('Training logged successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to log training');
    },
  });
}

export function useCreateMyTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrainingPayload) => api.post('/teacher-trainings/my', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-cpd'] });
      qc.invalidateQueries({ queryKey: ['teacher-trainings'] });
      qc.invalidateQueries({ queryKey: ['school-cpd-stats'] });
      toast.success('Training logged successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to log training');
    },
  });
}

export function useUpdateTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTrainingPayload> }) =>
      api.patch(`/teacher-trainings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-trainings'] });
      qc.invalidateQueries({ queryKey: ['teacher-cpd-detail'] });
      qc.invalidateQueries({ queryKey: ['my-cpd'] });
      qc.invalidateQueries({ queryKey: ['school-cpd-stats'] });
      toast.success('Training record updated');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update training record');
    },
  });
}

export function useDeleteTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/teacher-trainings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-trainings'] });
      qc.invalidateQueries({ queryKey: ['teacher-cpd-detail'] });
      qc.invalidateQueries({ queryKey: ['my-cpd'] });
      qc.invalidateQueries({ queryKey: ['school-cpd-stats'] });
      toast.success('Training record deleted');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete training record');
    },
  });
}
