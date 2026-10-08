'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  Mail,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useResendCredentials, type ResendCredentialsResponse } from '../hooks/use-teachers';
import { toast } from 'sonner';

export interface ResendCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function ResendCredentialsDialog({
  open,
  onOpenChange,
  teacher,
}: ResendCredentialsDialogProps) {
  const resendCredentials = useResendCredentials();
  const [result, setResult] = useState<ResendCredentialsResponse | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loginUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/login?role=teacher`
      : '/login?role=teacher';

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after transition
    setTimeout(() => {
      setResult(null);
      setShowPassword(true);
      setCopiedPass(false);
      setCopiedEmail(false);
      setCopiedLink(false);
    }, 200);
  };

  const handleSend = async () => {
    if (!teacher) return;
    try {
      const res = await resendCredentials.mutateAsync(teacher.id);
      setResult(res);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleCopy = (text: string, type: 'pass' | 'email' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'pass') {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
      toast.success('Password copied to clipboard');
    } else if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success('Email copied to clipboard');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Login link copied to clipboard');
    }
  };

  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        {/* Header with gradient bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 pt-6 pb-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                {result ? 'Teacher Credentials Ready' : 'Resend Teacher Credentials'}
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                {result
                  ? 'New credentials generated and saved'
                  : 'Generate a new temporary password and email it'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Teacher Summary Pill */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 truncate">{teacher.name}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">{teacher.email}</p>
            </div>
            <Badge variant="outline" className="shrink-0 whitespace-nowrap bg-white text-[11px] font-semibold text-emerald-700 border-emerald-200 px-2.5 py-0.5">
              Teacher
            </Badge>
          </div>

          {!result ? (
            /* Confirmation Step */
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-blue-950">
                  <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>Email Dispatch & Reset</span>
                </div>
                <p className="text-blue-800/90 text-[11.5px]">
                  Clicking below will generate a new secure temporary password, update the teacher's account, and send an email invitation with login instructions to{' '}
                  <strong className="font-semibold text-blue-950">{teacher.email}</strong>.
                </p>
                <p className="text-blue-800/80 text-[11px]">
                  You will also be able to view and copy the generated password immediately.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClose}
                  disabled={resendCredentials.isPending}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={resendCredentials.isPending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                >
                  {resendCredentials.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Generating & Sending...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                      Generate & Send Credentials
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Credentials Display Step */
            <div className="space-y-4">
              {/* Email dispatch alert */}
              {result.emailSent ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950">Email Delivered</p>
                    <p className="text-[11.5px] text-emerald-800/90 mt-0.5">
                      Credentials email was dispatched to <strong>{teacher.email}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Email Delivery Failed</p>
                    <p className="text-[11.5px] text-amber-800/90 mt-0.5">
                      {result.emailError || 'SMTP error'}. You can still copy and share the password below manually.
                    </p>
                  </div>
                </div>
              )}

              {/* Password Display Box */}
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                {/* Temporary Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 tracking-wider shadow-inner">
                      {showPassword ? result.tempPassword : '••••••••••••'}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(result.tempPassword || '', 'pass')}
                      className="shrink-0 h-9 px-3 rounded-lg border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-semibold"
                    >
                      {copiedPass ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Login Link */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Teacher Login Portal
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700 truncate shadow-inner">
                      {loginUrl}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(loginUrl, 'link')}
                      className="shrink-0 h-8 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Admin Note */}
              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                💡 The teacher will be prompted to change this temporary password upon first login.
              </p>

              {/* Done Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
