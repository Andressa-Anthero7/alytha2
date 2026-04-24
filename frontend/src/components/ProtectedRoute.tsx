import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { canAccessProfileContent, getPrimaryAppPath, type AppUserType } from '../shared/appRoutes';
import type { User } from '../types';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedTypes?: readonly AppUserType[];
};

export default function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const location = useLocation();
  const currentUser = getCurrentUser<User>();

  if (!isAuthenticated() || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessProfileContent(currentUser, allowedTypes)) {
    return <Navigate to={getPrimaryAppPath(currentUser)} replace />;
  }

  return <>{children}</>;
}
