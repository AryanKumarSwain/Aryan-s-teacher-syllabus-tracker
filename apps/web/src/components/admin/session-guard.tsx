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

    if (sessions.length === 0 && pathname !== '/admin') {
      router.replace('/admin');
    }
  }, [schoolId, isLoading, sessions.length, pathname, router]);

  return null;
}
