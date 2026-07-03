import { UserRole } from '@school-syllabus/types';

declare global {
  namespace Express {
    interface User {
      sub: string;
      role: UserRole;
      schoolId: string | null;
    }
    interface Request {
      user?: User;
      schoolId?: string | null;
    }
  }
}

export {};
