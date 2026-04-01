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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo className="h-14" width={360} height={360} />
          <div>
            {eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">{eyebrow}</p>}
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {actions}
          {user && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {roleLabel || user.type}
                  {user.id ? ` • ID ${user.id}` : ''}
                </p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600"
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
