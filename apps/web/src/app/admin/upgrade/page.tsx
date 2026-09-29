'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  CalendarRange,
  Sparkles,
  Users,
  Bookmark,
  GraduationCap,
  ShieldCheck,
  Tag,
  ArrowRight,
  Clock,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface SubscriptionData {
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
      features: string[] | any;
    };
  } | null;
  limits: {
    subjects: { used: number; max: number };
    classes: { used: number; max: number };
    teachers: { used: number; max: number };
    sessions?: { used: number; max: number };
  };
  razorpayKeyId: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  pricePerSession: number;
  sessionDurationDays: number;
  sessionLimit?: number;
  teacherLimit: number;
  features: string[] | any;
  isActive: boolean;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AdminUpgradePage() {
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    finalAmount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Queries
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['admin', 'current-subscription'],
    queryFn: () => api.get<SubscriptionData>('/subscriptions/current'),
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/plans'),
  });

  const currentSub = subData?.subscription;
  const limits = subData?.limits || {
    subjects: { used: 0, max: 200 },
    classes: { used: 0, max: 100 },
    teachers: { used: 0, max: 50 },
    sessions: { used: 0, max: 1 },
  };

  const handleOpenCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setIsCheckoutOpen(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim() || !selectedPlan) return;
    setIsApplyingCoupon(true);
    try {
      const basePrice = Number(selectedPlan.pricePerSession || selectedPlan.priceYearly || 0);
      const res = await api.post<{
        coupon: { code: string };
        discount: number;
        finalAmount: number;
      }>('/coupons/validate', {
        code: couponCodeInput.trim(),
        amount: basePrice,
      });

      setAppliedCoupon({
        code: res.coupon.code,
        discount: res.discount,
        finalAmount: res.finalAmount,
      });
      toast.success(`Coupon ${res.coupon.code} applied! Saved ₹${res.discount}`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProceedPayment = async () => {
    if (!selectedPlan) return;
    setIsProcessingPayment(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Step 1: Create Razorpay Order on server
      const orderData = await api.post<{
        orderId: string;
        amount: number;
        amountInPaise: number;
        currency: string;
        keyId: string;
        plan: any;
        discount: number;
        couponCode?: string;
      }>('/subscriptions/create-order', {
        planId: selectedPlan.id,
        billingCycle: 'SESSION',
        couponCode: appliedCoupon?.code || undefined,
      });

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        name: 'School Syllabus Tracker',
        description: `Upgrade to ${selectedPlan.name} (Academic Session)`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify payment on backend & activate queued subscription
            const verifyRes = await api.post<{
              success: boolean;
              queuedDays: number;
              message: string;
            }>('/subscriptions/verify-payment', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            toast.success(verifyRes.message || 'Payment Successful! Subscription activated.');
            setIsCheckoutOpen(false);
            qc.invalidateQueries({ queryKey: ['admin', 'current-subscription'] });
            qc.invalidateQueries({ queryKey: ['plans'] });
          } catch (verifyErr: any) {
            toast.error(verifyErr.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: 'School Administrator',
        },
        theme: {
          color: '#1a73e8',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (failRes: any) => {
        toast.error(failRes?.error?.description || 'Payment Failed');
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <DashboardShell title="Upgrade & Subscription Plans">
      <div className="space-y-6">
        {/* CURRENT PLAN VALIDITY BANNER */}
        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 p-6 text-white shadow-md">
          {subLoading ? (
            <div className="h-28 animate-pulse rounded-xl bg-white/10" />
          ) : currentSub ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wide text-blue-200 border border-blue-400/30">
                    <Sparkles className="h-3.5 w-3.5 text-blue-300" /> Current Active Plan
                  </span>
                  <Badge variant={currentSub.isExpired ? 'destructive' : 'success'}>
                    {currentSub.isExpired ? 'Expired' : 'Active'}
                  </Badge>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  {currentSub.plan.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>Valid until: <strong>{new Date(currentSub.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-300" />
                    <span className="text-emerald-300 font-bold">{currentSub.remainingDays} Days Remaining</span>
                  </div>
                </div>

                {/* QUEUED DURATION EXTENSION NOTICE */}
                {currentSub.queuedDays && currentSub.queuedDays > 0 ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs text-amber-200 border border-amber-400/30">
                    <Zap className="h-4 w-4 text-amber-300 shrink-0" />
                    <span>
                      <strong>Queue Extension Active:</strong> Included <strong>{currentSub.queuedDays} days</strong> carried over from your previous plan ({currentSub.queuedPlanName || 'Plan A'}). No duration was lost!
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Quick stats badge */}
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/10 lg:w-72">
                <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-2">
                  Session Plan Info
                </div>
                <div className="text-sm font-medium text-white flex justify-between py-1 border-b border-white/10">
                  <span>Teacher Limit:</span>
                  <span className="font-bold">{currentSub.plan.teacherLimit} Teachers</span>
                </div>
                <div className="text-sm font-medium text-white flex justify-between py-1">
                  <span>Billing Cycle:</span>
                  <span className="font-bold">Academic Session</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold">No Active Subscription</h3>
                <p className="text-xs text-blue-200 mt-1">
                  Choose a session plan below to unlock full syllabus tracking and unlimited features.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SYSTEM ENTITY LIMITS OVERVIEW */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-gray-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Subjects Allowed</p>
                    <p className="text-lg font-bold text-gray-800">
                      {limits.subjects.used} <span className="text-xs text-gray-400 font-normal">/ {limits.subjects.max} max</span>
                    </p>
                  </div>
                </div>
                <Badge variant={limits.subjects.used >= limits.subjects.max ? 'destructive' : 'secondary'}>
                  {limits.subjects.used >= limits.subjects.max ? 'Limit Reached' : `${limits.subjects.max - limits.subjects.used} left`}
                </Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (limits.subjects.used / limits.subjects.max) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Classes Allowed</p>
                    <p className="text-lg font-bold text-gray-800">
                      {limits.classes.used} <span className="text-xs text-gray-400 font-normal">/ {limits.classes.max} max</span>
                    </p>
                  </div>
                </div>
                <Badge variant={limits.classes.used >= limits.classes.max ? 'destructive' : 'secondary'}>
                  {limits.classes.used >= limits.classes.max ? 'Limit Reached' : `${limits.classes.max - limits.classes.used} left`}
                </Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (limits.classes.used / limits.classes.max) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Teachers Allowed</p>
                    <p className="text-lg font-bold text-gray-800">
                      {limits.teachers.used} <span className="text-xs text-gray-400 font-normal">/ {limits.teachers.max} max</span>
                    </p>
                  </div>
                </div>
                <Badge variant={limits.teachers.used >= limits.teachers.max ? 'destructive' : 'secondary'}>
                  {limits.teachers.used >= limits.teachers.max ? 'Limit Reached' : `${limits.teachers.max - limits.teachers.used} left`}
                </Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (limits.teachers.used / limits.teachers.max) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-200">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <CalendarRange className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Sessions Allowed</p>
                    <p className="text-lg font-bold text-gray-800">
                      {limits.sessions?.used ?? 0} <span className="text-xs text-gray-400 font-normal">/ {limits.sessions?.max ?? 1} max</span>
                    </p>
                  </div>
                </div>
                <Badge variant={(limits.sessions?.used ?? 0) >= (limits.sessions?.max ?? 1) ? 'destructive' : 'secondary'}>
                  {(limits.sessions?.used ?? 0) >= (limits.sessions?.max ?? 1)
                    ? 'Limit Reached'
                    : `${(limits.sessions?.max ?? 1) - (limits.sessions?.used ?? 0)} left`}
                </Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((limits.sessions?.used ?? 0) / Math.max(1, limits.sessions?.max ?? 1)) * 100,
                    )}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PLANS SELECTION */}
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">Academic Session Pricing Plans</h3>
            <p className="text-sm text-gray-500">
              Select a plan for your school. <strong>Notice:</strong> If you upgrade while on an active plan, all remaining days will automatically be queued and added to your new validity!
            </p>
          </div>

          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = currentSub?.plan.id === plan.id && !currentSub.isExpired;
                const features = Array.isArray(plan.features) ? plan.features : [];
                const sessionPrice = Number(plan.pricePerSession || plan.priceYearly || 0);

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 transition-all duration-200 hover:shadow-xl ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/20 shadow-md ring-2 ring-blue-600/20'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute right-0 top-0 rounded-bl-xl bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                        Active Plan
                      </div>
                    )}

                    <div className="p-6">
                      <h4 className="text-xl font-extrabold text-gray-900">{plan.name}</h4>
                      {plan.description && (
                        <p className="mt-1 text-xs text-gray-500 min-h-[32px]">{plan.description}</p>
                      )}

                      <div className="my-5 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/50 p-4 border border-gray-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-gray-900">
                            ₹{sessionPrice.toLocaleString()}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">/ Academic Session</span>
                        </div>
                        <p className="mt-1 text-xs text-blue-600 font-medium">
                          Duration: {plan.sessionDurationDays || 365} Days of Full Access
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Plan Features</p>
                        <ul className="space-y-2 text-xs text-gray-600">
                          <li className="flex items-center gap-2 font-semibold text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Includes {plan.sessionLimit || 1} Academic Session(s)</span>
                          </li>
                          <li className="flex items-center gap-2 font-semibold text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Up to {plan.teacherLimit} Teacher Logins</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Max 200 Subjects & 100 Classes</span>
                          </li>
                          {features.map((f: string, idx: number) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <Button
                        className="w-full gap-2 rounded-xl text-sm font-semibold shadow-sm"
                        variant={isCurrent ? 'outline' : 'default'}
                        onClick={() => handleOpenCheckout(plan)}
                      >
                        {isCurrent ? (
                          <>Extend / Renew Plan</>
                        ) : (
                          <>
                            Upgrade to {plan.name} <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* CHECKOUT MODAL WITH RAZORPAY & COUPON */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Confirm Plan Upgrade
              </DialogTitle>
              <DialogDescription>
                Review your order details and apply coupons before checkout.
              </DialogDescription>
            </DialogHeader>

            {selectedPlan && (
              <div className="space-y-4 py-2">
                {/* Plan Summary Card */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{selectedPlan.name}</h4>
                      <p className="text-xs text-blue-700">
                        {selectedPlan.sessionDurationDays || 365} Days • Up to {selectedPlan.teacherLimit} Teachers
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-blue-950">
                        ₹{Number(selectedPlan.pricePerSession || selectedPlan.priceYearly || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DURATION PRESERVATION NOTICE */}
                {currentSub && !currentSub.isExpired && currentSub.remainingDays > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2.5">
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Duration Protection:</strong> Your remaining{' '}
                      <strong>{currentSub.remainingDays} days</strong> on{' '}
                      <strong>{currentSub.plan.name}</strong> will NOT be lost! They will be queued and added to your new validity, giving you a total of{' '}
                      <strong>{(selectedPlan.sessionDurationDays || 365) + currentSub.remainingDays} days</strong>.
                    </div>
                  </div>
                )}

                {/* COUPON CODE INPUT */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Have a Coupon Code?</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. WELCOME20"
                      className="font-mono uppercase font-semibold text-xs"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCodeInput.trim()}
                    >
                      {isApplyingCoupon ? 'Verifying...' : 'Apply'}
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 border border-emerald-200">
                      <span className="font-semibold flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Coupon '{appliedCoupon.code}' applied
                      </span>
                      <span className="font-bold">-₹{appliedCoupon.discount}</span>
                    </div>
                  )}
                </div>

                {/* ORDER TOTAL BREAKDOWN */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Base Plan Price:</span>
                    <span>₹{Number(selectedPlan.pricePerSession || selectedPlan.priceYearly || 0).toLocaleString()}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Coupon Discount:</span>
                      <span>-₹{appliedCoupon.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-sm font-bold text-gray-900">
                    <span>Total Payable:</span>
                    <span className="text-base text-blue-600">
                      ₹{appliedCoupon
                        ? appliedCoupon.finalAmount.toLocaleString()
                        : Number(selectedPlan.pricePerSession || selectedPlan.priceYearly || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Trust Seal */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Secured by Razorpay • Instant Activation</span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isProcessingPayment}>
                Cancel
              </Button>
              <Button
                onClick={handleProceedPayment}
                disabled={isProcessingPayment}
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {isProcessingPayment ? 'Processing...' : 'Pay with Razorpay'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
