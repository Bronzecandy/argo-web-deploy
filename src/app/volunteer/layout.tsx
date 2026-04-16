import VolunteerLayout from '@/src/components/VolunteerLayout';
import ProtectedRoute from '@/src/components/ProtectedRoute';
import { ROLES } from '@/src/lib/constants';

export default function VolunteerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[ROLES.VOLUNTEER]}>
      <VolunteerLayout>{children}</VolunteerLayout>
    </ProtectedRoute>
  );
}
