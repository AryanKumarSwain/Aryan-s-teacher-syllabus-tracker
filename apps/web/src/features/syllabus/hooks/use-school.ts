'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAdminSessionStore } from '@/store/admin-session-store';

export function useSchool() {
  const user = useAuthStore((state) => state.user);
  const rawSchool = user?.school ?? null;
  const viewSessionId = useAdminSessionStore((state) => state.viewSessionId);

  if (!rawSchool) {
    return {
      school: null,
      isViewMode: false,
      activeSessionId: null,
      viewSessionId: null,
    };
  }

  // Teachers cannot have viewSessionId override (they always see real active session)
  const isTeacher = user?.role === 'TEACHER';
  const isViewMode = Boolean(
    !isTeacher && viewSessionId && viewSessionId !== rawSchool.currentAcademicSessionId,
  );

  const effectiveSessionId = isViewMode
    ? viewSessionId
    : rawSchool.currentAcademicSessionId;

  return {
    school: {
      ...rawSchool,
      currentAcademicSessionId: effectiveSessionId,
    },
    activeSessionId: rawSchool.currentAcademicSessionId,
    isViewMode,
    viewSessionId: isViewMode ? viewSessionId : null,
  };
}
