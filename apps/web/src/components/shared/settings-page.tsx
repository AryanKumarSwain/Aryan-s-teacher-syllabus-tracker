'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api-client';
import { toast } from 'sonner';
import { CheckCircle2, Mail, KeyRound, User, Shield, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { env } from '@/config/env';

type PasswordStep = 'idle' | 'otp-sent' | 'done';

export function SettingsPageContent() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [schoolName, setSchoolName] = useState(user?.school?.name ?? '');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [step, setStep] = useState<PasswordStep>('idle');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync state when user object hydrates from auth-provider / backend
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
    if (user?.school?.name) setSchoolName(user.school.name);
  }, [user?.name, user?.phone, user?.school?.name]);

  useEffect(() => {
    if (user?.role === 'SCHOOL_ADMIN') {
      api.get<any>('/exam-papers/template').then((template) => {
        setLogoUrl(template?.logoUrl ?? (user?.school as any)?.logo ?? '');
      }).catch(() => {});
    }
  }, [user?.role, user?.school]);

  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      api.patch<{ id: string; name: string; email: string; phone: string | null }>(
        '/auth/me',
        data,
      ),
    onSuccess: (updated) => {
      setAuth({ ...user!, name: updated.name, phone: updated.phone ?? undefined }, accessToken!);
      toast.success('Profile updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const schoolMutation = useMutation({
    mutationFn: (data: { schoolName: string }) =>
      api.patch<{ id: string; name: string }>('/schools/me', data),
    onSuccess: (updated) => {
      setAuth(
        {
          ...user!,
          school: {
            id: user!.school?.id || updated.id,
            name: updated.name,
            currentAcademicSessionId: user!.school?.currentAcademicSessionId ?? null,
            logo: (user!.school as any)?.logo ?? logoUrl ?? null,
          },
        },
        accessToken!,
      );
      queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
      toast.success('School name updated successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogoRemove = async () => {
    setRemovingLogo(true);
    try {
      await api.delete('/exam-papers/template/logo');
      setLogoUrl('');
      queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
      queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      if (user) {
        setAuth(
          {
            ...user,
            school: {
              id: user.school?.id || '',
              name: user.school?.name || '',
              currentAcademicSessionId: user.school?.currentAcademicSessionId ?? null,
              logo: null,
            },
          },
          accessToken!,
        );
      }
      toast.success('School logo removed successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove logo');
    } finally {
      setRemovingLogo(false);
    }
  };

  const sendOtpMutation = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/me/send-otp', {}),
    onSuccess: (res) => {
      setStep('otp-sent');
      toast.success(res.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { otp: string; newPassword: string }) =>
      api.post('/auth/me/verify-otp', data),
    onSuccess: () => {
      setStep('done');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleProfileSave = () => {
    if (!name.trim()) return toast.error('Name is required');
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const handleSchoolSave = () => {
    if (!schoolName.trim()) return toast.error('School name is required');
    schoolMutation.mutate({ schoolName: schoolName.trim() });
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length !== 6) return toast.error('Enter the 6-digit code');
    if (!newPassword) return toast.error('New password is required');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    verifyOtpMutation.mutate({ otp, newPassword });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`${env.apiUrl}/exam-papers/template/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setLogoUrl(data.data.logoUrl);
        queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
        queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
        if (user) {
          setAuth({
            ...user,
            school: {
              id: user.school?.id || '',
              name: user.school?.name || '',
              currentAcademicSessionId: user.school?.currentAcademicSessionId ?? null,
              logo: data.data.logoUrl,
            }
          }, accessToken!);
        }
        toast.success('Logo uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <DashboardShell title="Settings">
      <div className="animate-in fade-in mx-auto max-w-2xl space-y-5 duration-300">
        {/* Account Info */}
        <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-blue-50 p-1.5">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              Account
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-muted-foreground text-sm">Email</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-muted-foreground text-sm">Role</span>
              <Badge variant="secondary" className="font-semibold">
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-purple-50 p-1.5">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              Edit Profile
            </CardTitle>
            <CardDescription>Update your name and phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Full Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0100"
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profileMutation.isPending}
              className="w-full transition-all duration-200 active:scale-[0.99]"
            >
              {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* School Settings - Admin Only */}
        {(user?.role === 'SCHOOL_ADMIN' || user?.school) && (
          <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-green-50 p-1.5">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                School Settings
              </CardTitle>
              <CardDescription>Update your school name displayed across navigation and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="schoolName" className="text-xs font-semibold">
                  School Name
                </Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. WNC International School"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <Button
                onClick={handleSchoolSave}
                disabled={schoolMutation.isPending}
                className="w-full transition-all duration-200 active:scale-[0.99]"
              >
                {schoolMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save School Name'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* School Logo - Admin Only */}
        {user?.role === 'SCHOOL_ADMIN' && (
          <Card className="border shadow-sm transition-shadow duration-300 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-indigo-50 p-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                </div>
                School Logo
              </CardTitle>
              <CardDescription>Upload or manage your school logo for exam papers and navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logoUrl ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 shadow-2xs">
                      <img src={logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{schoolName || 'School Logo'}</p>
                      <p className="text-xs text-gray-500">Active logo used across navigation and exam papers</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLogoRemove}
                    disabled={removingLogo}
                    className="h-8 gap-1.5 border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {removingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {removingLogo ? 'Removing…' : 'Remove Logo'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-500">No school logo uploaded</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="logo" className="text-xs font-semibold">
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                />
                {uploadingLogo && (
                  <p className="text-muted-foreground text-xs flex items-center gap-1.5 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> Uploading logo...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Password */}
        <Card className="overflow-hidden border shadow-sm transition-shadow duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-amber-50 p-1.5">
                <KeyRound className="h-4 w-4 text-amber-600" />
              </div>
              Change Password
            </CardTitle>
            <CardDescription>
              We'll send a 6-digit code to <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'idle' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <Button
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  variant="outline"
                  className="w-full transition-all duration-200 active:scale-[0.99]"
                >
                  <Mail
                    className={cn('mr-2 h-4 w-4', sendOtpMutation.isPending && 'animate-bounce')}
                  />
                  {sendOtpMutation.isPending ? 'Sending code…' : 'Send Verification Code'}
                </Button>
              </div>
            )}

            {step === 'otp-sent' && (
              <div className="animate-in slide-in-from-bottom-4 space-y-4 duration-300">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <Mail className="h-4 w-4 shrink-0 animate-pulse" />
                  <span>
                    Code sent to <strong>{user?.email}</strong>. Check your inbox.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="otp" className="text-xs font-semibold">
                    6-Digit Code
                  </Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center font-mono text-xl tracking-[0.5em] transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-semibold">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={cn(
                      'transition-all duration-200 focus:ring-2 focus:ring-blue-500/20',
                      confirmPassword && newPassword !== confirmPassword && 'border-red-400',
                    )}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="animate-in fade-in text-xs text-red-500 duration-150">
                      Passwords don't match
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 active:scale-[0.98]"
                    onClick={() => {
                      setStep('idle');
                      setOtp('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 active:scale-[0.98]"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtpMutation.isPending}
                  >
                    <KeyRound
                      className={cn('mr-2 h-4 w-4', verifyOtpMutation.isPending && 'animate-spin')}
                    />
                    {verifyOtpMutation.isPending ? 'Verifying…' : 'Confirm & Change'}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="text-muted-foreground w-full text-center text-xs underline-offset-2 transition-colors duration-200 hover:underline"
                >
                  {sendOtpMutation.isPending ? 'Resending…' : 'Resend code'}
                </button>
              </div>
            )}

            {step === 'done' && (
              <div className="animate-in zoom-in-95 flex flex-col items-center gap-3 py-6 text-center duration-300">
                <div className="animate-bounce rounded-full bg-emerald-50 p-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <p className="font-semibold text-gray-800">Password changed!</p>
                <p className="text-muted-foreground text-sm">Your new password is active.</p>
                <Button
                  variant="outline"
                  onClick={() => setStep('idle')}
                  className="mt-1 active:scale-[0.99]"
                >
                  Change Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
