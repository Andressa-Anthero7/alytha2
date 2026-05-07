import { AlertCircle, ArrowRight, LayoutGrid, LoaderCircle, PackageSearch, ShieldCheck, Wheat } from 'lucide-react';
import { useEffect, useState, type JSX } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { clearAuth, getCurrentUser } from '../lib/auth';
import { TradingDeskPage } from '../modules/tradingdesk/TradingDeskPage';
import { BACKOFFICE_PATH } from '../shared/appRoutes';
import { apiFetch } from '../shared/api';
import { DashboardWorkspaceHeader } from '../shared/DashboardWorkspaceHeader';
import { formatCurrency, formatDateTime, formatNumber } from '../shared/format';
import type { ClientDashboardBadge, ClientDashboardPayload, ClientDashboardSummaryCard, MarketplaceCardOffer, Offer, User } from '../types';

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

const offerTypeLabels = {
  venda: 'Oferta de venda',
  compra: 'Intenção de compra',
} as const;

const channelLabels = {
  mesa: 'Mesa Alytha',
  direta: 'Oferta direta',
} as const;

const statusLabels = {
  ativa: 'Ativa',
  finalizada: 'Finalizada',
  aguardando_pagamento: 'Aguardando PIX',
} as const;

const grainAccent = {
  Soja: 'bg-emerald-100 text-emerald-800',
  Milho: 'bg-amber-100 text-amber-800',
  Sorgo: 'bg-orange-100 text-orange-800',
} as const;

const toneClasses = {
  slate: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  orange: 'bg-orange-50 text-orange-700',
} as const;

const getStatusTone = (status: Offer['status']) => {
  if (status === 'aguardando_pagamento') {
    return 'bg-amber-100 text-amber-900';
  }

  if (status === 'finalizada') {
    return 'bg-slate-200 text-slate-700';
  }

  return 'bg-emerald-100 text-emerald-800';
};

const getSummaryIcon = (id: ClientDashboardSummaryCard['id']) => {
  if (id === 'activeOffers') return ShieldCheck;
  if (id === 'directOffers') return PackageSearch;
  if (id === 'deskOffers') return Wheat;
  return LayoutGrid;
};

function StatBadge({ badge }: JSX.IntrinsicAttributes & { badge: ClientDashboardBadge }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneClasses[badge.tone]}`}>
      {formatNumber(badge.value)} {badge.label}
    </span>
  );
}

function OwnOfferCard({ offer }: JSX.IntrinsicAttributes & { offer: Offer }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-emerald-200">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
            grainAccent[offer.grain as keyof typeof grainAccent] || 'bg-slate-200 text-slate-700'
          }`}
        >
          {offer.grain}
        </span>
        <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{offerTypeLabels[offer.type]}</span>
      </div>

      <h3 className="mt-2 text-xl font-black leading-tight text-slate-950">
        {formatNumber(offer.quantity)} {offer.unit}
      </h3>
      <p className="mt-1 truncate text-xs font-semibold text-slate-600">{offer.location}</p>

      <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Safra</span>
          <span className="truncate font-bold text-slate-900">{offer.crop}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Valor</span>
          <span className="truncate font-bold text-emerald-700">{formatCurrency(offer.price)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Canal</span>
          <span className="truncate font-bold text-slate-900">{channelLabels[offer.negotiationChannel]}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusTone(offer.status)}`}>
          {statusLabels[offer.status]}
        </span>
        {offer.exclusiveBrokerName ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
            Corretor {offer.exclusiveBrokerName}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Cadastrada em {formatDateTime(offer.createdAt)}</p>
    </article>
  );
}

function MarketOfferCard({ offer }: JSX.IntrinsicAttributes & { offer: MarketplaceCardOffer }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-emerald-200">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
            grainAccent[offer.grain as keyof typeof grainAccent] || 'bg-slate-200 text-slate-700'
          }`}
        >
          {offer.grain}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{offer.shipping}</span>
      </div>

      <h3 className="mt-2 text-lg font-black leading-tight text-slate-950">{offerTypeLabels[offer.type]}</h3>
      <p className="mt-1 truncate text-xs font-semibold text-slate-600">{offer.location}</p>

      <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Quantidade</span>
          <span className="truncate font-bold text-slate-900">
            {formatNumber(offer.quantity)} {offer.unit}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Valor</span>
          <span className="truncate font-bold text-emerald-700">{formatCurrency(offer.price)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Canal</span>
          <span className="truncate font-bold text-slate-900">{channelLabels[offer.negotiationChannel]}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5">
          <span className="font-semibold">Safra</span>
          <span className="truncate font-bold text-slate-900">{offer.crop}</span>
        </div>
      </div>

      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Publicada em {formatDateTime(offer.createdAt)}</p>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser<User>();
  const userId = user?.id ?? null;
  const userType = user?.type ?? null;
  const [dashboard, setDashboard] = useState<ClientDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || userType === 'corretor' || userType === 'backoffice') {
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch('/client-dashboard/');
        const payload = (await response.json().catch(() => null)) as ClientDashboardPayload | { detail?: string } | null;

        if (!response.ok || !payload || !('header' in payload)) {
          throw new Error((payload && 'detail' in payload && payload.detail) || 'Não foi possível carregar o dashboard.');
        }

        setDashboard(payload);
      } catch (loadError) {
        setDashboard(null);
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o dashboard.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [userId, userType]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  if (user.type === 'backoffice') {
    return <Navigate to={BACKOFFICE_PATH} replace />;
  }

  if (user.type === 'corretor') {
    return <TradingDeskPage currentUser={user} onLogout={handleLogout} />;
  }

  const fallbackPrimaryAction =
    user.type === 'vendedor'
      ? { href: '/ofertas/venda/nova', label: 'Cadastrar oferta de venda' }
      : { href: '/ofertas/compra/nova', label: 'Cadastrar demanda (compra)' };

  const header = dashboard?.header;
  const hero = dashboard?.hero;
  const account = dashboard?.account;
  const ownOffersSection = dashboard?.ownOffersSection;
  const marketSection = dashboard?.marketSection;
  const summaryCards = dashboard?.summaryCards || [];
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ef_100%)] text-slate-900">
      <DashboardWorkspaceHeader
        tickerItems={header?.tickerItems || ['Sincronizando painel...', 'Atualizando informações do perfil...']}
        headline={header?.title || 'Carregando painel'}
        subtitle={header?.subtitle || 'Buscando informações do dashboard.'}
        roleLabel={dashboard?.roleLabel || roleLabels[user.type]}
        primaryAction={hero?.primaryAction || fallbackPrimaryAction}
        displayName={header?.userName || user.name}
        companyLabel={header?.userCompany || user.company || roleLabels[user.type]}
        account={account}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          {loading || !hero ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Carregando visão principal do painel...
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{hero.eyebrow}</p>
                <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{hero.title}</h2>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{hero.description}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-1.5 lg:max-w-md lg:justify-end">
                {hero.badges.map((badge) => (
                  <span
                    key={badge.id}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${toneClasses[badge.tone]}`}
                  >
                    {formatNumber(badge.value)} {badge.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {loading && summaryCards.length === 0 ? (
            <div className="col-span-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Carregando indicadores do painel...
            </div>
          ) : (
            summaryCards.map((item) => {
              const Icon = getSummaryIcon(item.id);
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses[item.tone]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    </div>
                    <p className="text-lg font-black leading-none text-slate-950">{formatNumber(item.value)}</p>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {loading || !ownOffersSection ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando as ofertas do seu perfil...
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{ownOffersSection.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{ownOffersSection.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{ownOffersSection.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ownOffersSection.badges.map((badge) => (
                    <StatBadge key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>

              {ownOffersSection.items.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <PackageSearch className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 text-lg font-black text-slate-900">{ownOffersSection.emptyTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{ownOffersSection.emptyDescription}</p>
                  <Link
                    to={hero?.primaryAction.href || fallbackPrimaryAction.href}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                  >
                    {hero?.primaryAction.label || fallbackPrimaryAction.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {ownOffersSection.items.map((offer) => (
                    <OwnOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {loading || !marketSection ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando as últimas oportunidades do marketplace...
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{marketSection.eyebrow}</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{marketSection.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{marketSection.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {marketSection.badges.map((badge) => (
                    <StatBadge key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>

              {marketSection.items.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <PackageSearch className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 text-lg font-black text-slate-900">{marketSection.emptyTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{marketSection.emptyDescription}</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {marketSection.items.map((offer) => (
                    <MarketOfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
