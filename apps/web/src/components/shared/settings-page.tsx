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
import { CheckCircle2, Mail, KeyRound, User, Shield, Image as ImageIcon, Trash2, Loader2, Settings as SettingsIcon, Building, Sparkles } from 'lucide-react';
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
      
      const res = await api.postFormData<any>('/exam-papers/template/upload-logo', formData);
      const newLogoUrl = res?.logoUrl;
      if (newLogoUrl) {
        setLogoUrl(newLogoUrl);
        queryClient.invalidateQueries({ queryKey: ['exam-paper-template'] });
        queryClient.invalidateQueries({ queryKey: ['admin-exam-papers'] });
        if (user) {
          setAuth({
            ...user,
            school: {
              id: user.school?.id || '',
              name: user.school?.name || '',
              currentAcademicSessionId: user.school?.currentAcademicSessionId ?? null,
              logo: newLogoUrl,
            }
          }, accessToken!);
        }
        toast.success('Logo uploaded successfully');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <DashboardShell title="Settings">
      <div className="animate-in fade-in space-y-4 pb-8 duration-300">
        {/* Executive Welcome & Status Banner (Matching Image 1 exact UI) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-emerald-50/30 p-4 sm:p-5 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/15">
                <SettingsIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0b1c30]">
                    System & Account Settings
                  </h1>
                  <Badge className="border-none bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 gap-1.5 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live: {user?.role?.replace('_', ' ')}
                  </Badge>
                  {schoolName && (
                    <span className="rounded-md bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                      {schoolName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Manage profile credentials, institution identity, exam branding logos, and access security.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Concise Overview KPI Metric Cards (Matching Image 1 UI) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Card 1 - Emerald: Account */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Account Status
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                Verified
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                ACTIVE
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">profile</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500 truncate">
              {user?.email}
            </p>
          </div>

          {/* Card 2 - Blue: Role Tier */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Role Tier
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Clearance
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                {user?.role?.replace('_', ' ') || 'USER'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">access</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Authorized portal clearance
            </p>
          </div>

          {/* Card 3 - Purple: School Entity */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Organization
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                School
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30] truncate">
                {schoolName ? schoolName.split(' ')[0] : 'JD'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">entity</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500 truncate">
              {schoolName || 'Registered school institution'}
            </p>
          </div>

          {/* Card 4 - Amber: Security */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-slate-50/30 p-3.5 shadow-2xs transition-all duration-200 hover:shadow-xs">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                Security Level
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                2-Factor
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#0b1c30]">
                PROTECTED
              </span>
              <span className="text-[10px] font-semibold text-amber-600">otp</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              2-Factor authenticated resets
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Column: Account & Profile */}
          <div className="space-y-4">
            {/* Account Info */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <div className="rounded-xl bg-blue-50 p-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  Account Identity
                </CardTitle>
                <CardDescription className="text-xs">Your registered account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="text-xs font-medium text-slate-500">Email Address</span>
                  <span className="text-xs font-semibold text-slate-900">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="text-xs font-medium text-slate-500">Permission Role</span>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile */}
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <div className="rounded-xl bg-purple-50 p-2">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  Edit Profile
                </CardTitle>
                <CardDescription className="text-xs">Update your display name and contact phone number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-9 rounded-xl border-slate-200 bg-slate-50/50 text-xs focus-visible:bg-white focus-visible:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="h-9 rounded-xl border-slate-200 bg-slate-50/50 text-xs focus-visible:bg-white focus-visible:ring-emerald-500/20"
                  />
                </div>
                <Button
                  onClick={handleProfileSave}
                  disabled={profileMutation.isPending}
                  className="h-9 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-medium text-white shadow-xs hover:from-emerald-700 hover:to-teal-700"
                >
                  {profileMutation.isPending ? 'Saving Profile…' : 'Save Profile Changes'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: School & Security */}
          <div className="space-y-4">
            {/* School Settings - Admin Only */}
            {(user?.role === 'SCHOOL_ADMIN' || user?.school) && (
              <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <Building className="h-4 w-4 text-emerald-600" />
                    </div>
                    School Information
                  </CardTitle>
                  <CardDescription className="text-xs">Update your school name displayed across navigation and reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="schoolName" className="text-xs font-semibold text-slate-700">
                      School Name
                    </Label>
                    <Input
                      id="schoolName"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. WNC International School"
                      className="h-9 rounded-xl border-slate-200 bg-slate-50/50 text-xs focus-visible:bg-white focus-visible:ring-emerald-500/20"
                    />
                  </div>
                  <Button
                    onClick={handleSchoolSave}
                    disabled={schoolMutation.isPending}
                    className="h-9 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-medium text-white shadow-xs hover:from-emerald-700 hover:to-teal-700"
                  >
                    {schoolMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving School Name…
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
              <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                    <div className="rounded-xl bg-indigo-50 p-2">
                      <ImageIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    School Branding Logo
                  </CardTitle>
                  <CardDescription className="text-xs">Upload or manage your official school emblem for exam papers and navigation</CardDescription>
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
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <div className="rounded-xl bg-amber-50 p-2">
                    <KeyRound className="h-4 w-4 text-amber-600" />
                  </div>
                  Change Password
                </CardTitle>
                <CardDescription className="text-xs">
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
                      className="h-9 w-full rounded-xl border-slate-200 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-all duration-200 active:scale-[0.99]"
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
                    <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 border border-blue-100">
                      <Mail className="h-4 w-4 shrink-0 animate-pulse" />
                      <span>
                        Code sent to <strong>{user?.email}</strong>. Check your inbox.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="otp" className="text-xs font-semibold text-slate-700">
                        6-Digit Code
                      </Label>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="h-10 rounded-xl border-slate-200 text-center font-mono text-xl tracking-[0.5em] focus-visible:ring-emerald-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                        New Password
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 chars, uppercase, number, symbol"
                        className="h-9 rounded-xl border-slate-200 text-xs focus-visible:ring-emerald-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={cn(
                          'h-9 rounded-xl border-slate-200 text-xs focus-visible:ring-emerald-500/20',
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
                        className="h-9 flex-1 rounded-xl border-slate-200 text-xs font-medium text-slate-700 active:scale-[0.98]"
                        onClick={() => {
                          setStep('idle');
                          setOtp('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="h-9 flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-medium text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98]"
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
                      className="text-slate-500 w-full text-center text-xs underline-offset-2 transition-colors duration-200 hover:text-slate-800 hover:underline"
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
                    <p className="font-semibold text-slate-800">Password changed!</p>
                    <p className="text-slate-500 text-xs">Your new password is active.</p>
                    <Button
                      variant="outline"
                      onClick={() => setStep('idle')}
                      className="h-9 rounded-xl border-slate-200 text-xs font-medium active:scale-[0.99]"
                    >
                      Change Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
