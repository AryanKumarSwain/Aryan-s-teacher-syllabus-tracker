import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api-client';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';
import { useAuthStore } from '@/store/auth-store';

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
    teachers?: number;
  };
}

const performSessionHardReset = async (queryClient: any) => {
  console.log('[HARD RESET] Starting hard reset for session switch');
  
  // Step 1: Refresh auth store to get updated school data with new currentAcademicSessionId
  try {
    const me = await api.get<any>('/auth/me');
    const setAuth = useAuthStore.getState().setAuth;
    setAuth(me, useAuthStore.getState().accessToken || 'cookie-session');
    console.log('[HARD RESET] Auth store refreshed with new session ID');
  } catch {
    console.error('[HARD RESET] Failed to refresh auth store');
  }

  // Step 2: Force clear the entire React Query cache
  queryClient.clear();
  console.log('[HARD RESET] React Query cache cleared');

  // Step 3: Clear ALL localStorage (except auth-storage which we just updated)
  try {
    const authStorage = localStorage.getItem('auth-storage');
    localStorage.clear();
    // Restore only the auth storage with new session data
    if (authStorage) {
      localStorage.setItem('auth-storage', authStorage);
    }
    console.log('[HARD RESET] localStorage cleared (except auth-storage)');
  } catch (err) {
    console.error('[HARD RESET] Failed to clear localStorage:', err);
  }

  // Step 4: Clear ALL sessionStorage
  try {
    sessionStorage.clear();
    console.log('[HARD RESET] sessionStorage cleared');
  } catch (err) {
    console.error('[HARD RESET] Failed to clear sessionStorage:', err);
  }

  // Step 5: Clear any cookies that might contain session data (client-side only)
  try {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      // Don't clear auth cookies as they're needed for the session
      if (!name.includes('access_token') && !name.includes('refresh_token')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    console.log('[HARD RESET] Non-auth cookies cleared');
  } catch (err) {
    console.error('[HARD RESET] Failed to clear cookies:', err);
  }

  // Step 6: Force a complete page reload to ensure all components remount with fresh state
  console.log('[HARD RESET] Triggering page reload');
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export const useAcademicSessions = () => {
  const schoolId = useSchoolId();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['academic-sessions', schoolId],
    queryFn: async () => {
      const response = await api.get<AcademicSession[]>('/academic-sessions/by-school', {
        schoolId: schoolId!,
      });
      return response;
    },
    enabled: !!schoolId,
  });

  const createSession = useMutation({
    mutationFn: async ({ name, setAsActive }: { name: string; setAsActive?: boolean }) => {
      return api.post<AcademicSession>('/academic-sessions', {
        name,
        setAsActive,
      });
    },
    onSuccess: async (_, variables) => {
      if (variables.setAsActive) {
        await performSessionHardReset(queryClient);
      } else {
        queryClient.invalidateQueries({ queryKey: ['academic-sessions', schoolId] });
      }
    },
  });

  const switchSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.post('/academic-sessions/switch', {
        schoolId,
        sessionId,
      });
    },
    onSuccess: async () => {
      await performSessionHardReset(queryClient);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.delete(`/academic-sessions/${sessionId}`);
    },
    onSuccess: () => {
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
    deleteSession,
    archiveSession,
    importClasses,
    importSubjects,
    importTeachers,
    importSyllabus,
  };
};
