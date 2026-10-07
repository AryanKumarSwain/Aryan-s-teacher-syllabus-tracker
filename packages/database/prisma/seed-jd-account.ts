import { prisma } from '../src';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'jdinternationaljaipur@gmail.com'.toLowerCase();
  const rawPassword = 'jdinternationaljaipur@gmail.com';
  const schoolName = 'JD International School, Jaipur';
  const schoolSlug = 'jd-international-jaipur';

  console.log(`🌱 Seeding account for ${email}...`);

  // 1. Ensure ONLY the 2 requested plans exist
  const standardFeatures = [
    '1 session',
    'Unlimited Syllabuses & Topics',
    'Up to 50 Teacher Accounts',
    'Max 200 Subjects & 100 Classes',
    'Full Exam Paper Generator & Custom PDF Export',
    'CBSE Teacher CPD Training Logs',
    'Priority Phone & Email Support',
  ];

  const standardPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'standard-session' },
    update: {
      name: 'Standard Academic Session',
      description: 'Ideal for small to medium schools managing 1 academic session',
      priceMonthly: 299.0,
      priceYearly: 2999.0,
      pricePerSession: 2999.0,
      sessionDurationDays: 365,
      sessionLimit: 1,
      teacherLimit: 50,
      features: standardFeatures,
      isActive: true,
      sortOrder: 1,
    },
    create: {
      name: 'Standard Academic Session',
      slug: 'standard-session',
      description: 'Ideal for small to medium schools managing 1 academic session',
      priceMonthly: 299.0,
      priceYearly: 2999.0,
      pricePerSession: 2999.0,
      sessionDurationDays: 365,
      sessionLimit: 1,
      teacherLimit: 50,
      features: standardFeatures,
      isActive: true,
      sortOrder: 1,
    },
  });

  const premiumFeatures = [
    '2 session',
    'Unlimited Syllabuses & Topics',
    'Up to 50 Teacher Accounts',
    'Max 200 Subjects & 100 Classes',
    'Full Exam Paper Generator & Custom PDF Export',
    'CBSE Teacher CPD Training Logs',
    'Priority Phone & Email Support',
  ];

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'premium-session' },
    update: {
      name: 'Premium Academic Session',
      description: 'Full-featured package for complete academic syllabus management',
      priceMonthly: 499.0,
      priceYearly: 4999.0,
      pricePerSession: 4999.0,
      sessionDurationDays: 730,
      sessionLimit: 2,
      teacherLimit: 50,
      features: premiumFeatures,
      isActive: true,
      sortOrder: 2,
    },
    create: {
      name: 'Premium Academic Session',
      slug: 'premium-session',
      description: 'Full-featured package for complete academic syllabus management',
      priceMonthly: 499.0,
      priceYearly: 4999.0,
      pricePerSession: 4999.0,
      sessionDurationDays: 730,
      sessionLimit: 2,
      teacherLimit: 50,
      features: premiumFeatures,
      isActive: true,
      sortOrder: 2,
    },
  });

  // Reassign any existing subscriptions / payments pointing to old plans to standardPlan
  await prisma.subscription.updateMany({
    where: { planId: { notIn: [standardPlan.id, premiumPlan.id] } },
    data: { planId: standardPlan.id },
  });
  await prisma.paymentTransaction.updateMany({
    where: { planId: { notIn: [standardPlan.id, premiumPlan.id] } },
    data: { planId: standardPlan.id },
  });

  // Remove any other plans (such as starter, professional, enterprise)
  await prisma.subscriptionPlan.deleteMany({
    where: { slug: { notIn: ['standard-session', 'premium-session'] } },
  });

  const plan = standardPlan;

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
