import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminSessionState {
  viewSessionId: string | null;
  setViewSessionId: (sessionId: string | null) => void;
  resetViewSession: () => void;
}

export const useAdminSessionStore = create<AdminSessionState>()(
  persist(
    (set) => ({
      viewSessionId: null,
      setViewSessionId: (sessionId) => set({ viewSessionId: sessionId }),
      resetViewSession: () => set({ viewSessionId: null }),
    }),
    {
      name: 'admin-view-session-storage',
    },
  ),
);
