import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { canAccessProfileContent, getPrimaryAppPath, type AppUserType } from '../shared/appRoutes';
import type { User } from '../types';

type ProfileContentRouteProps = {
  children: ReactNode;
  allowedTypes: readonly AppUserType[];
};

export default function ProfileContentRoute({ children, allowedTypes }: ProfileContentRouteProps) {
  const currentUser = getCurrentUser<User>();

  if (isAuthenticated() && currentUser && !canAccessProfileContent(currentUser, allowedTypes)) {
    return <Navigate to={getPrimaryAppPath(currentUser)} replace />;
  }

  return <>{children}</>;
}
