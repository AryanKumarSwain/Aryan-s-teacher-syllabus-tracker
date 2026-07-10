/**
 * Tenant-scoped React Query keys for syllabus structure (classes, subjects, tree).
 * Always include schoolId and academicSessionId so caches never bleed across schools or sessions.
 */
export const syllabusKeys = {
  all: (schoolId?: string | null, academicSessionId?: string | null) => ['syllabus', schoolId, academicSessionId] as const,

  classes: (schoolId?: string | null, academicSessionId?: string | null) => ['classes', schoolId, academicSessionId] as const,

  class: (schoolId: string | null | undefined, classId: string, academicSessionId?: string | null) =>
    ['class', schoolId, classId, academicSessionId] as const,

  subjects: (schoolId?: string | null, academicSessionId?: string | null) => ['subjects', schoolId, academicSessionId] as const,

  subjectsForAssignment: (schoolId?: string | null, classId?: string, academicSessionId?: string | null) =>
    ['subjects-for-assignment', schoolId, classId, academicSessionId] as const,

  syllabusTree: (schoolId?: string | null, academicSessionId?: string | null) => ['syllabus-tree', schoolId, academicSessionId] as const,

  /** Used by teacher creation dialog */
  classesList: (schoolId?: string | null, academicSessionId?: string | null) => ['classes-list', schoolId, academicSessionId] as const,
};
