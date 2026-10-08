'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Tag,
  CheckCircle2,
  Calendar,
  Users,
  Percent,
  Sparkles,
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/services/api-client';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: string | number;
  priceYearly: string | number;
  pricePerSession?: string | number;
  sessionDurationDays?: number;
  sessionLimit?: number;
  teacherLimit: number;
  features?: string[] | any;
  isActive: boolean;
  sortOrder?: number;
  _count?: { subscriptions: number };
}

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountPercent?: string | number | null;
  discountAmount?: string | number | null;
  minOrderAmount?: string | number | null;
  maxDiscount?: string | number | null;
  validUntil?: string | null;
  maxUses?: number | null;
  timesUsed: number;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminPlansPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'coupons'>('plans');

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    pricePerSession: '4999',
    sessionDurationDays: '365',
    sessionLimit: '1',
    priceMonthly: '499',
    priceYearly: '4999',
    teacherLimit: '50',
    features: 'Unlimited Syllabuses, Class Tracking, Exam Paper Generator, Teacher Training Logs',
    sortOrder: '1',
  });

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENT', // PERCENT or FIXED
    discountValue: '20',
    minOrderAmount: '1000',
    maxDiscount: '2000',
    maxUses: '100',
    validUntil: '',
  });

  // Queries
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<Plan[]>('/plans'),
  });

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get<Coupon[]>('/coupons'),
  });

  // Plan Mutations
  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const featuresArray = planForm.features
        .split('\n')
        .flatMap((line) => line.split(','))
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: planForm.name,
        slug: planForm.slug || undefined,
        description: planForm.description,
        pricePerSession: Number(planForm.pricePerSession) || 0,
        sessionDurationDays: Number(planForm.sessionDurationDays) || 365,
        sessionLimit: Number(planForm.sessionLimit) || 1,
        priceMonthly: Number(planForm.priceMonthly) || 0,
        priceYearly: Number(planForm.priceYearly) || 0,
        teacherLimit: Number(planForm.teacherLimit) || 50,
        sortOrder: Number(planForm.sortOrder) || 0,
        features: featuresArray,
      };

      if (editingPlan) {
        return api.patch(`/plans/${editingPlan.id}`, payload);
      }
      return api.post('/plans', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
      setIsPlanModalOpen(false);
      setEditingPlan(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save plan');
    },
  });

  const togglePlanMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/plans/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan status updated');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted successfully');
    },
  });

  // Coupon Mutations
  const saveCouponMutation = useMutation({
    mutationFn: async () => {
      const isPercent = couponForm.discountType === 'PERCENT';
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description,
        discountPercent: isPercent ? Number(couponForm.discountValue) : undefined,
        discountAmount: !isPercent ? Number(couponForm.discountValue) : undefined,
        minOrderAmount: couponForm.minOrderAmount ? Number(couponForm.minOrderAmount) : undefined,
        maxDiscount: isPercent && couponForm.maxDiscount ? Number(couponForm.maxDiscount) : undefined,
        maxUses: couponForm.maxUses ? Number(couponForm.maxUses) : undefined,
        validUntil: couponForm.validUntil ? new Date(couponForm.validUntil).toISOString() : undefined,
      };

      if (editingCoupon) {
        return api.patch(`/coupons/${editingCoupon.id}`, payload);
      }
      return api.post('/coupons', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save coupon');
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/coupons/${id}/toggle`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon status updated');
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted');
    },
  });

  // Handlers for Plan modal
  const openCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      slug: '',
      description: '',
      pricePerSession: '4999',
      sessionDurationDays: '365',
      sessionLimit: '1',
      priceMonthly: '499',
      priceYearly: '4999',
      teacherLimit: '50',
      features: 'Unlimited Syllabuses, Class & Subject Tracking, Exam Paper Generator, Teacher Training Logs',
      sortOrder: '1',
    });
    setIsPlanModalOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    const featuresStr = Array.isArray(plan.features) ? plan.features.join(', ') : '';
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      pricePerSession: String(plan.pricePerSession || plan.priceYearly || 0),
      sessionDurationDays: String(plan.sessionDurationDays || 365),
      sessionLimit: String(plan.sessionLimit || 1),
      priceMonthly: String(plan.priceMonthly || 0),
      priceYearly: String(plan.priceYearly || 0),
      teacherLimit: String(plan.teacherLimit || 50),
      features: featuresStr,
      sortOrder: String(plan.sortOrder || 1),
    });
    setIsPlanModalOpen(true);
  };

  // Handlers for Coupon modal
  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      description: '',
      discountType: 'PERCENT',
      discountValue: '15',
      minOrderAmount: '1000',
      maxDiscount: '1500',
      maxUses: '50',
      validUntil: '',
    });
    setIsCouponModalOpen(true);
  };

  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    const isPercent = !!c.discountPercent;
    setCouponForm({
      code: c.code,
      description: c.description || '',
      discountType: isPercent ? 'PERCENT' : 'FIXED',
      discountValue: String(isPercent ? c.discountPercent : c.discountAmount || 0),
      minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : '',
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      maxUses: c.maxUses ? String(c.maxUses) : '',
      validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
    });
    setIsCouponModalOpen(true);
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 border border-indigo-200">
                <CreditCard className="h-3 w-3" /> Monetization & Billing
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Plans & Discount Promotions
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Configure session packaging, faculty quotas, Razorpay pricing tiers, and promotional discount coupons.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'plans' ? (
              <Button
                onClick={openCreatePlan}
                className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> Create Subscription Plan
              </Button>
            ) : (
              <Button
                onClick={openCreateCoupon}
                className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-[1.02] transition-all gap-1.5"
              >
                <Plus className="h-4 w-4" /> Create Coupon Code
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'plans'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
            Subscription Plans
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {plans.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'coupons'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="h-3.5 w-3.5 text-emerald-600" />
            Coupons & Discounts
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {coupons.length}
            </span>
          </button>
        </div>

        {/* ======================= TAB 1: PLANS ======================= */}
        {activeTab === 'plans' && (
          <div>
            {plansLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
                <CreditCard className="mb-4 h-12 w-12 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700">No Subscription Plans Found</h3>
                <p className="mt-1 text-sm">Click "Create New Plan" to add session-based pricing packages.</p>
                <Button onClick={openCreatePlan} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Create Plan
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const features = Array.isArray(plan.features) ? plan.features : [];
                  const sessionPrice = Number(plan.pricePerSession || plan.priceYearly || 0);

                  return (
                    <Card
                      key={plan.id}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md ${
                        plan.isActive ? 'border-slate-200/90 bg-white' : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                              Academic Session Plan
                            </span>
                            <CardTitle className="mt-0.5 text-lg font-bold text-slate-900">{plan.name}</CardTitle>
                            <p className="text-xs text-slate-400 font-mono">{plan.slug}</p>
                          </div>
                          <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-[10px] font-bold">
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        {plan.description && (
                          <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">{plan.description}</p>
                        )}

                        <div className="my-3.5 rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-900">
                                ₹{sessionPrice.toLocaleString()}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                {plan.sessionLimit && plan.sessionLimit > 1
                                  ? `/ ${plan.sessionLimit} Sessions`
                                  : '/ Session'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ₹{(sessionPrice + Math.round(sessionPrice * 0.18)).toLocaleString()} (incl. GST)
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3 text-blue-600" /> {plan.sessionDurationDays || 365} Days</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 text-purple-600" /> Max {plan.teacherLimit} Teachers</span>
                            <span>•</span>
                            <span>Max {plan.sessionLimit || 1} Session(s)</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                          <ul className="space-y-1 text-xs text-slate-600">
                            {features.slice(0, 4).map((f: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                </div>
                                <span className="truncate">{f}</span>
                              </li>
                            ))}
                            {features.length > 4 && (
                              <li className="text-[11px] text-blue-600 font-bold">+ {features.length - 4} more features</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/60 p-3.5 px-5 flex items-center justify-between">
                        <div className="text-xs text-slate-500 font-semibold">
                          {plan._count?.subscriptions ?? 0} Subscriptions
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-xs font-semibold border-slate-200"
                            onClick={() => togglePlanMutation.mutate(plan.id)}
                          >
                            {plan.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
                                deletePlanMutation.mutate(plan.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 2: COUPONS ======================= */}
        {activeTab === 'coupons' && (
          <div>
            {couponsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
            ) : coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
                <Tag className="mb-4 h-12 w-12 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700">No Coupon Codes Active</h3>
                <p className="mt-1 text-sm">Create promo codes to offer discounts during admin checkout.</p>
                <Button onClick={openCreateCoupon} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Create Coupon Code
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {coupons.map((c) => (
                  <Card key={c.id} className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:shadow-md">
                    <CardHeader className="p-4 sm:p-5 pb-3 flex flex-row items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {c.code}
                          </span>
                          <Badge variant={c.isActive ? 'success' : 'secondary'} className="text-[10px] font-bold">
                            {c.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {c.description && (
                          <CardDescription className="mt-1.5 text-xs text-slate-500">{c.description}</CardDescription>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">Discount:</span>
                        <span className="font-black text-slate-900">
                          {c.discountPercent ? `${c.discountPercent}% OFF` : `₹${c.discountAmount} Flat OFF`}
                          {c.maxDiscount ? ` (Cap: ₹${c.maxDiscount})` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Min Order Amount:</span>
                        <span className="font-bold text-slate-900">₹{c.minOrderAmount || 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-medium">
                        <span>Redemptions:</span>
                        <span className="font-bold text-slate-900">
                          {c.timesUsed} {c.maxUses ? `/ ${c.maxUses}` : ''} uses
                        </span>
                      </div>
                      {c.validUntil && (
                        <div className="flex justify-between text-slate-600 font-medium">
                          <span>Expiry Date:</span>
                          <span className="font-bold text-slate-900">{new Date(c.validUntil).toLocaleDateString()}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold rounded-lg border-slate-200"
                          onClick={() => toggleCouponMutation.mutate(c.id)}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openEditCoupon(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Delete coupon "${c.code}"?`)) {
                              deleteCouponMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================= PLAN CREATE/EDIT DIALOG ======================= */}
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Edit Subscription Plan' : 'Create Session-Based Plan'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan Name *</Label>
                  <Input
                    placeholder="e.g. Premium Academic Session"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Plan Slug (Optional)</Label>
                  <Input
                    placeholder="e.g. premium-session"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Short tagline or summary of this plan"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Base Price (₹) *</Label>
                  <Input
                    type="number"
                    value={planForm.pricePerSession}
                    onChange={(e) => setPlanForm({ ...planForm, pricePerSession: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Session Limit *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={planForm.sessionLimit}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseInt(val, 10);
                      const autoDuration = !isNaN(num) && num > 0 ? String(num * 365) : '365';
                      setPlanForm({
                        ...planForm,
                        sessionLimit: val,
                        sessionDurationDays: autoDuration,
                      });
                    }}
                  />
                </div>
                <div>
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={planForm.sessionDurationDays}
                    onChange={(e) => setPlanForm({ ...planForm, sessionDurationDays: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teacher Limit</Label>
                  <Input
                    type="number"
                    value={planForm.teacherLimit}
                    onChange={(e) => setPlanForm({ ...planForm, teacherLimit: e.target.value })}
                  />
                </div>
              </div>

              {/* LIVE 18% GST PRICE PREVIEW */}
              {(() => {
                const base = Number(planForm.pricePerSession) || 0;
                const gst = Math.round(base * 0.18);
                const total = base + gst;
                return (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-300/80 p-3 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">Base: <strong>₹{base.toLocaleString()}</strong></span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">GST (18%): <strong>+₹{gst.toLocaleString()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-300">
                      <span>Actual Price (with 18% GST):</span>
                      <span className="text-sm font-black text-amber-950">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Display Sort Order</Label>
                  <Input
                    type="number"
                    value={planForm.sortOrder}
                    onChange={(e) => setPlanForm({ ...planForm, sortOrder: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Plan Features (comma or line separated)</Label>
                <Textarea
                  rows={3}
                  placeholder="Unlimited Syllabuses, Class & Subject Tracking, Exam Paper Generator"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => savePlanMutation.mutate()} disabled={savePlanMutation.isPending || !planForm.name}>
                {savePlanMutation.isPending ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ======================= COUPON CREATE/EDIT DIALOG ======================= */}
        <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Edit Coupon Code' : 'Create Coupon Code'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div>
                <Label>Coupon Code *</Label>
                <Input
                  placeholder="e.g. WELCOME20"
                  className="font-mono uppercase font-bold"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="e.g. 20% off on session plan"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    placeholder={couponForm.discountType === 'PERCENT' ? '20' : '500'}
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Order Amount (₹)</Label>
                  <Input
                    type="number"
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Max Discount Cap (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Optional max cap"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Max Uses Limit</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCouponModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveCouponMutation.mutate()}
                disabled={saveCouponMutation.isPending || !couponForm.code || !couponForm.discountValue}
              >
                {saveCouponMutation.isPending ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
