import crypto from 'node:crypto';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import { couponService } from './coupon.service.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TNFrLSunBdtmcv';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rYqvnc8Q8GqIpXT6ZSNKp7Ly';

export const subscriptionService = {
  async getCurrentSubscription(schoolId: string, academicSessionId?: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    const now = new Date();
    let remainingDays = 0;
    let isExpired = false;

    if (subscription) {
      const end = new Date(subscription.endDate);
      if (end > now) {
        remainingDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        remainingDays = 0;
        isExpired = true;
      }
    }

    // Resolve target session ID for per-session limits
    let targetSessionId = academicSessionId;
    if (!targetSessionId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { currentAcademicSessionId: true },
      });
      targetSessionId = school?.currentAcademicSessionId || undefined;
    }

    const sessionFilter = targetSessionId ? { academicSessionId: targetSessionId } : {};

    // Counts for limits - scoped PER SESSION
    const [subjectCount, classCount, teacherCount, sessionCount, sessionPurchasesCount] = await Promise.all([
      prisma.subject.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.class.count({ where: { schoolId, deletedAt: null, ...sessionFilter } }),
      prisma.teacher.count({ where: { schoolId, deletedAt: null, status: 'ACTIVE', ...sessionFilter } }),
      prisma.academicSession.count({ where: { schoolId } }),
      prisma.paymentTransaction.count({ where: { schoolId, status: 'SUCCESS', billingCycle: 'SESSION' } }),
    ]);

    const planSessionLimit = subscription?.plan?.sessionLimit ?? 0;
    const maxAllowedSessions = subscription && !isExpired ? Math.max(planSessionLimit, 1 + sessionPurchasesCount) : 0;

    const limits = {
      subjects: { used: subjectCount, max: subscription && !isExpired ? 200 : 0 },
      classes: { used: classCount, max: subscription && !isExpired ? 100 : 0 },
      teachers: { used: teacherCount, max: subscription && !isExpired ? (subscription?.plan?.teacherLimit || 50) : 0 },
      sessions: { used: sessionCount, max: maxAllowedSessions },
    };

    return {
      subscription: subscription
        ? {
            ...subscription,
            remainingDays,
            isExpired,
          }
        : null,
      limits,
      razorpayKeyId: RAZORPAY_KEY_ID,
    };
  },

  async getSubscriptionHistory(schoolId: string) {
    const [subscriptions, transactions, school] = await Promise.all([
      prisma.subscription.findMany({
        where: { schoolId },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.paymentTransaction.findMany({
        where: { schoolId },
        include: {
          plan: true,
          coupon: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          logo: true,
        },
      }),
    ]);

    return {
      subscriptions,
      transactions,
      school,
    };
  },

  async createRazorpayOrder(
    schoolId: string,
    data: {
      planId: string;
      billingCycle?: 'SESSION' | 'YEARLY' | 'MONTHLY';
      couponCode?: string;
    },
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    });
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw new AppError('Selected plan is not available', 404);
    }

    const billingCycle = data.billingCycle || 'SESSION';
    let basePrice = 0;

    if (billingCycle === 'SESSION') {
      basePrice = Number(plan.pricePerSession || plan.priceYearly || 0);
    } else if (billingCycle === 'YEARLY') {
      basePrice = Number(plan.priceYearly || 0);
    } else {
      basePrice = Number(plan.priceMonthly || 0);
    }

    let discount = 0;
    let couponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (data.couponCode && data.couponCode.trim()) {
      const couponRes = await couponService.validateCoupon(data.couponCode, basePrice);
      discount = couponRes.discount;
      couponId = couponRes.coupon.id;
      appliedCouponCode = couponRes.coupon.code;
    }

    const taxableAmount = Math.max(0, basePrice - discount);
    const gstPercent = 18;
    const gstAmount = Math.round(taxableAmount * 0.18);
    const finalAmount = taxableAmount + gstAmount;
    const amountInPaise = Math.round(finalAmount * 100);

    // Call Razorpay API to create an order
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    let razorpayOrderId = `order_${Date.now()}`;

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise > 0 ? amountInPaise : 100, // min 1 INR for test if free
          currency: 'INR',
          receipt: `rcpt_${schoolId.slice(0, 8)}_${Date.now()}`,
          notes: {
            schoolId,
            planId: plan.id,
            planName: plan.name,
            billingCycle,
            basePrice,
            discount,
            gstAmount,
            finalAmount,
          },
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as any;
        console.error('Razorpay order error:', errorData);
        throw new AppError(errorData?.error?.description || 'Failed to initiate Razorpay order', 400);
      }

      const orderData = (await response.json()) as any;
      razorpayOrderId = orderData.id;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error('Error connecting to Razorpay:', err);
      throw new AppError('Unable to connect to payment gateway: ' + (err.message || ''), 500);
    }

    // Save transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        schoolId,
        planId: plan.id,
        couponId,
        couponCode: appliedCouponCode,
        razorpayOrderId,
        amount: finalAmount,
        discount,
        currency: 'INR',
        status: 'PENDING',
        billingCycle,
        planName: plan.name,
      },
    });

    return {
      orderId: razorpayOrderId,
      basePrice,
      discount,
      taxableAmount,
      gstPercent,
      gstAmount,
      amount: finalAmount,
      amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        sessionDurationDays: plan.sessionDurationDays,
      },
      couponCode: appliedCouponCode,
      transactionId: transaction.id,
    };
  },

  async verifyAndActivateSubscription(
    schoolId: string,
    data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Invalid payment signature verification failed', 400);
    }

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { razorpayOrderId, schoolId },
      include: { plan: true },
    });

    if (!transaction) {
      throw new AppError('Payment transaction record not found', 404);
    }

    // Update coupon usage
    if (transaction.couponId) {
      await prisma.coupon.update({
        where: { id: transaction.couponId },
        data: { timesUsed: { increment: 1 } },
      }).catch((e) => console.error('Error updating coupon usage:', e));
    }

    // QUEUE / DURATION STACKING MECHANISM
    // Check if the school currently has an active plan with remaining duration
    const currentActiveSub = await prisma.subscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    const now = new Date();
    let queuedDays = 0;
    let previousPlanName: string | null = null;

    if (currentActiveSub && new Date(currentActiveSub.endDate) > now) {
      const msLeft = new Date(currentActiveSub.endDate).getTime() - now.getTime();
      queuedDays = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      previousPlanName = currentActiveSub.plan.name;
    }

    const plan = transaction.plan;
    let planDurationDays = plan.sessionDurationDays || 365;
    if (transaction.billingCycle === 'MONTHLY') {
      planDurationDays = 30;
    }

    // The remaining duration is stacked/queued onto the new plan's duration
    const totalDays = planDurationDays + queuedDays;
    const startDate = now;
    const endDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    // Mark previous active subscriptions as EXPIRED
    await prisma.subscription.updateMany({
      where: { schoolId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });

    // Create the new active subscription with queued days preserved
    const newSubscription = await prisma.subscription.create({
      data: {
        schoolId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        queuedDays,
        queuedPlanId: currentActiveSub?.planId || null,
        queuedPlanName: previousPlanName,
      },
      include: { plan: true },
    });

    // Mark transaction as SUCCESS
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId,
        razorpaySignature,
        queuedDays,
      },
    });

    return {
      success: true,
      subscription: newSubscription,
      queuedDays,
      previousPlanName,
      totalValidityDays: totalDays,
      endDate,
      message: queuedDays > 0
        ? `Successfully upgraded to ${plan.name}! ${queuedDays} remaining days from your previous plan were added to your validity.`
        : `Successfully subscribed to ${plan.name}!`,
    };
  },

  async getPlatformAnalytics() {
    const [
      totalRevenueResult,
      totalTransactions,
      successfulTransactions,
      activeSubscriptionsCount,
      totalSchoolsCount,
      recentTransactions,
      plansWithSubCount,
      couponsUsage,
    ] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' },
      }),
      prisma.paymentTransaction.count(),
      prisma.paymentTransaction.count({ where: { status: 'SUCCESS' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.school.count({ where: { deletedAt: null } }),
      prisma.paymentTransaction.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          school: { select: { id: true, name: true, slug: true, email: true } },
          plan: { select: { id: true, name: true } },
        },
      }),
      prisma.subscriptionPlan.findMany({
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              subscriptions: { where: { status: 'ACTIVE' } },
              payments: { where: { status: 'SUCCESS' } },
            },
          },
        },
      }),
      prisma.coupon.findMany({
        where: { deletedAt: null },
        orderBy: { timesUsed: 'desc' },
        take: 10,
      }),
    ]);

    const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

    return {
      revenue: {
        total: totalRevenue,
        currency: 'INR',
        successfulCount: successfulTransactions,
        totalCount: totalTransactions,
      },
      subscriptions: {
        active: activeSubscriptionsCount,
        totalSchools: totalSchoolsCount,
      },
      planBreakdown: plansWithSubCount.map((p) => ({
        id: p.id,
        name: p.name,
        pricePerSession: Number(p.pricePerSession),
        priceMonthly: Number(p.priceMonthly),
        activeSchools: p._count.subscriptions,
        totalPayments: p._count.payments,
      })),
      coupons: couponsUsage.map((c) => ({
        id: c.id,
        code: c.code,
        timesUsed: c.timesUsed,
        discountPercent: c.discountPercent ? Number(c.discountPercent) : null,
        discountAmount: c.discountAmount ? Number(c.discountAmount) : null,
        isActive: c.isActive,
      })),
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        schoolName: tx.school?.name || 'Unknown School',
        schoolEmail: tx.school?.email || '',
        planName: tx.plan?.name || tx.planName || 'Plan',
        amount: Number(tx.amount),
        discount: Number(tx.discount),
        couponCode: tx.couponCode,
        status: tx.status,
        billingCycle: tx.billingCycle,
        queuedDays: tx.queuedDays,
        createdAt: tx.createdAt,
      })),
    };
  },
};
