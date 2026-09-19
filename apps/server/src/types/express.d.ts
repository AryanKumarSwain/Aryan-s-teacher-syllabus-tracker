import { UserRole } from '@school-syllabus/types';

declare module 'multer';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
    interface User {
      sub: string;
      email?: string;
      role: UserRole;
      schoolId: string | null;
    }
    interface Request {
      user?: User;
      schoolId?: string | null;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

export {};
