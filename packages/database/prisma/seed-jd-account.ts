import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'jdinternationaljaipur@gmail.com'.toLowerCase();
  const rawPassword = 'jdinternationaljaipur@gmail.com';
  const schoolName = 'JD International School, Jaipur';
  const schoolSlug = 'jd-international-jaipur';

  console.log(`🌱 Seeding account for ${email}...`);

  // 1. Ensure a subscription plan exists
  let plan = await prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
  });

  if (!plan) {
    plan = await prisma.subscriptionPlan.upsert({
      where: { slug: 'professional' },
      update: {},
      create: {
        name: 'Professional',
        slug: 'professional',
        description: 'For growing institutions',
        priceMonthly: 99.99,
        priceYearly: 999.99,
        teacherLimit: 50,
        features: ['Dashboard', 'Analytics', 'Bulk Import', 'Priority Support'],
        isActive: true,
        sortOrder: 1,
      },
    });
  }

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
