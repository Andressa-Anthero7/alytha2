import type { User } from '../types';
import { clearAuth, getAccessToken, getCurrentUser, getRefreshToken, saveAuth, updateAccessToken } from '../lib/auth';

export type AppRole = 'CLIENTE' | 'CORRETOR' | 'BACKOFFICE';

export type SessionSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
};

export const getStoredSession = (): SessionSnapshot => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  user: getCurrentUser<User>(),
});

export const persistSession = (accessToken: string, refreshToken: string | null, user: User | null) => {
  saveAuth(accessToken, refreshToken, user);
};

export const updateStoredAccessToken = (accessToken: string) => {
  updateAccessToken(accessToken);
};

export const clearStoredSession = () => {
  clearAuth();
};

export const mapUserTypeToRole = (userType?: User['type'] | null): AppRole => {
  if (userType === 'corretor') return 'CORRETOR';
  if (userType === 'backoffice') return 'BACKOFFICE';
  return 'CLIENTE';
};

export const roleToLoginSlug = (role: AppRole) => {
  if (role === 'CORRETOR') return 'corretor';
  if (role === 'BACKOFFICE') return 'backoffice';
  return 'cliente';
};

export const loginPathForRole = (role: AppRole, routeBase = '') => `${routeBase}/app/login/${roleToLoginSlug(role)}`;
