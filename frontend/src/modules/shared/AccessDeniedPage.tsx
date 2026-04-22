import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppRole } from '../../shared/session';
import { BrandLogo } from '../../shared/BrandLogo';

type AccessDeniedPageProps = {
  routeBase: string;
  requiredRole: AppRole;
  onLogout: () => void;
};

const roleLabel = (role: AppRole) => {
  if (role === 'CORRETOR') return 'corretor';
  if (role === 'BACKOFFICE') return 'backoffice';
  return 'cliente';
};

export function AccessDeniedPage({ routeBase, requiredRole, onLogout }: AccessDeniedPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center rounded-[2rem] border border-white/10 bg-white/5 px-8 py-16 text-center shadow-2xl shadow-slate-950/40">
        <BrandLogo className="mb-8 h-20" width={420} height={420} />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="mt-8 text-4xl font-black tracking-tight">Acesso restrito</h1>
        <p className="mt-4 max-w-md text-slate-300">
          Esta rota pertence ao módulo {roleLabel(requiredRole)}. Troque de sessão para continuar.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onLogout}
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700"
          >
            Trocar acesso
          </button>
          <button
            onClick={() => navigate(`${routeBase}/lp/produtor`)}
            className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/30 hover:bg-white/5"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}
