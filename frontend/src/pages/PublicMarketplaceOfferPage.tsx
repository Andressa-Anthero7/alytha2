import { AlertCircle, ArrowLeft, ArrowRight, Building2, LoaderCircle, Lock, Mail, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { OfferShareButton } from '../components/OfferShareButton';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { useDocumentMetadata } from '../shared/metadata';
import { buildAbsolutePublicUrl, buildOfferDocumentMetadata } from '../shared/share';
import type { PublicMarketplaceOfferDetailPayload, User } from '../types';

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
const percentQualityKeys = new Set(['moisture', 'impurity', 'broken', 'damaged', 'ardidos']);
const qualityFieldLabels: Record<string, string> = {
  moisture: 'Umidade (%)',
  impurity: 'Impureza (%)',
  broken: 'Quebrados (%)',
  damaged: 'Avariados (%)',
  ardidos: 'Ardidos (%)',
  ph: 'PH (milho)',
  protein: 'Proteina (soja)',
  standard: 'Padrao',
  nonGmo: 'Non GMO',
  deliveryWindow: 'Janela de disponibilidade',
  funrural: 'Tratativa de Funrural',
  notes: 'Especificacoes',
  observations: 'Observacoes',
};

const formatQualityValue = (key: string, value: unknown) => {
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Nao';
  }
  if (typeof value === 'number' && percentQualityKeys.has(key)) {
    return `${value}%`;
  }
  if (key === 'standard') {
    if (value === 'exportacao') {
      return 'Exportacao';
    }
    if (value === 'mercado_interno') {
      return 'Mercado interno';
    }
  }
  return String(value);
};

const maskEmailDisplay = (value: string) => {
  const email = String(value || '').trim();
  if (!email) return 'contato@********';
  if (email.includes('*')) return email;

  const [localPart, domainPart = ''] = email.split('@');
  const visibleLocal = localPart.slice(0, 2);
  const maskedLocal = `${visibleLocal}${'*'.repeat(Math.max(localPart.length - visibleLocal.length, 4))}`;

  if (!domainPart) {
    return maskedLocal;
  }

  const [domainName, domainSuffix = 'com.br'] = domainPart.split('.');
  const visibleDomain = domainName.slice(0, 2);
  const maskedDomain = `${visibleDomain}${'*'.repeat(Math.max(domainName.length - visibleDomain.length, 4))}`;
  return `${maskedLocal}@${maskedDomain}.${domainSuffix}`;
};

const maskPhoneDisplay = (value: string) => {
  const phone = String(value || '').trim();
  if (!phone) return '(**) *****-****';
  if (phone.includes('*')) return phone;
  const digits = normalizePhoneDigits(phone);
  return digits ? '(**) *****-****' : phone;
};

export default function PublicMarketplaceOfferPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const location = useLocation();
  const [offer, setOffer] = useState<PublicMarketplaceOfferDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const documentMetadata = useMemo(
    () =>
      offer
        ? buildOfferDocumentMetadata(offer)
        : {
            title: 'Oportunidade | Alytha',
            description: 'Consulte os detalhes da oportunidade no marketplace publico da Alytha.',
            canonicalUrl: buildAbsolutePublicUrl(offerId ? `/oportunidades/${offerId}` : '/'),
            imageUrl: buildAbsolutePublicUrl('/logo.png'),
            type: 'article' as const,
          },
    [offer, offerId],
  );

  const currentUser = getCurrentUser<User>();
  const loggedIn = isAuthenticated() && Boolean(currentUser);

  useDocumentMetadata(documentMetadata);

  useEffect(() => {
    const resolvedId = Number(offerId);
    if (!offerId || !Number.isFinite(resolvedId)) {
      setError('Oportunidade invalida.');
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
          throw new Error((data && 'detail' in data && data.detail) || 'Nao foi possivel carregar esta oportunidade.');
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

  const contactLocked = offer?.contact.locked ?? !loggedIn;

  const whatsappHref = useMemo(() => {
    if (!offer?.contact.phone || contactLocked) return '';
    const digits = normalizePhoneDigits(offer.contact.phone);
    return digits ? `https://wa.me/${digits}` : '';
  }, [contactLocked, offer?.contact.phone]);

  const maskedEmail = useMemo(() => maskEmailDisplay(offer?.contact.email || ''), [offer?.contact.email]);
  const maskedPhone = useMemo(() => maskPhoneDisplay(offer?.contact.phone || ''), [offer?.contact.phone]);

  const qualityEntries = useMemo(() => {
    const quality = offer?.quality || {};
    return Object.entries(quality)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => ({
        key,
        label: qualityFieldLabels[key] || key,
        value: formatQualityValue(key, value),
      }));
  }, [offer?.quality]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-5 pt-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>

        {loading ? (
          <div className="mt-3 flex items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando oportunidade...
          </div>
        ) : error ? (
          <div className="mt-3 flex items-start gap-3 rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : offer ? (
          <section className="mt-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
                    {typeLabel[offer.type]}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                    {statusLabel[offer.status] || offer.status}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">ID {offer.id}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{formatDate(offer.createdAt)}</span>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{offer.grain}</h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {formatQuantity(offer.quantity, offer.unit)} - {channelLabel[offer.negotiationChannel]}
                </p>
              </div>

              <div className="flex flex-col gap-2 lg:min-w-[520px]">
                <div className="flex justify-start lg:justify-end">
                  <OfferShareButton offer={offer} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Valor', value: formatCurrency(offer.price), tone: 'text-emerald-800' },
                    { label: 'Quantidade', value: formatQuantity(offer.quantity, offer.unit), tone: 'text-slate-950' },
                    { label: 'Pagamento', value: offer.paymentTerms, tone: 'text-slate-950' },
                  ].map((item) => (
                    <article key={item.label} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                      <p className={`mt-1 text-sm font-black ${item.tone}`}>{item.value}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Localidade', value: offer.location },
                    { label: 'Safra', value: offer.crop },
                    { label: 'Frete', value: offer.shipping },
                    { label: 'Modalidade', value: channelLabel[offer.negotiationChannel] },
                    { label: 'Pagamento direto', value: directPaymentStatusLabel[offer.directPaymentStatus] || offer.directPaymentStatus },
                    { label: 'Taxa direta', value: formatCurrency(offer.directFee) },
                  ].map((item) => (
                    <article key={item.label} className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
                    </article>
                  ))}
                </div>

                {qualityEntries.length > 0 ? (
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Qualidade</p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {qualityEntries.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 rounded-[0.8rem] border border-slate-200 bg-white px-3 py-2">
                          <dt className="text-[11px] font-bold text-slate-500">{item.label}</dt>
                          <dd className="text-sm font-black text-slate-900">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>

              <aside className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contato</p>
                  {contactLocked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
                      <Lock className="h-3.5 w-3.5" />
                      Restrito
                    </span>
                  ) : null}
                </div>

                {contactLocked ? (
                  <>
                    <p className="mt-3 text-sm font-black text-slate-950">Cadastre-se ou entre para liberar o contato.</p>
                    <div className="mt-3 grid gap-2 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                      <p>{maskedPhone}</p>
                      <p>{maskedEmail}</p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Link
                        to="/cadastro"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-emerald-700"
                      >
                        Cadastrar
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/login"
                        state={{ from: location.pathname }}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-100"
                      >
                        Ja tenho cadastro
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-lg font-black text-slate-950">{offer.contact.name}</p>
                    {offer.contact.company ? (
                      <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Building2 className="h-4 w-4 text-emerald-700" />
                        {offer.contact.company}
                      </p>
                    ) : null}
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                      {offer.contact.phone ? <p>{offer.contact.phone}</p> : null}
                      <p>{offer.contact.email}</p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <a
                        href={`mailto:${offer.contact.email}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800"
                      >
                        <Mail className="h-4 w-4" />
                        E-mail
                      </a>
                      {offer.contact.phone ? (
                        <a
                          href={whatsappHref || `tel:${offer.contact.phone}`}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800 hover:bg-emerald-100"
                        >
                          <Phone className="h-4 w-4" />
                          {whatsappHref ? 'WhatsApp' : 'Ligar'}
                        </a>
                      ) : null}
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
