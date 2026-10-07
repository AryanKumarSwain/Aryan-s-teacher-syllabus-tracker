'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
  Zap,
  Crown,
  Star,
  Check,
  Receipt,
  History,
  CheckCheck,
  Printer,
  Download,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useSchool } from '@/features/syllabus/hooks/use-school';
import { useAdminSessionStore } from '@/store/admin-session-store';
import { useAuthStore } from '@/store/auth-store';

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
      sessionLimit?: number;
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
  const [selectedReceipt, setSelectedReceipt] = useState<{
    invoiceNo: string;
    date: string;
    planName: string;
    teacherLimit: number;
    startDate: string;
    endDate: string;
    basePrice: number;
    discount: number;
    taxable: number;
    cgst: number;
    sgst: number;
    gstAmount: number;
    totalAmount: number;
    schoolName: string;
    schoolEmail: string;
    schoolPhone?: string;
    schoolAddress?: string;
    paymentId: string;
    orderId: string;
    status: string;
  } | null>(null);

  const user = useAuthStore((s) => s.user);
  const { school } = useSchool();
  const { viewSessionId } = useAdminSessionStore();
  const currentSessionId = viewSessionId || school?.currentAcademicSessionId;

  // Queries
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['admin', 'current-subscription', currentSessionId],
    queryFn: () =>
      api.get<SubscriptionData>('/subscriptions/current', {
        ...(currentSessionId ? { academicSessionId: currentSessionId } : {}),
      }),
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/plans'),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin', 'subscription-history'],
    queryFn: () =>
      api.get<{
        subscriptions: Array<{
          id: string;
          planId?: string;
          status: string;
          startDate: string;
          endDate: string;
          createdAt: string;
          queuedDays?: number;
          queuedPlanId?: string | null;
          queuedPlanName?: string | null;
          plan: {
            id?: string;
            name: string;
            teacherLimit: number;
            sessionLimit?: number;
            pricePerSession?: number;
            priceYearly?: number;
          };
        }>;
        transactions: Array<{
          id: string;
          planId?: string;
          razorpayOrderId: string;
          razorpayPaymentId?: string;
          amount: number;
          discount: number;
          status: string;
          planName?: string;
          couponCode?: string;
          createdAt: string;
          plan?: { name: string };
        }>;
        school?: {
          id: string;
          name: string;
          email: string;
          phone?: string;
          address?: string;
          logo?: string;
        };
      }>('/subscriptions/history'),
  });

  const currentSub = subData?.subscription;
  const limits = subData?.limits || {
    subjects: { used: 0, max: 200 },
    classes: { used: 0, max: 100 },
    teachers: { used: 0, max: 50 },
    sessions: { used: 0, max: 1 },
  };

  // Find max plan by highest price or teacher limit
  const maxPrice = plans.length > 0 
    ? Math.max(...plans.map((p) => Number(p.pricePerSession || p.priceYearly || 0)))
    : 0;

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

      // Close checkout dialog so Radix focus-trap & pointer-events lock don't block Razorpay
      setIsCheckoutOpen(false);

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency,
        name: 'School Syllabus Tracker',
        description: `Upgrade to ${selectedPlan.name} (Academic Session)`,
        order_id: orderData.orderId,
        modal: {
          ondismiss: () => {
            // Re-open checkout dialog if user dismissed without completing payment
            setIsCheckoutOpen(true);
            setIsProcessingPayment(false);
          },
          escape: true,
          backdropclose: false,
        },
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
            setSelectedPlan(null);
            setAppliedCoupon(null);
            qc.invalidateQueries({ queryKey: ['admin', 'current-subscription'] });
            qc.invalidateQueries({ queryKey: ['admin', 'subscription-history'] });
            qc.invalidateQueries({ queryKey: ['plans'] });
          } catch (verifyErr: any) {
            toast.error(verifyErr.message || 'Payment verification failed');
            setIsCheckoutOpen(true);
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: user?.name || school?.name || 'School Administrator',
          email: user?.email || undefined,
          contact: user?.phone || undefined,
        },
        theme: {
          color: '#d97706',
        },
      };

      // Ensure pointer-events are immediately restored on body
      if (typeof document !== 'undefined') {
        document.body.style.pointerEvents = 'auto';
      }

      setTimeout(() => {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failRes: any) => {
          toast.error(failRes?.error?.description || 'Payment Failed');
          setIsCheckoutOpen(true);
          setIsProcessingPayment(false);
        });
        rzp.open();
      }, 50);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment');
      setIsProcessingPayment(false);
    }
  };

  return (
    <DashboardShell title="Upgrade & Subscription Plans">
      <div className="space-y-8 pb-10">
        {/* CURRENT PLAN VALIDITY BANNER (ONLY SHOWN WHEN ACTIVE SUBSCRIPTION EXISTS) */}
        {currentSub && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-2xl relative"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 -mb-16 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wide text-blue-200 border border-blue-400/30 backdrop-blur-md">
                    <Sparkles className="h-3.5 w-3.5 text-blue-300" /> Current Active Plan
                  </span>
                  <Badge
                    variant={currentSub.isExpired ? 'destructive' : 'default'}
                    className={
                      currentSub.isExpired
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-emerald-500/90 text-white font-bold'
                    }
                  >
                    {currentSub.isExpired ? 'Expired' : 'Active'}
                  </Badge>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
                  {currentSub.plan.name}
                  {Number(currentSub.plan.pricePerSession || currentSub.plan.priceYearly || 0) === maxPrice && (
                    <Crown className="h-7 w-7 text-amber-400 fill-amber-400" />
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-blue-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-300" />
                    <span>
                      Valid until:{' '}
                      <strong className="text-white">
                        {new Date(currentSub.endDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>
                  <span className="text-blue-400">•</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-300" />
                    <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                      {currentSub.remainingDays} Days Remaining
                    </span>
                  </div>
                </div>

                {/* QUEUED DURATION EXTENSION NOTICE */}
                {currentSub.queuedDays && currentSub.queuedDays > 0 ? (
                  <div className="mt-2 flex items-center gap-2 rounded-2xl bg-amber-500/20 px-4 py-2.5 text-xs text-amber-200 border border-amber-400/30 backdrop-blur-md">
                    <Zap className="h-4 w-4 text-amber-300 shrink-0" />
                    <span>
                      <strong>Queue Extension Active:</strong> Included <strong>{currentSub.queuedDays} days</strong> carried over from your previous plan ({currentSub.queuedPlanName || 'Plan A'}). No duration was lost!
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Quick stats badge */}
              <div className="rounded-2xl bg-white/[0.08] p-5 backdrop-blur-md border border-white/15 lg:w-84 shadow-inner flex flex-col justify-center">
                <div className="text-xs uppercase tracking-wider text-blue-200 font-bold mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Plan Quota & Validity
                </div>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-slate-300">Teacher Limit:</span>
                    <span className="font-bold text-white">{currentSub.plan.teacherLimit} Teachers</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-slate-300">Session Limit:</span>
                    <span className="font-bold text-emerald-300">
                      {currentSub.plan.sessionLimit || 1} Session(s)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/10">
                    <span className="text-slate-300">Plan Duration:</span>
                    <span className="font-bold text-white">{currentSub.plan.sessionDurationDays || 365} Days</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-300">Billing Cycle:</span>
                    <span className="font-bold text-amber-300">Academic Session</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {/* 1. PLANS SELECTION (NOW AT TOP) */}
        <div className="space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-indigo-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20 mb-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-600" /> Academic Session Pricing
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Select Your School Plan
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-2xl mt-0.5">
                Plans are per academic session (365 days). Upgrading while on an active plan preserves and queues all remaining days automatically!
              </p>
            </div>
          </div>

          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[520px] rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
              {plans.map((plan, index) => {
                const isCurrent = currentSub?.plan.id === plan.id && !currentSub.isExpired;
                const features = Array.isArray(plan.features) ? plan.features : [];
                const sessionPrice = Number(plan.pricePerSession || plan.priceYearly || 0);
                const isMaxPlan = sessionPrice === maxPrice && plans.length > 1;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -6 }}
                    className={`relative flex flex-col justify-between rounded-3xl transition-all duration-300 ${
                      isMaxPlan
                        ? 'border-2 border-amber-400/90 bg-gradient-to-b from-amber-500/[0.08] via-amber-50/40 to-yellow-50/20 shadow-2xl shadow-amber-500/20 ring-4 ring-amber-400/20'
                        : isCurrent
                        ? 'border-2 border-blue-600 bg-gradient-to-b from-blue-50/40 to-white shadow-xl ring-2 ring-blue-600/30'
                        : 'border-2 border-slate-200/90 bg-gradient-to-b from-slate-50/50 via-white to-indigo-50/20 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10'
                    }`}
                  >
                    {/* Top Badges */}
                    {isMaxPlan && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-500/40 border border-amber-300">
                          <Crown className="h-3.5 w-3.5 fill-white" />
                          Most Popular • Max Value
                        </span>
                      </div>
                    )}

                    {isCurrent && !isMaxPlan && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                          <Check className="h-3.5 w-3.5" />
                          Active Plan
                        </span>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-7 sm:p-8">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-2xl font-black tracking-tight ${
                                isMaxPlan ? 'text-amber-950' : 'text-gray-900'
                              }`}
                            >
                              {plan.name}
                            </h4>
                            {isMaxPlan && (
                              <Star className="h-5 w-5 text-amber-500 fill-amber-400" />
                            )}
                          </div>
                          {plan.description && (
                            <p
                              className={`mt-1.5 text-xs sm:text-sm min-h-[36px] leading-relaxed ${
                                isMaxPlan ? 'text-amber-900/80 font-medium' : 'text-gray-500'
                              }`}
                            >
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price Section */}
                      <div
                        className={`my-6 rounded-2xl p-5 border transition-all ${
                          isMaxPlan
                            ? 'bg-gradient-to-br from-amber-500/15 via-yellow-400/10 to-amber-100/40 border-amber-300/80 shadow-sm'
                            : 'bg-gradient-to-br from-slate-100/80 to-indigo-50/60 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-4xl font-black tracking-tight ${
                              isMaxPlan ? 'text-amber-950' : 'text-slate-900'
                            }`}
                          >
                            ₹{sessionPrice.toLocaleString()}
                          </span>
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isMaxPlan ? 'text-amber-800/80' : 'text-gray-500'
                            }`}
                          >
                            {plan.sessionLimit && plan.sessionLimit > 1
                              ? `/ ${plan.sessionLimit} Academic Sessions`
                              : '/ Academic Session'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                              isMaxPlan
                                ? 'bg-amber-500/20 text-amber-900 border border-amber-400/30'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                            }`}
                          >
                            <Clock className="h-3 w-3" /> Duration: {plan.sessionDurationDays || 365} Days Full Access
                          </span>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-3.5">
                        <p
                          className={`text-xs font-extrabold uppercase tracking-wider ${
                            isMaxPlan ? 'text-amber-900/70' : 'text-gray-400'
                          }`}
                        >
                          Included Privileges
                        </p>
                        <ul className="space-y-2.5 text-xs sm:text-sm">
                          <li
                            className={`flex items-center gap-2.5 font-bold ${
                              isMaxPlan ? 'text-amber-950' : 'text-gray-800'
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                isMaxPlan
                                  ? 'bg-amber-500/20 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            </div>
                            <span>Includes {plan.sessionLimit || 1} Academic Session(s)</span>
                          </li>
                          <li
                            className={`flex items-center gap-2.5 font-bold ${
                              isMaxPlan ? 'text-amber-950' : 'text-gray-800'
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                isMaxPlan
                                  ? 'bg-amber-500/20 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            </div>
                            <span>Up to {plan.teacherLimit} Teacher Logins</span>
                          </li>
                          <li
                            className={`flex items-center gap-2.5 ${
                              isMaxPlan ? 'text-amber-950 font-semibold' : 'text-gray-700'
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                isMaxPlan
                                  ? 'bg-amber-500/20 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            </div>
                            <span>Max 200 Subjects & 100 Classes</span>
                          </li>
                          {features.map((f: string, idx: number) => (
                            <li
                              key={idx}
                              className={`flex items-center gap-2.5 ${
                                isMaxPlan ? 'text-amber-950/90 font-medium' : 'text-gray-600'
                              }`}
                            >
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                                  isMaxPlan
                                    ? 'bg-amber-500/20 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              </div>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Card Footer / CTA Button */}
                    <div className="p-7 sm:p-8 pt-0">
                      <Button
                        onClick={() => handleOpenCheckout(plan)}
                        className={`w-full py-6 text-base font-bold rounded-2xl transition-all duration-300 shadow-md ${
                          isMaxPlan
                            ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-amber-500/30 border border-amber-400 hover:shadow-amber-500/50 hover:scale-[1.02]'
                            : isCurrent
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:scale-[1.02]'
                            : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-600/20 hover:scale-[1.02]'
                        }`}
                      >
                        {isCurrent ? (
                          <>Extend / Renew Plan</>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            {isMaxPlan && <Crown className="h-4 w-4 fill-white" />}
                            Upgrade to {plan.name} <ArrowRight className="h-4 w-4 ml-1" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. SUBSCRIPTION & PLAN PURCHASE HISTORY */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" /> Plan Purchase History
              </h2>
              <p className="text-xs text-gray-500">
                Record of all subscription plans and upgrades purchased by your school
              </p>
            </div>
          </div>

          <Card className="rounded-2xl border-gray-200 bg-white/95 shadow-sm overflow-hidden">
            {historyLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : !historyData?.subscriptions || historyData.subscriptions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                  <Receipt className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-800">No Plan History Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Once you choose and activate a session plan, your invoices and subscription validity records will be archived here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Plan Name</th>
                      <th className="py-3 px-4">Billing Cycle</th>
                      <th className="py-3 px-4">Teacher Quota</th>
                      <th className="py-3 px-4">Amount (Paid)</th>
                      <th className="py-3 px-4">Activation Date</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Receipt / Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const activeSub = historyData.subscriptions.find(
                        (s) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date()
                      );

                      return historyData.subscriptions.map((sub) => {
                        const isSubActive = sub.id === activeSub?.id;
                        const isUpgradedAndQueued = !isSubActive && activeSub && (
                          activeSub.queuedPlanId === sub.planId ||
                          activeSub.queuedPlanName === sub.plan?.name ||
                          (activeSub.queuedDays && activeSub.queuedDays > 0 && new Date(sub.createdAt) < new Date(activeSub.createdAt))
                        );

                        const tx = historyData?.transactions?.find((t) => t.planId === sub.planId || t.planName === sub.plan?.name);
                        const baseRate = Number(sub.plan.pricePerSession || sub.plan.priceYearly || 0);
                        const discount = tx?.discount ? Number(tx.discount) : 0;
                        const taxable = Math.max(0, baseRate - discount);
                        const gstAmount = Math.round(taxable * 0.18);
                        const totalPaidAmount = tx?.amount ? Number(tx.amount) : taxable + gstAmount;

                        const handleOpenReceipt = () => {
                          setSelectedReceipt({
                            invoiceNo: `INV-${sub.id.substring(0, 8).toUpperCase()}`,
                            date: new Date(sub.startDate || sub.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }),
                            planName: sub.plan.name,
                            teacherLimit: sub.plan.teacherLimit,
                            startDate: new Date(sub.startDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
                            endDate: new Date(sub.endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
                            basePrice: baseRate,
                            discount,
                            taxable,
                            cgst: Math.round(gstAmount / 2),
                            sgst: Math.round(gstAmount / 2),
                            gstAmount,
                            totalAmount: totalPaidAmount,
                            schoolName: historyData?.school?.name || school?.name || 'School Partner',
                            schoolEmail: historyData?.school?.email || 'admin@school.edu',
                            schoolPhone: historyData?.school?.phone || '',
                            schoolAddress: historyData?.school?.address || '',
                            paymentId: tx?.razorpayPaymentId || `PAY_${sub.id.substring(0, 8).toUpperCase()}`,
                            orderId: tx?.razorpayOrderId || `ORD_${sub.id.substring(0, 8).toUpperCase()}`,
                            status: isSubActive ? 'ACTIVE' : isUpgradedAndQueued ? 'UPGRADED & QUEUED' : sub.status,
                          });
                        };

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">{sub.plan.name}</span>
                                {isSubActive && sub.queuedDays && sub.queuedDays > 0 ? (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                                    +{sub.queuedDays}d Queued ({sub.queuedPlanName || 'Previous Plan'})
                                  </Badge>
                                ) : isUpgradedAndQueued ? (
                                  <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
                                    Merged into {activeSub?.plan.name}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-gray-600">
                              {sub.plan.sessionLimit && sub.plan.sessionLimit > 1
                                ? `${sub.plan.sessionLimit} Sessions (${sub.plan.sessionLimit * 365}d)`
                                : 'Academic Session (365d)'}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-gray-600">{sub.plan.teacherLimit} Teachers</td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              ₹{totalPaidAmount.toLocaleString('en-IN')}
                              <span className="text-[10px] text-gray-400 font-normal ml-1">(incl. GST)</span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">
                              {new Date(sub.startDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-gray-500 font-medium">
                              {new Date(sub.endDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isSubActive ? (
                                <Badge className="bg-emerald-500 text-white font-bold shadow-sm px-2.5 py-0.5">
                                  Active
                                </Badge>
                              ) : isUpgradedAndQueued ? (
                                <Badge variant="secondary" className="bg-amber-50 text-amber-800 border border-amber-300 font-bold px-2 py-0.5">
                                  <Zap className="h-3 w-3 mr-1 text-amber-600 inline" />
                                  Upgraded & Queued
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border border-gray-200">
                                  {sub.status === 'EXPIRED' ? 'Expired' : sub.status}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenReceipt}
                                className="h-7 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 font-semibold gap-1.5 shadow-sm"
                              >
                                <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                                Receipt
                              </Button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* CHECKOUT MODAL WITH RAZORPAY & COUPON (2-COLUMN SIDE-BY-SIDE LAYOUT) */}
        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl">
            {selectedPlan && (() => {
              const basePlanPrice = Number(selectedPlan.pricePerSession || selectedPlan.priceYearly || 0);
              const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
              const taxableAmount = Math.max(0, basePlanPrice - couponDiscount);
              const gstAmount = Math.round(taxableAmount * 0.18);
              const totalPayableWithGst = taxableAmount + gstAmount;
              const features = Array.isArray(selectedPlan.features) ? selectedPlan.features : [];
              const isMaxTier = basePlanPrice === maxPrice;

              return (
                <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
                  {/* LEFT SIDE: PLAN DETAILS & PRIVILEGES */}
                  <div
                    className={`md:col-span-5 p-6 flex flex-col justify-between text-white relative overflow-hidden ${
                      isMaxTier
                        ? 'bg-gradient-to-b from-amber-950 via-slate-950 to-indigo-950 border-r border-amber-500/20'
                        : 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border-r border-indigo-500/20'
                    }`}
                  >
                    <div className="space-y-4 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              isMaxTier
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                            }`}
                          >
                            {isMaxTier ? <Crown className="h-3 w-3 fill-amber-300" /> : <Sparkles className="h-3 w-3" />}
                            Selected Plan
                          </span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                          {selectedPlan.name}
                        </h3>
                        {selectedPlan.description && (
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {selectedPlan.description}
                          </p>
                        )}
                      </div>

                      {/* Key highlights */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                          <span className="text-xs font-black text-white">{selectedPlan.sessionDurationDays || 365} Days</span>
                        </div>
                        <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm border border-white/10">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Teacher Quota</span>
                          <span className="text-xs font-black text-white">{selectedPlan.teacherLimit} Logins</span>
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <div className="space-y-2 pt-2">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                          Included In This Plan:
                        </p>
                        <ul className="space-y-2 text-xs text-slate-200">
                          <li className="flex items-start gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                isMaxTier ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            />
                            <span className="font-semibold text-white">
                              Includes {selectedPlan.sessionLimit || 1} Academic Session(s)
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                isMaxTier ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            />
                            <span className="font-semibold text-white">
                              Up to {selectedPlan.teacherLimit} Teacher Logins
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2
                              className={`h-4 w-4 shrink-0 mt-0.5 ${
                                isMaxTier ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            />
                            <span>Max 200 Subjects & 100 Classes</span>
                          </li>
                          {features.slice(0, 4).map((f: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`h-4 w-4 shrink-0 mt-0.5 ${
                                  isMaxTier ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              />
                              <span className="text-slate-300">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 mt-4 relative z-10">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">Plan Base Rate:</span>
                        <span className="text-xl font-black text-amber-300">
                          ₹{basePlanPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE: CHECKOUT, COUPON & TAX BREAKDOWN */}
                  <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-4 bg-white">
                    <div>
                      <DialogHeader className="p-0 text-left mb-4">
                        <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-amber-600" />
                          Order & Payment Checkout
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                          Complete payment to instantly activate this plan for your school.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {/* DURATION PRESERVATION NOTICE */}
                        {currentSub && !currentSub.isExpired && currentSub.remainingDays > 0 && (
                          <div className="rounded-2xl bg-amber-500/10 border border-amber-300 p-3 text-xs text-amber-950 flex items-start gap-2.5">
                            <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Duration Protection:</strong> Your remaining{' '}
                              <strong>{currentSub.remainingDays} days</strong> on{' '}
                              <strong>{currentSub.plan.name}</strong> will be queued and added to your new validity, giving you a total of{' '}
                              <strong>{(selectedPlan.sessionDurationDays || 365) + currentSub.remainingDays} days</strong>.
                            </div>
                          </div>
                        )}

                        {/* COUPON CODE INPUT */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-gray-700">Have a Coupon Code?</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g. WELCOME20"
                              className="font-mono uppercase font-semibold text-xs rounded-xl"
                              value={couponCodeInput}
                              onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl font-semibold"
                              onClick={handleApplyCoupon}
                              disabled={isApplyingCoupon || !couponCodeInput.trim()}
                            >
                              {isApplyingCoupon ? 'Verifying...' : 'Apply'}
                            </Button>
                          </div>
                          {appliedCoupon && (
                            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 border border-emerald-200">
                              <span className="font-semibold flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-emerald-600" /> Coupon '{appliedCoupon.code}' applied
                              </span>
                              <span className="font-bold text-emerald-700">-₹{appliedCoupon.discount}</span>
                            </div>
                          )}
                        </div>

                        {/* ITEMIZED TAX BREAKDOWN WITH 18% GST */}
                        <div className="rounded-2xl border border-gray-200 bg-slate-50/80 p-4 space-y-2 text-xs">
                          <div className="flex justify-between text-gray-600 font-medium">
                            <span>Base Plan Price:</span>
                            <span className="font-bold text-gray-800">₹{basePlanPrice.toLocaleString()}</span>
                          </div>
                          {appliedCoupon && (
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span>Coupon Discount:</span>
                              <span>-₹{couponDiscount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-600 font-medium">
                            <span>GST (18%):</span>
                            <span className="font-bold text-gray-800">+₹{gstAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-2.5 text-sm font-black text-gray-900 items-baseline">
                            <div>
                              <span>Total Payable:</span>
                              <span className="block text-[10px] font-normal text-gray-500">(Inclusive of 18% GST)</span>
                            </div>
                            <span className="text-2xl font-black text-amber-600">
                              ₹{totalPayableWithGst.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Trust Seal */}
                        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span>Secured by Razorpay • Instant Session Activation</span>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2 sm:justify-end">
                      <Button
                        variant="outline"
                        className="rounded-xl font-semibold"
                        onClick={() => setIsCheckoutOpen(false)}
                        disabled={isProcessingPayment}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProceedPayment}
                        disabled={isProcessingPayment}
                        className="gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold shadow-md shadow-amber-500/30 px-6"
                      >
                        {isProcessingPayment ? 'Processing...' : 'Pay with Razorpay →'}
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* 3. TAX INVOICE & RECEIPT MODAL */}
        <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl bg-white border border-gray-200">
            {selectedReceipt && (
              <div className="p-6 md:p-8 space-y-6" id="tax-receipt-print-area">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-indigo-900 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                        <Sparkles className="h-5 w-5 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-lg leading-tight">Tax Invoice & Receipt</h3>
                        <p className="text-[11px] text-gray-500 font-medium">Syllabus Tracker SaaS Platform</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono pt-1">
                      GSTIN: 07AAACH1234F1Z8 • SAC: 998315 (Software Platform)
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600 inline" /> PAID
                    </Badge>
                    <p className="text-xs font-bold text-gray-800 font-mono mt-1">{selectedReceipt.invoiceNo}</p>
                    <p className="text-[11px] text-gray-500">Date: {selectedReceipt.date}</p>
                  </div>
                </div>

                {/* Billed To / School Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Billed To (School)
                    </span>
                    <p className="font-bold text-gray-900 text-sm">{selectedReceipt.schoolName}</p>
                    <p className="text-gray-600 mt-0.5">{selectedReceipt.schoolEmail}</p>
                    {selectedReceipt.schoolAddress && (
                      <p className="text-gray-500 mt-0.5">{selectedReceipt.schoolAddress}</p>
                    )}
                    {selectedReceipt.schoolPhone && (
                      <p className="text-gray-500 mt-0.5">Contact: {selectedReceipt.schoolPhone}</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Subscription Coverage
                    </span>
                    <p className="font-bold text-gray-900">{selectedReceipt.startDate} — {selectedReceipt.endDate}</p>
                    <p className="text-gray-500 mt-1 font-mono text-[11px]">
                      Payment ID: <span className="font-semibold text-gray-700">{selectedReceipt.paymentId}</span>
                    </p>
                    <p className="text-gray-500 font-mono text-[11px]">
                      Order ID: <span className="font-semibold text-gray-700">{selectedReceipt.orderId}</span>
                    </p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Plan Details</th>
                        <th className="py-2.5 px-3 text-center">Teacher Quota</th>
                        <th className="py-2.5 px-3 text-right">Base Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900">{selectedReceipt.planName}</p>
                          <p className="text-[11px] text-gray-500">Academic Session Plan (365 Days Validity)</p>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-gray-700">
                          {selectedReceipt.teacherLimit} Teachers
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-gray-900">
                          ₹{selectedReceipt.basePrice.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tax & Total Calculation */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Base Plan Rate:</span>
                      <span className="font-medium">₹{selectedReceipt.basePrice.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedReceipt.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount Applied:</span>
                        <span className="font-medium">-₹{selectedReceipt.discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                      <span>Taxable Value:</span>
                      <span className="font-medium">₹{selectedReceipt.taxable.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>CGST (9%):</span>
                      <span>₹{selectedReceipt.cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>SGST (9%):</span>
                      <span>₹{selectedReceipt.sgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-sm">
                      <span>Total Paid (incl. 18% GST):</span>
                      <span className="text-indigo-600 text-base">₹{selectedReceipt.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Footer and Print Button */}
                <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-400 gap-3">
                  <p>Computer-generated official tax receipt. Payment gateway: Razorpay.</p>
                  <div className="flex items-center gap-2 print:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedReceipt(null)}
                      className="text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Global Print Stylesheet for Invoices */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #tax-receipt-print-area,
          #tax-receipt-print-area * {
            visibility: visible;
          }
          #tax-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </DashboardShell>
  );
}

