'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAcademicSessions } from '@/features/syllabus/hooks/use-academic-sessions';
import { useSchoolId } from '@/features/syllabus/hooks/use-school-id';

export function AdminSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const schoolId = useSchoolId();
  const { sessions, isLoading } = useAcademicSessions();

  useEffect(() => {
    if (!schoolId || isLoading) {
      return;
    }

    // With hardcoded sessions, sessions will always be available (3 sessions)
    // No need to redirect to /admin for session creation
    // The guard is now just a placeholder for future session validation if needed
  }, [schoolId, isLoading, sessions.length, pathname, router]);

  return null;
}
