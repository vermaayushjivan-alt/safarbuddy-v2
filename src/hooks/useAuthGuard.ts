'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
  allowedRoles?: string[];
  requireVerified?: boolean;
  redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { allowedRoles, requireVerified = false, redirectTo = '/auth/login' } = options;

  useEffect(() => {
    if (loading) return;

    // No user, redirect to login
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Check email verification
    if (requireVerified && !user.email_confirmed_at) {
      router.push('/auth/verify-email');
      return;
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.user_metadata?.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, router, allowedRoles, requireVerified, redirectTo]);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAuthorized: !allowedRoles || allowedRoles.includes(user?.user_metadata?.role),
  };
}
