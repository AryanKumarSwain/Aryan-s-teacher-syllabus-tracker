import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

export interface AcademicSession {
  id: string;
  schoolId: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  isArchived: boolean;
  createdAt: string;
  _count: {
    academicTerms: number;
    classes: number;
    subjects: number;
    chapters: number;
  };
}

export const useAcademicSessions = () => {
  const schoolId = useSchoolId();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['academic-sessions', schoolId],
    queryFn: async () => {
      const response = await api.get<AcademicSession[]>('/academic-sessions/by-school', {
        schoolId,
      });
      return response;
    },
    enabled: !!schoolId,
  });

  const createSession = useMutation({
    mutationFn: async (name: string) => {
      return api.post<AcademicSession>('/academic-sessions', {
        schoolId,
        name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions', schoolId] });
    },
  });

  const switchSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.post('/academic-sessions/switch', {
        schoolId,
        sessionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school'] });
      queryClient.invalidateQueries({ queryKey: ['academic-sessions', schoolId] });
    },
  });

  const archiveSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.patch(`/academic-sessions/${sessionId}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions', schoolId] });
    },
  });

  const importClasses = useMutation({
    mutationFn: async ({
      sourceSessionId,
      targetSessionId,
    }: {
      sourceSessionId: string;
      targetSessionId: string;
    }) => {
      return api.post('/academic-sessions/import/classes', {
        sourceSessionId,
        targetSessionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const importSubjects = useMutation({
    mutationFn: async ({
      sourceSessionId,
      targetSessionId,
    }: {
      sourceSessionId: string;
      targetSessionId: string;
    }) => {
      return api.post('/academic-sessions/import/subjects', {
        sourceSessionId,
        targetSessionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  const importTeachers = useMutation({
    mutationFn: async ({
      sourceSessionId,
      targetSessionId,
    }: {
      sourceSessionId: string;
      targetSessionId: string;
    }) => {
      return api.post('/academic-sessions/import/teachers', {
        sourceSessionId,
        targetSessionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
    },
  });

  const importSyllabus = useMutation({
    mutationFn: async ({
      sourceSessionId,
      targetSessionId,
    }: {
      sourceSessionId: string;
      targetSessionId: string;
    }) => {
      return api.post('/academic-sessions/import/syllabus', {
        sourceSessionId,
        targetSessionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', 'topics'] });
    },
  });

  return {
    sessions,
    isLoading,
    createSession,
    switchSession,
    archiveSession,
    importClasses,
    importSubjects,
    importTeachers,
    importSyllabus,
  };
};
