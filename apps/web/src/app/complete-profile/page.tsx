'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Building2,
  Phone,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const completeProfileSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: CompleteProfileFormData) => {
    try {
      setIsSubmitting(true);
      // Get accessToken from URL query parameter (passed from Google callback)
      const accessToken = searchParams.get('accessToken');
      const result = await api.post<any>(
        `/auth/complete-google-profile?accessToken=${accessToken || ''}`,
        data,
        true,
      );
      toast.success('Profile completed successfully! Welcome aboard.');

      // Update auth store with the updated user data
      if (result.user) {
        setAuth(result.user, result.accessToken);
      }

      router.push('/admin');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to complete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div suppressHydrationWarning className="relative min-h-screen bg-[#f0f4f8] text-foreground">
      {/* Subtle background blobs referencing the dashboard's blue/teal palette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-32 right-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(21,88,176,0.09),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* ── Left: branding panel ── */}
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1a73e8]">
              Syllabus<span className="text-gray-400 font-normal">Tracker</span>
            </span>
          </Link>

          <h1 className="mt-10 text-4xl font-bold leading-tight tracking-tight text-gray-800">
            Set up your institution to start tracking curriculum delivery seamlessly.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500">
            Real-time syllabus completion tracking, structured academic sessions, and teacher analytics in one unified portal.
          </p>

          {/* Feature pills — matching login page */}
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { k: 'Multi-tenant', v: 'School isolation', color: 'border-blue-200 bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
              { k: 'Academic Setup', v: 'Sessions & Terms', color: 'border-teal-200 bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
              { k: 'Audit-ready', v: 'Verified delivery', color: 'border-green-200 bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
            ].map((x) => (
              <div key={x.k} className={`rounded-2xl border ${x.color} p-4`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${x.dot}`} />
                  <p className={`text-xs font-semibold ${x.text}`}>{x.k}</p>
                </div>
                <p className="text-sm font-bold text-gray-700">{x.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Complete Profile card ── */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            {/* Blue header bar — matching login page */}
            <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white">Complete your profile</h2>
              <p className="mt-0.5 text-sm text-blue-100">Please provide a few more details</p>
            </div>

            <div className="px-6 py-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* School name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    School name <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <Input
                      {...register('schoolName')}
                      placeholder="e.g. Sunrise International School"
                      className="pl-9.5 rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                    />
                  </div>
                  {errors.schoolName && (
                    <p className="text-xs text-red-500">{errors.schoolName.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Phone number <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      type="tel"
                      {...register('phone')}
                      placeholder="+91 9876543210"
                      className="pl-9.5 rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1a73e8] to-[#1558b0] hover:from-[#1558b0] hover:to-[#124994] py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up profile...
                    </>
                  ) : (
                    <>
                      Complete & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Trust badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Encrypted & secure school registration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8]">
          <div className="h-40 w-80 animate-pulse rounded-xl bg-gray-200" />
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  );
}
