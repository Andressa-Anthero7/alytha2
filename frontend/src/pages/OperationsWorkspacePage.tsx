import { Navigate, useNavigate } from 'react-router-dom';
import { clearAuth, getCurrentUser } from '../lib/auth';
import { TradingDeskPage } from '../modules/tradingdesk/TradingDeskPage';
import { getPrimaryAppPath } from '../shared/appRoutes';
import type { User } from '../types';

export default function OperationsWorkspacePage() {
  const navigate = useNavigate();
  const user = getCurrentUser<User>();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.type !== 'corretor' && user.type !== 'backoffice') {
    return <Navigate to={getPrimaryAppPath(user)} replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return <TradingDeskPage currentUser={user} onLogout={handleLogout} />;
}
