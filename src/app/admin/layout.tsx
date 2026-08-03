import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingScreen } from '@/components/auth/LoadingScreen';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute 
      allowedRoles={['admin', 'super_admin']}
      fallback={<LoadingScreen />}
    >
      {children}
    </ProtectedRoute>
  );
}
