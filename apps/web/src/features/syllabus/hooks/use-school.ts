'use client';

import { useAuthStore } from '@/store/auth-store';

export function useSchool() {
  const school = useAuthStore((state) => state.user?.school ?? null);
  return { school };
}
