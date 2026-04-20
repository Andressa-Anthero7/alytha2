import { AlertCircle, ArrowLeft, Building2, LoaderCircle, Mail, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import type { PublicMarketplaceOfferDetailPayload } from '../types';

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

const directPaymentStatusLabel = {
  free: 'Isenta',
  pending: 'Aguardando pagamento',
  paid: 'Pago',
} as const;

const statusLabel = {
  ativa: 'Ativa',
  finalizada: 'Finalizada',
  aguardando_pagamento: 'Aguardando pagamento',
} as const;

const normalizePhoneDigits = (value: string) => value.replace(/\D/g, '');

export default function PublicMarketplaceOfferPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<PublicMarketplaceOfferDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const resolvedId = Number(offerId);
    if (!offerId || !Number.isFinite(resolvedId)) {
      setError('Oportunidade inválida.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadOffer = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch(`/public-marketplace/offers/${resolvedId}`, { signal: controller.signal });
        const data = (await response.json().catch(() => null)) as PublicMarketplaceOfferDetailPayload | { detail?: string } | null;

        if (!response.ok || !data || !('contact' in data)) {
          throw new Error((data && 'detail' in data && data.detail) || 'Não foi possível carregar esta oportunidade.');
        }

        setOffer(data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar esta oportunidade.');
      } finally {
        setLoading(false);
      }
    };

    void loadOffer();

    return () => {
      controller.abort();
    };
  }, [offerId]);

  const whatsappHref = useMemo(() => {
    const digits = normalizePhoneDigits(offer?.contact.phone || '');
    return digits ? `https://wa.me/${digits}` : '';
  }, [offer?.contact.phone]);

  const qualityEntries = useMemo(() => {
    const quality = offer?.quality || {};
    return Object.entries(quality).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  }, [offer?.quality]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_44%,#f6efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {loading ? (
          <div className="mt-6 flex items-center gap-3 rounded-[2rem] border border-white/80 bg-white/90 px-5 py-5 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando oportunidade...
          </div>
        ) : error ? (
          <div className="mt-6 flex items-start gap-3 rounded-[2rem] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : offer ? (
          <>
            <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[2.4rem] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Oportunidade</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                    {typeLabel[offer.type]}
                  </span>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{offer.grain}</h1>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {offer.location} • Safra {offer.crop} • {offer.shipping}
                  </p>
                </div>

                <div className="rounded-[1.8rem] bg-slate-50 px-5 py-4 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Valor</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(offer.price)}</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">{formatQuantity(offer.quantity, offer.unit)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'ID', value: String(offer.id) },
                  { label: 'Modalidade', value: channelLabel[offer.negotiationChannel] },
                  { label: 'Status', value: statusLabel[offer.status] || offer.status },
                  { label: 'Pagamento', value: offer.paymentTerms },
                  { label: 'Pagamento direto', value: directPaymentStatusLabel[offer.directPaymentStatus] || offer.directPaymentStatus },
                  { label: 'Taxa direta', value: formatCurrency(offer.directFee) },
                  { label: 'Comissão da mesa', value: offer.mesaCommission ? formatCurrency(offer.mesaCommission) : '—' },
                  { label: 'Criada em', value: formatDate(offer.createdAt) },
                ].map((item) => (
                  <article key={item.label} className="rounded-[1.7rem] border border-slate-200 bg-white px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{item.value}</p>
                  </article>
                ))}
              </div>

              {qualityEntries.length > 0 ? (
                <div className="mt-6 rounded-[1.8rem] border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Qualidade</p>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {qualityEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{key}</dt>
                        <dd className="text-sm font-bold text-slate-900">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[2.4rem] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Contato</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Responsável</p>
                  <p className="mt-3 text-lg font-black text-slate-950">{offer.contact.name}</p>
                  {offer.contact.company ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      {offer.contact.company}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Canais</p>
                  <div className="mt-4 grid gap-3">
                    <a
                      href={`mailto:${offer.contact.email}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white hover:bg-slate-800"
                    >
                      <Mail className="h-4 w-4" />
                      Enviar e-mail
                    </a>
                    {offer.contact.phone ? (
                      <a
                        href={whatsappHref || `tel:${offer.contact.phone}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-800 hover:bg-emerald-100"
                      >
                        <Phone className="h-4 w-4" />
                        {whatsappHref ? 'WhatsApp' : 'Ligar'}
                      </a>
                    ) : null}
                    {offer.contact.phone ? <p className="text-sm font-semibold text-slate-600">{offer.contact.phone}</p> : null}
                    <p className="text-sm font-semibold text-slate-600">{offer.contact.email}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
