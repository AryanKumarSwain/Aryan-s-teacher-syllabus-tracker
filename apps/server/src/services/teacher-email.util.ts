import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';

export type TeacherCreateResolution =
  | { action: 'create' }
  | { action: 'restore'; userId: string; teacherId: string };

/**
 * Decide whether to create a new teacher or restore a soft-deleted one.
 * Active emails block creation; soft-deleted teachers in the same school can be restored.
 */
export async function resolveTeacherCreate(
  schoolId: string,
  email: string,
): Promise<TeacherCreateResolution> {
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    include: { teacher: true },
  });

  if (!existing) {
    return { action: 'create' };
  }

  const teacherDeleted = !existing.teacher || existing.teacher.deletedAt !== null;
  const userDeleted = existing.deletedAt !== null;
  const isSoftDeleted = userDeleted || teacherDeleted;

  if (!isSoftDeleted) {
    if (existing.schoolId === schoolId && existing.teacher) {
      throw new AppError('Teacher already exists', 409);
    }
    throw new AppError('Email already in use', 409);
  }

  if (existing.schoolId !== schoolId || !existing.teacher) {
    throw new AppError('Email already in use', 409);
  }

  return {
    action: 'restore',
    userId: existing.id,
    teacherId: existing.teacher.id,
  };
}

export type CredentialsEmailResult = {
  emailSent: boolean;
  emailError?: string;
};

export async function trySendTeacherCredentials(params: {
  to: string;
  teacherName: string;
  schoolName: string;
  email: string;
  tempPassword: string;
}): Promise<CredentialsEmailResult> {
  const { sendTeacherCredentialsEmail } = await import('../emails/teacher-credentials.js');

  try {
    await sendTeacherCredentialsEmail(params);
    return { emailSent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('[Teacher] Credentials email failed (account saved)', {
      to: params.to,
      message,
    });
    return { emailSent: false, emailError: message };
  }
}
