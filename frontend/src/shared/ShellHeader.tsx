import type { ReactNode } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import type { User } from '../types';
import { BrandLogo } from './BrandLogo';

type ShellHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  user?: User | null;
  roleLabel?: string;
  onLogout?: () => void;
};

export function ShellHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  user,
  roleLabel,
  onLogout,
}: ShellHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-9 sm:h-10" width={360} height={360} />
          <div>
            {eyebrow && <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>}
            <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {actions}
          {user && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {roleLabel || user.type}
                  {user.id ? ` • ID ${user.id}` : ''}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
