import { prisma } from '../src';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'jdinternationaljaipur@gmail.com'.toLowerCase();
  const rawPassword = 'jdinternationaljaipur@gmail.com';
  const schoolName = 'JD International School, Jaipur';
  const schoolSlug = 'jd-international-jaipur';

  console.log(`🌱 Seeding account for ${email}...`);

  // 1. Ensure Subscription Plans exist with real pricing
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'starter' },
    update: {
      pricePerSession: 1999.0,
      priceYearly: 1999.0,
      priceMonthly: 199.0,
    },
    create: {
      name: 'Starter',
      slug: 'starter',
      description: 'Ideal for small schools and budding learning centers',
      priceMonthly: 199.0,
      priceYearly: 1999.0,
      pricePerSession: 1999.0,
      sessionDurationDays: 365,
      sessionLimit: 1,
      teacherLimit: 15,
      features: ['Includes 1 Academic Session', 'Up to 15 Teacher Logins', 'Max 50 Subjects & 25 Classes', 'Basic Analytics'],
      isActive: true,
      sortOrder: 1,
    },
  });

  const professionalPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'professional' },
    update: {
      pricePerSession: 4999.0,
      priceYearly: 4999.0,
      priceMonthly: 499.0,
    },
    create: {
      name: 'Professional',
      slug: 'professional',
      description: 'For growing institutions needing complete syllabus governance',
      priceMonthly: 499.0,
      priceYearly: 4999.0,
      pricePerSession: 4999.0,
      sessionDurationDays: 365,
      sessionLimit: 1,
      teacherLimit: 50,
      features: [
        'Includes 1 Academic Session(s)',
        'Up to 50 Teacher Logins',
        'Max 200 Subjects & 100 Classes',
        'Dashboard & Analytics',
        'Bulk Import',
        'Priority Support',
        'Exam Paper Generator',
      ],
      isActive: true,
      sortOrder: 2,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { slug: 'enterprise' },
    update: {
      pricePerSession: 9999.0,
      priceYearly: 9999.0,
      priceMonthly: 999.0,
    },
    create: {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large educational institutions and multi-branch schools',
      priceMonthly: 999.0,
      priceYearly: 9999.0,
      pricePerSession: 9999.0,
      sessionDurationDays: 365,
      sessionLimit: 3,
      teacherLimit: 200,
      features: [
        'Includes 3 Academic Sessions',
        'Up to 200 Teacher Logins',
        'Unlimited Classes & Subjects',
        'Exam Paper Generator & Blueprints',
        'Dedicated Account Manager',
        'Custom CBSE Compliance Audits',
      ],
      isActive: true,
      sortOrder: 3,
    },
  });

  // Also fix any plans that have 0.00 pricePerSession
  await prisma.subscriptionPlan.updateMany({
    where: { slug: 'professional', pricePerSession: 0 },
    data: { pricePerSession: 4999.0, priceYearly: 4999.0 },
  });

  const plan = professionalPlan;

  // 2. Upsert School
  const school = await prisma.school.upsert({
    where: { slug: schoolSlug },
    update: {
      name: schoolName,
      status: 'ACTIVE',
    },
    create: {
      name: schoolName,
      slug: schoolSlug,
      email: email,
      phone: '+91-9876543210',
      address: 'Jaipur, Rajasthan',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ School ensured: ${school.name} (${school.id})`);

  // 3. Ensure Academic Session
  let session = await prisma.academicSession.findFirst({
    where: { schoolId: school.id, status: 'ACTIVE' },
  });

  if (!session) {
    session = await prisma.academicSession.create({
      data: {
        schoolId: school.id,
        name: '2026-27',
        status: 'ACTIVE',
      },
    });
  }

  await prisma.school.update({
    where: { id: school.id },
    data: { currentAcademicSessionId: session.id },
  });

  console.log(`✅ Academic session ensured: ${session.name}`);

  // 4. Ensure Active Subscription
  const existingSub = await prisma.subscription.findFirst({
    where: { schoolId: school.id },
  });

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        schoolId: school.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Active subscription linked.`);
  }

  // 5. Upsert User
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: 'JD International Jaipur',
      role: 'SCHOOL_ADMIN',
      phone: '+91-9876543210',
      status: 'ACTIVE',
      schoolId: school.id,
    },
    create: {
      email,
      passwordHash,
      name: 'JD International Jaipur',
      role: 'SCHOOL_ADMIN',
      phone: '+91-9876543210',
      status: 'ACTIVE',
      schoolId: school.id,
    },
  });

  console.log(`✅ User seeded successfully!`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Password: ${rawPassword}`);
  console.log(`   - Role: ${user.role}`);
  console.log(`   - School: ${school.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to seed account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
