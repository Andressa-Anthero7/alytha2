import type { User } from '../types';

type UserLike = Pick<User, 'type'> | null | undefined;
export type AppUserType = User['type'];

export const BACKOFFICE_PATH = '/app/admin/backoffice';
export const OPERATIONS_PATH = '/mesa-operacional';
export const DASHBOARD_PATH = '/dashboard';
export const HOME_PATH = '/home';

export const getPrimaryAppPath = (user: UserLike) => (user?.type === 'backoffice' ? BACKOFFICE_PATH : DASHBOARD_PATH);

export const canAccessProfileContent = (user: UserLike, allowedTypes?: readonly AppUserType[]) => {
  if (!allowedTypes?.length || !user) return true;
  if (user.type === 'backoffice') return true;
  return allowedTypes.includes(user.type);
};
