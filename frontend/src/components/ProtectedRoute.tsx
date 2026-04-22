import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../lib/auth';

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated() || !getCurrentUser()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
