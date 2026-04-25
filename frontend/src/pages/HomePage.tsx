import { AlertCircle, ChevronDown, ChevronUp, LoaderCircle, Menu, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import Navbar, { OPEN_MOBILE_NAV_EVENT } from '../components/Navbar';
import { OfferShareButton } from '../components/OfferShareButton';
import { apiFetch } from '../lib/api';
import { useDocumentMetadata } from '../shared/metadata';
import { buildMarketplaceDocumentMetadata } from '../shared/share';
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
        <p className="text-right text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{formatDate(offer.createdAt)}</p>
      </div>

      <div className="mt-4 grid gap-2.5 text-[13px] text-slate-600 sm:text-sm">
        <div className="flex items-center justify-between gap-4">
          <span>Localidade</span>
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
        <div className="flex flex-wrap items-center gap-2">
          <OfferShareButton offer={offer} />
          <Link
            to={`/oportunidades/${offer.id}`}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white ${actionTone}`}
          >
            Acessar
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const marketplaceMetadata = useMemo(() => buildMarketplaceDocumentMetadata(), []);
  const mobileNavLabels = ['Comprar/Vender'] as const;
  const [payload, setPayload] = useState<PublicMarketplaceOffersListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileNavLabelIndex, setMobileNavLabelIndex] = useState(0);
  const [grainFilter, setGrainFilter] = useState<'todas' | 'Soja' | 'Milho' | 'Sorgo'>('todas');
  const [typeFilter, setTypeFilter] = useState<'todas' | 'venda' | 'compra'>('todas');
  const [channelFilter, setChannelFilter] = useState<'todas' | 'mesa' | 'direta'>('todas');
  const [shippingFilter, setShippingFilter] = useState<'todas' | 'FOB' | 'CIF'>('todas');

  useDocumentMetadata(marketplaceMetadata);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(query.trim())
      || grainFilter !== 'todas'
      || typeFilter !== 'todas'
      || channelFilter !== 'todas'
      || shippingFilter !== 'todas',
    [channelFilter, grainFilter, query, shippingFilter, typeFilter],
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
        if (grainFilter !== 'todas') {
          params.set('grain', grainFilter);
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
  }, [channelFilter, grainFilter, query, shippingFilter, typeFilter]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMobileNavLabelIndex((currentValue) => (currentValue + 1) % mobileNavLabels.length);
    }, 2400);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mobileNavLabels.length]);

  const items = payload?.items ?? [];
  const mobileNavLabel = mobileNavLabels[mobileNavLabelIndex];

  const openMobileNav = () => {
    window.dispatchEvent(new Event(OPEN_MOBILE_NAV_EVENT));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ef_0%,#ffffff_34%,#f6efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <section className="rounded-[1.6rem] border border-white/80 bg-white/92 p-3.5 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[1.9rem] sm:p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 sm:text-[11px]">Marketplace</p>
              <h1 className="mt-1 text-[1.55rem] font-black tracking-tight text-slate-950 sm:text-[1.75rem] lg:text-[1.9rem]">Ofertas e Demandas</h1>
              <p className="mt-0.5 max-w-3xl text-[13px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                Busque por qualquer campo da oferta/demanda (grão, praça, safra, frete, modalidade, pagamento e outros).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((currentValue) => !currentValue)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="marketplace-mobile-filters"
                className="flex w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 sm:hidden"
              >
                Busca e filtros
                {mobileFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-xs">
                {payload?.count ?? 0} resultado(s)
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setGrainFilter('todas');
                    setTypeFilter('todas');
                    setChannelFilter('todas');
                    setShippingFilter('todas');
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 sm:text-xs"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          <div
            id="marketplace-mobile-filters"
            className={`mt-2.5 gap-2 lg:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr] ${mobileFiltersOpen ? 'grid' : 'hidden'} sm:grid`}
          >
            <label className="relative block">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white pl-9 pr-3.5 text-[10px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
                placeholder="Buscar (ex: Soja, Sinop, 26, FOB, 106,00, À vista...)"
              />
            </label>

            <label className="block">
              <span className="sr-only">Grão</span>
              <select
                value={grainFilter}
                onChange={(event) => setGrainFilter(event.target.value as typeof grainFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
              >
                <option value="todas">Grão</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Sorgo">Sorgo</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Tipo</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
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
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
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
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
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
            Clique em <span className="font-bold text-slate-900">Acessar</span> para ver os detalhes da oportunidade. Os canais de contato
            ficam liberados após login ou cadastro.
          </p>
        </section>
      </main>

      <button
        type="button"
        onClick={openMobileNav}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/88 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md transition-transform hover:-translate-y-0.5 sm:hidden"
        aria-label="Abrir menu com atalhos de comprar e vender"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Menu className="h-4 w-4" />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{mobileNavLabel}</span>
        </span>
      </button>
    </div>
  );
}
