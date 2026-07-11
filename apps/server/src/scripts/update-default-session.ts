import { PrismaClient } from '@school-syllabus/database';

const prisma = new PrismaClient();

async function updateDefaultSession() {
  console.log('Updating default session to 2026-27 for all schools...');

  try {
    const schools = await prisma.school.findMany({
      where: { deletedAt: null },
    });

    console.log(`Found ${schools.length} schools`);

    for (const school of schools) {
      const session2026 = await prisma.academicSession.findFirst({
        where: { schoolId: school.id, name: '2026-27' },
      });

      if (session2026 && school.currentAcademicSessionId !== session2026.id) {
        await prisma.school.update({
          where: { id: school.id },
          data: { currentAcademicSessionId: session2026.id },
        });
        console.log(`Updated ${school.name} to 2026-27`);
      } else if (!session2026) {
        console.log(`No 2026-27 session found for ${school.name}`);
      } else {
        console.log(`${school.name} already has 2026-27 as current session`);
      }
    }

    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateDefaultSession()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
