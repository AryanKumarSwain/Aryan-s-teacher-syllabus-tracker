import { RoleGuard } from '@/components/auth/role-guard';
import { UserRole } from '@school-syllabus/types';
import { AdminSessionGuard } from '@/components/admin/session-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowed={[UserRole.SCHOOL_ADMIN]}>
      <AdminSessionGuard />
      {children}
    </RoleGuard>
  );
}
