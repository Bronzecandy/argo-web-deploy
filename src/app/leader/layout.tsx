import LeaderLayout from '@/src/components/LeaderLayout';
import ProtectedRoute from '@/src/components/ProtectedRoute';
import { ROLES } from '@/src/lib/constants';

export default function LeaderRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[ROLES.LOCAL_LEADER]}>
      <LeaderLayout>{children}</LeaderLayout>
    </ProtectedRoute>
  );
}
