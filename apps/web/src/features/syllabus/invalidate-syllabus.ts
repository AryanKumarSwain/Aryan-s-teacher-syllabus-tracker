import type { QueryClient } from '@tanstack/react-query';
import { syllabusKeys } from './query-keys';

/**
 * Invalidate all structural syllabus caches after create/update/delete.
 * Includes legacy keys (without schoolId) for backward compatibility during migration.
 */
export async function invalidateSyllabusStructure(
  queryClient: QueryClient,
  schoolId?: string | null,
  academicSessionId?: string | null,
) {
  await Promise.all([
    // Legacy / broad keys (requested contract)
    queryClient.invalidateQueries({ queryKey: ['classes'] }),
    queryClient.invalidateQueries({ queryKey: ['subjects'] }),
    queryClient.invalidateQueries({ queryKey: ['syllabus'] }),
    queryClient.invalidateQueries({ queryKey: ['syllabus-tree'] }),
    queryClient.invalidateQueries({ queryKey: ['class'] }),
    queryClient.invalidateQueries({ queryKey: ['classes-list'] }),
    queryClient.invalidateQueries({ queryKey: ['subjects-for-assignment'] }),

    // Tenant-scoped keys with session isolation
    queryClient.invalidateQueries({ queryKey: syllabusKeys.all(schoolId, academicSessionId) }),
    queryClient.invalidateQueries({ queryKey: syllabusKeys.classes(schoolId, academicSessionId) }),
    queryClient.invalidateQueries({ queryKey: syllabusKeys.subjects(schoolId, academicSessionId) }),
    queryClient.invalidateQueries({ queryKey: syllabusKeys.syllabusTree(schoolId, academicSessionId) }),
    queryClient.invalidateQueries({ queryKey: syllabusKeys.classesList(schoolId, academicSessionId) }),
    queryClient.invalidateQueries({
      queryKey: syllabusKeys.subjectsForAssignment(schoolId, undefined, academicSessionId),
    }),
    ...(schoolId
      ? [
          queryClient.invalidateQueries({
            queryKey: ['class', schoolId],
          }),
        ]
      : []),
  ]);
}
