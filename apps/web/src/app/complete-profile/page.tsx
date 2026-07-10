'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, GraduationCap } from 'lucide-react';
import { api, ApiError } from '@/services/api-client';
import { useAuthStore } from '@/store/auth-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const completeProfileSchema = z.object({
  schoolName: z.string().min(2, 'School name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
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
      const result = await api.post<any>(`/auth/complete-google-profile?accessToken=${accessToken || ''}`, data, true);
      toast.success('Profile completed successfully!');
      
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
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f8] p-6">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.12),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-40 left-[-20%] h-[440px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
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
                <Input
                  {...register('schoolName')}
                  placeholder="e.g. Sunrise International School"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.schoolName && (
                  <p className="text-xs text-red-500">{errors.schoolName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Phone number <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="tel"
                  {...register('phone')}
                  placeholder="+91 9876543210"
                  className="rounded-lg border-gray-200 focus:border-[#1a73e8] focus:ring-[#1a73e8]/20"
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#34a853] py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-[#2d9249] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete & Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
