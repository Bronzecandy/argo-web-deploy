import DonorLayout from '@/src/components/DonorLayout';
import ProtectedRoute from '@/src/components/ProtectedRoute';
import { ROLES } from '@/src/lib/constants';

export default function DonorRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[ROLES.DONOR]}>
      <DonorLayout>{children}</DonorLayout>
    </ProtectedRoute>
  );
}
