import type { User } from '../types';

type UserLike = Pick<User, 'type'> | null | undefined;

export const BACKOFFICE_PATH = '/app/admin/backoffice';
export const OPERATIONS_PATH = '/mesa-operacional';
export const DASHBOARD_PATH = '/dashboard';

export const getPrimaryAppPath = (user: UserLike) => (user?.type === 'backoffice' ? BACKOFFICE_PATH : DASHBOARD_PATH);
