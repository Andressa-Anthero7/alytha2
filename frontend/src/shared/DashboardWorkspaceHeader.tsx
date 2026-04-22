import { ChevronDown, Headset, KeyRound, LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supportEmail, supportWhatsAppHref } from './api';
import { BrandLogo } from './BrandLogo';
import type { ClientDashboardAccount } from '../types';

type DashboardWorkspaceHeaderProps = {
  tickerItems: string[];
  headline: string;
  subtitle: string;
  roleLabel: string;
  primaryAction: {
    href: string;
    label: string;
  };
  displayName: string;
  companyLabel: string;
  account?: ClientDashboardAccount | null;
  onLogout: () => void;
};

const supportHref = supportWhatsAppHref || `mailto:${supportEmail}`;
const supportTarget = supportWhatsAppHref ? '_blank' : undefined;
const supportRel = supportWhatsAppHref ? 'noreferrer' : undefined;

export function DashboardWorkspaceHeader({
  tickerItems,
  headline,
  subtitle,
  roleLabel,
  primaryAction,
  displayName,
  companyLabel,
  account,
  onLogout,
}: DashboardWorkspaceHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const [weekday, dateLabel] = currentDate.split(',');
  const repeatedTicker = [...tickerItems, ...tickerItems];

  return (
    <div className="sticky top-0 z-50">
      <div className="relative flex overflow-hidden whitespace-nowrap border-b border-emerald-900 bg-emerald-950 py-1.5 text-[11px] text-white">
        <div className="flex w-max animate-marquee">
          {repeatedTicker.map((item, index) => (
            <div key={`${item}-${index}`} className="mx-5 flex items-center">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-50">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            <BrandLogo className="h-8 sm:h-10" width={280} height={280} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">{roleLabel}</p>
              <h1 className="truncate text-base font-black tracking-tight text-emerald-950 sm:text-xl">{headline}</h1>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-right xl:block">
              <p className="text-[11px] font-bold capitalize text-slate-900">{weekday}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{dateLabel?.trim()}</p>
            </div>

            <Link
              to={primaryAction.href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-emerald-600 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700 sm:w-auto sm:rounded-full sm:px-3.5 sm:py-2 sm:text-[11px] sm:tracking-[0.16em]"
            >
              {primaryAction.label}
            </Link>

            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowUserMenu((currentValue) => !currentValue)}
                className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm transition-colors hover:bg-white sm:w-auto sm:justify-start sm:gap-2 sm:rounded-full sm:bg-white sm:px-2.5 sm:py-1.5 sm:hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 text-left sm:flex-none">
                  <p className="truncate text-sm font-bold text-slate-900 sm:max-w-40 sm:text-xs">{displayName}</p>
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 sm:max-w-40">
                    {companyLabel}
                  </p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 flex max-h-[min(calc(100vh-7rem),34rem)] w-full origin-top-right flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl sm:w-[21rem]">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {account?.eyebrow || 'Conta conectada'}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{displayName}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">{companyLabel}</p>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                      {account ? (
                        <div className="space-y-1.5 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 lg:space-y-1 lg:py-2">
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:py-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{account.profileLabel}</p>
                            <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-950">{account.profileValue}</p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:py-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{account.companyLabel}</p>
                            <p className="mt-0.5 text-[10px] font-bold leading-tight text-slate-900">{account.companyValue}</p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 lg:py-1.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">{account.focusTitle}</p>
                            <p className="mt-1 text-[11px] leading-4 text-slate-600">{account.focusDescription}</p>

                            <div className="mt-2 grid gap-1 sm:grid-cols-3 lg:mt-1.5">
                              {account.marketIndicators.map((indicator) => (
                                <div key={indicator.id} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 lg:py-1">
                                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">{indicator.label}</p>
                                  <p className="mt-0.5 text-sm font-black text-slate-950">{indicator.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1 px-2 py-2">
                        <Link
                          to="/perfil"
                          onClick={() => setShowUserMenu(false)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <UserRound className="h-4 w-4 text-slate-500" />
                          Meu perfil
                        </Link>

                        <Link
                          to="/perfil/trocar-senha"
                          onClick={() => setShowUserMenu(false)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <KeyRound className="h-4 w-4 text-slate-500" />
                          Trocar senha
                        </Link>

                        <a
                          href={supportHref}
                          target={supportTarget}
                          rel={supportRel}
                          onClick={() => setShowUserMenu(false)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Headset className="h-4 w-4 text-slate-500" />
                          Falar com suporte
                        </a>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-white px-2 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
