import AdminLayout from '@/src/components/AdminLayout';
import ProtectedRoute from '@/src/components/ProtectedRoute';
import { ROLES } from '@/src/lib/constants';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
