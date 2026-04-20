import { AlertCircle, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import type { PublicMarketplaceOfferListItem, PublicMarketplaceOffersListPayload } from '../types';

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQuantity = (value: number, unit: string) => `${Number(value).toLocaleString('pt-BR')} ${unit}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const typeLabel = {
  venda: 'Oferta de venda',
  compra: 'Demanda de compra',
} as const;

const channelLabel = {
  mesa: 'Operando com a mesa',
  direta: 'Oferta direta',
} as const;

function OfferCard({ offer }: JSX.IntrinsicAttributes & { offer: PublicMarketplaceOfferListItem }) {
  const tone = offer.type === 'venda' ? 'emerald' : 'amber';
  const badgeTone =
    tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900';
  const actionTone = tone === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700';

  return (
    <article className="rounded-[1.6rem] border border-white/80 bg-white/92 p-4 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${badgeTone}`}>
            {typeLabel[offer.type]}
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{offer.grain}</h3>
        </div>
        <p className="text-right text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{formatDate(offer.createdAt)}</p>
      </div>

      <div className="mt-4 grid gap-2.5 text-[13px] text-slate-600 sm:text-sm">
        <div className="flex items-center justify-between gap-4">
          <span>Praça</span>
          <span className="font-bold text-slate-900">{offer.location}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Quantidade</span>
          <span className="font-bold text-slate-900">{formatQuantity(offer.quantity, offer.unit)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Valor</span>
          <span className="font-bold text-slate-900">{formatCurrency(offer.price)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Safra</span>
          <span className="font-bold text-slate-900">{offer.crop}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Pagamento</span>
          <span className="font-bold text-slate-900">{offer.paymentTerms}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
          {channelLabel[offer.negotiationChannel]} • {offer.shipping}
        </div>
        <Link
          to={`/oportunidade/${offer.id}`}
          className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white ${actionTone}`}
        >
          Acessar
        </Link>
      </div>

      {offer.negotiationChannel === 'mesa' && offer.mesaCommission ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-700">
          Comissão da mesa: {formatCurrency(offer.mesaCommission)} por saca
        </div>
      ) : null}
    </article>
  );
}

export default function HomePage() {
  const [payload, setPayload] = useState<PublicMarketplaceOffersListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todas' | 'venda' | 'compra'>('todas');
  const [channelFilter, setChannelFilter] = useState<'todas' | 'mesa' | 'direta'>('todas');
  const [shippingFilter, setShippingFilter] = useState<'todas' | 'FOB' | 'CIF'>('todas');

  const hasActiveFilters = useMemo(
    () => Boolean(query.trim()) || typeFilter !== 'todas' || channelFilter !== 'todas' || shippingFilter !== 'todas',
    [channelFilter, query, shippingFilter, typeFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const loadOffers = async () => {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        }
        if (typeFilter !== 'todas') {
          params.set('type', typeFilter);
        }
        if (channelFilter !== 'todas') {
          params.set('negotiationChannel', channelFilter);
        }
        if (shippingFilter !== 'todas') {
          params.set('shipping', shippingFilter);
        }
        params.set('limit', '100');

        try {
          const response = await apiFetch(`/public-marketplace/offers?${params.toString()}`, { signal: controller.signal });
          const data = (await response.json().catch(() => null)) as PublicMarketplaceOffersListPayload | { detail?: string } | null;

          if (!response.ok || !data || !('items' in data)) {
            throw new Error((data && 'detail' in data && data.detail) || 'Não foi possível carregar o marketplace.');
          }

          setPayload(data);
        } catch (loadError) {
          if (loadError instanceof DOMException && loadError.name === 'AbortError') {
            return;
          }
          setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o marketplace.');
        } finally {
          setLoading(false);
        }
      };

      void loadOffers();
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [channelFilter, query, shippingFilter, typeFilter]);

  const items = payload?.items ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ef_0%,#ffffff_34%,#f6efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <section className="rounded-[1.8rem] border border-white/80 bg-white/92 p-5 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[2.1rem] sm:p-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Marketplace</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Ofertas e demandas públicas</h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-600 sm:text-sm sm:leading-6">
                Busque por qualquer campo da oferta/demanda (grão, praça, safra, frete, modalidade, pagamento e outros).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                {payload?.count ?? 0} resultado(s)
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setTypeFilter('todas');
                    setChannelFilter('todas');
                    setShippingFilter('todas');
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 lg:grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr]">
            <label className="relative block">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-sm"
                placeholder="Buscar (ex: Soja, Sinop, 26, FOB, 106,00, À vista...)"
              />
            </label>

            <label className="block">
              <span className="sr-only">Tipo</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-sm"
              >
                <option value="todas">Todas</option>
                <option value="venda">Oferta de venda</option>
                <option value="compra">Demanda de compra</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Modalidade</span>
              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-sm"
              >
                <option value="todas">Modalidade</option>
                <option value="mesa">Mesa</option>
                <option value="direta">Direta</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Frete</span>
              <select
                value={shippingFilter}
                onChange={(event) => setShippingFilter(event.target.value as typeof shippingFilter)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-sm"
              >
                <option value="todas">Frete</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-4">
          {loading ? (
            <div className="flex items-center gap-3 rounded-[1.8rem] border border-white/80 bg-white/90 px-5 py-4 text-[13px] text-slate-600 shadow-sm sm:text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando oportunidades...
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-[1.8rem] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700 shadow-sm sm:text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-[13px] text-slate-600 sm:text-sm">
              Nenhuma oportunidade encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[1.8rem] border border-white/80 bg-white/70 p-5 text-[13px] text-slate-600 shadow-sm sm:rounded-[2.1rem] sm:p-6 sm:text-sm">
          <p className="font-bold text-slate-900">Dica de uso</p>
          <p className="mt-2 leading-6">
            Clique em <span className="font-bold text-slate-900">Acessar</span> para ver todos os dados cadastrados e as formas de contato.
          </p>
        </section>
      </main>
    </div>
  );
}
