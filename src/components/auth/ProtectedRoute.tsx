'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireVerified?: boolean;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireVerified = false,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    );
  }

  if (!user) {
    return null;
  }

  // Check email verification
  if (requireVerified && !user.email_confirmed_at) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Email Verification Required</h2>
          <p className="text-gray-600">Please verify your email to access this page.</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.user_metadata?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Unauthorized</h2>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
