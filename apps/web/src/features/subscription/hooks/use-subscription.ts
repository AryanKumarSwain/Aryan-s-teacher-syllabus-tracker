'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/services/api-client';

export interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    queuedDays?: number;
    queuedPlanName?: string | null;
    remainingDays: number;
    isExpired: boolean;
    plan: {
      id: string;
      name: string;
      description?: string;
      teacherLimit: number;
      pricePerSession?: number;
      priceMonthly?: number;
      priceYearly?: number;
      sessionDurationDays?: number;
      sessionLimit?: number;
      features: string[] | any;
    };
  } | null;
  limits: {
    subjects: { used: number; max: number };
    classes: { used: number; max: number };
    teachers: { used: number; max: number };
    sessions: { used: number; max: number };
  };
  razorpayKeyId: string;
}

export function useSubscription() {
  const user = useAuthStore((s) => s.user);
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';

  const { data, isLoading, isFetched, refetch } = useQuery({
    queryKey: ['admin', 'current-subscription'],
    queryFn: () => api.get<SubscriptionData>('/subscriptions/current'),
    enabled: isSchoolAdmin && !!user?.schoolId,
    staleTime: 10000,
  });

  const subscription = data?.subscription ?? null;
  const isExpired = Boolean(subscription?.isExpired);
  const hasActivePlan = Boolean(
    subscription && subscription.status === 'ACTIVE' && !isExpired,
  );

  return {
    subscription,
    limits: data?.limits ?? {
      subjects: { used: 0, max: 0 },
      classes: { used: 0, max: 0 },
      teachers: { used: 0, max: 0 },
      sessions: { used: 0, max: 0 },
    },
    hasActivePlan,
    isExpired,
    isLoading: isSchoolAdmin ? isLoading : false,
    isFetched,
    refetch,
  };
}
