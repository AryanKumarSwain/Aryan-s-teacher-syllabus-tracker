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

export const performSessionHardReset = async (queryClient: any) => {
  console.log('[HARD RESET] Starting hard reset for session switch');

  // Step 1: Fetch fresh user data (with updated currentAcademicSessionId) BEFORE touching localStorage
  let freshMe: any = null;
  try {
    freshMe = await api.get<any>('/auth/me');
    console.log('[HARD RESET] Fresh /auth/me fetched, new sessionId:', freshMe?.school?.currentAcademicSessionId);
  } catch {
    console.error('[HARD RESET] Failed to fetch /auth/me');
  }

  // Step 2: Build the correct auth-storage JSON NOW (before clearing anything)
  // Zustand persist writes to localStorage asynchronously, so we must NOT read
  // localStorage after calling setAuth — that would capture the stale old value.
  let freshAuthStorage: string | null = null;
  if (freshMe) {
    try {
      const currentState = useAuthStore.getState();
      const freshState = {
        state: {
          user: freshMe,
          accessToken: currentState.accessToken || 'cookie-session',
          isAuthenticated: true,
        },
        version: 0,
      };
      freshAuthStorage = JSON.stringify(freshState);

      // Also update the in-memory store
      currentState.setAuth(freshMe, currentState.accessToken || 'cookie-session');
      console.log('[HARD RESET] Auth store updated in memory');
    } catch (err) {
      console.error('[HARD RESET] Failed to build fresh auth storage:', err);
    }
  }

  // Step 3: Force clear the entire React Query cache
  queryClient.clear();
  console.log('[HARD RESET] React Query cache cleared');

  // Step 4: Clear ALL localStorage, then restore the FRESH auth-storage
  try {
    localStorage.clear();
    if (freshAuthStorage) {
      localStorage.setItem('auth-storage', freshAuthStorage);
      console.log('[HARD RESET] localStorage cleared and fresh auth-storage restored');
    } else {
      // Fallback: no fresh data, just clear
      console.warn('[HARD RESET] No fresh auth data — localStorage fully cleared');
    }
  } catch (err) {
    console.error('[HARD RESET] Failed to clear localStorage:', err);
  }

  // Step 5: Clear ALL sessionStorage
  try {
    sessionStorage.clear();
    console.log('[HARD RESET] sessionStorage cleared');
  } catch (err) {
    console.error('[HARD RESET] Failed to clear sessionStorage:', err);
  }

  // Step 6: Clear non-auth cookies
  try {
    document.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0]?.trim();
      if (name && !name.includes('access_token') && !name.includes('refresh_token')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    console.log('[HARD RESET] Non-auth cookies cleared');
  } catch (err) {
    console.error('[HARD RESET] Failed to clear cookies:', err);
  }

  // Step 7: Reload — now localStorage has the fresh session ID
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
    // NOTE: Hard reset is intentionally NOT done here.
    // The sessions page shows the import wizard first, then reloads after the wizard closes.
    // This gives the admin a chance to import data before the UI switches context.
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

  const updateSession = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      return api.patch<AcademicSession>(`/academic-sessions/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['academic-terms'] });
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
    updateSession,
    switchSession,
    deleteSession,
    archiveSession,
    importClasses,
    importSubjects,
    importTeachers,
    importSyllabus,
  };
};
