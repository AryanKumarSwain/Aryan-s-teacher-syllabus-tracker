import { prisma } from '@school-syllabus/database';

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      subscriptions: true,
      academicSessions: {
        include: {
          _count: {
            select: {
              teachers: true,
              classes: true,
              subjects: true,
            },
          },
        },
      },
    },
  });

  console.log(`Total schools: ${schools.length}`);
  for (const s of schools) {
    console.log(`School: ${s.name} (${s.id}), Subs: ${s.subscriptions.length}, Sessions: ${s.academicSessions.length}`);
    // If school has NO active subscriptions and all sessions are empty (0 teachers, 0 classes, 0 subjects), delete the empty sessions
    const hasActiveSub = s.subscriptions.some((sub: any) => sub.status === 'ACTIVE');
    if (!hasActiveSub) {
      for (const sess of s.academicSessions) {
        if (sess._count.teachers === 0 && sess._count.classes === 0 && sess._count.subjects === 0) {
          console.log(`Deleting empty session: ${sess.name} (${sess.id}) for school ${s.name}`);
          // Remove currentAcademicSessionId if it points to this session
          if (s.currentAcademicSessionId === sess.id) {
            await prisma.school.update({
              where: { id: s.id },
              data: { currentAcademicSessionId: null },
            });
          }
          await prisma.academicSession.delete({
            where: { id: sess.id },
          });
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
