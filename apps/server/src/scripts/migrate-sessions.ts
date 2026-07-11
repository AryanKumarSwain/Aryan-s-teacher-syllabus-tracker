import { PrismaClient } from '@school-syllabus/database';
import { SessionStatus } from '@school-syllabus/database';

const prisma = new PrismaClient();

// Hardcoded sessions as per requirements
const HARDCODED_SESSIONS = ['2026-27', '2027-28', '2028-29'];

async function migrateSessions() {
  console.log('Starting session migration...');

  try {
    // Get all schools
    const schools = await prisma.school.findMany({
      where: { deletedAt: null },
    });

    console.log(`Found ${schools.length} schools to process`);

    for (const school of schools) {
      if (!school) continue;
      
      console.log(`Processing school: ${school.name} (${school.id})`);

      // Get existing sessions for this school
      const existingSessions = await prisma.academicSession.findMany({
        where: { schoolId: school.id },
        select: { name: true },
      });

      const existingSessionNames = new Set(existingSessions.map((s) => s.name));

      // Create missing hardcoded sessions
      const sessionsToCreate = HARDCODED_SESSIONS.filter(
        (name) => !existingSessionNames.has(name)
      );

      if (sessionsToCreate.length > 0) {
        console.log(`Creating ${sessionsToCreate.length} sessions for school ${school.name}:`, sessionsToCreate);

        const createdSessions = await Promise.all(
          sessionsToCreate.map((sessionName) =>
            prisma.academicSession.create({
              data: {
                schoolId: school.id,
                name: sessionName,
                status: SessionStatus.ACTIVE,
                isArchived: false,
              },
            })
          )
        );

        // If school doesn't have a current session, set 2026-27 as default
        if (!school.currentAcademicSessionId && createdSessions.length > 0) {
          const session2026 = createdSessions.find(s => s.name === '2026-27');
          const targetSession = session2026 || createdSessions[0];
          if (targetSession) {
            await prisma.school.update({
              where: { id: school.id },
              data: { currentAcademicSessionId: targetSession.id },
            });
            console.log(`Set current session for school ${school.name} to ${targetSession.name}`);
          }
        }
      } else {
        console.log(`All hardcoded sessions already exist for school ${school.name}`);
        
        // Update existing schools to use 2026-27 as current session if they have a different one
        const session2026 = await prisma.academicSession.findFirst({
          where: { schoolId: school.id, name: '2026-27' },
        });
        
        if (session2026 && school.currentAcademicSessionId !== session2026.id) {
          await prisma.school.update({
            where: { id: school.id },
            data: { currentAcademicSessionId: session2026.id },
          });
          console.log(`Updated current session for school ${school.name} to 2026-27`);
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSessions()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
