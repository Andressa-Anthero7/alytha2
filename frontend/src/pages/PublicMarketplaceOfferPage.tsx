import { AlertCircle, ArrowLeft, ArrowRight, Building2, LoaderCircle, Lock, Mail, Phone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { apiFetch } from '../lib/api';
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
  deliveryWindow: 'Janela de disponibilidade',
  funrural: 'Tratativa de Funrural',
  notes: 'Especificacoes',
  observations: 'Observacoes',
};

const formatQualityValue = (key: string, value: unknown) => {
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

  const currentUser = getCurrentUser<User>();
  const loggedIn = isAuthenticated() && Boolean(currentUser);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_44%,#f6efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-8 pt-3 sm:px-6 sm:pb-12 sm:pt-4 lg:px-8 lg:pb-14 lg:pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-[2rem] border border-white/80 bg-white/90 px-5 py-5 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando oportunidade...
          </div>
        ) : error ? (
          <div className="mt-4 flex items-start gap-3 rounded-[2rem] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : offer ? (
          <>
            <section className="mt-4 rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[2.4rem] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Oportunidade</p>

              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                    {typeLabel[offer.type]}
                  </span>
                  <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{offer.grain}</h1>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    {formatQuantity(offer.quantity, offer.unit)} • {channelLabel[offer.negotiationChannel]}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Praca', value: offer.location, tone: 'border-emerald-200 bg-emerald-50 text-emerald-950' },
                      { label: 'Safra', value: offer.crop, tone: 'border-amber-200 bg-amber-50 text-amber-950' },
                      { label: 'Frete', value: offer.shipping, tone: 'border-sky-200 bg-sky-50 text-sky-950' },
                    ].map((item) => (
                      <article key={item.label} className={`rounded-[1.5rem] border px-4 py-4 ${item.tone}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{item.label}</p>
                        <p className="mt-2 text-sm font-black sm:text-base">{item.value}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.9rem] border border-emerald-100 bg-[linear-gradient(135deg,#f3fbf5_0%,#ffffff_58%,#fff4e7_100%)] px-5 py-5 text-left text-slate-950 shadow-[0_30px_80px_-55px_rgba(5,150,105,0.45)] sm:min-w-[240px] sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Principal</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(offer.price)}</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">{formatQuantity(offer.quantity, offer.unit)}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{offer.paymentTerms}</p>
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
                  { label: 'Comissao da mesa', value: offer.mesaCommission ? formatCurrency(offer.mesaCommission) : '-' },
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
                    {qualityEntries.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</dt>
                        <dd className="text-sm font-bold text-slate-900">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </section>

            <section className="mt-6 rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[2.4rem] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Contato</p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Responsavel</p>
                  {contactLocked ? (
                    <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900">
                      <Lock className="h-3.5 w-3.5" />
                      Acesso restrito
                    </span>
                  ) : (
                    <p className="mt-3 text-lg font-black text-slate-950">{offer.contact.name}</p>
                  )}
                  {!contactLocked && offer.contact.company ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                      {offer.contact.company}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {contactLocked
                      ? 'A identificacao do responsavel e os canais de contato ficam liberados depois do seu login ou cadastro.'
                      : 'Os canais deste responsavel estao liberados para seguir a conversa comercial.'}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Canais</p>

                  {contactLocked ? (
                    <>
                      <div aria-hidden className="mt-4 hidden gap-3 select-none blur-[5px] opacity-80 sm:grid">
                        <div className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white">
                          <Mail className="h-4 w-4" />
                          Enviar e-mail
                        </div>
                        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-800">
                          <Phone className="h-4 w-4" />
                          WhatsApp
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{maskedPhone}</p>
                        <p className="text-sm font-semibold text-slate-600">{maskedEmail}</p>
                      </div>

                      <div className="mt-4 flex flex-col gap-5 sm:absolute sm:inset-0 sm:mt-0 sm:justify-between sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.96)_30%,rgba(248,250,252,0.98)_100%)] sm:p-5">
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900">
                          <Lock className="h-3.5 w-3.5" />
                          Acesso restrito
                        </span>

                        <div className="space-y-3">
                          <p className="text-xl font-black tracking-tight text-slate-950">Cadastre-se para liberar o contato completo.</p>
                          <p className="max-w-lg text-sm leading-7 text-slate-600">
                            Se voce ja tem cadastro, faca login para ver e-mail, telefone e WhatsApp do responsavel desta oportunidade.
                          </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Link
                            to="/cadastro"
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-white hover:bg-emerald-700"
                          >
                            Cadastrar
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          <Link
                            to="/login"
                            state={{ from: location.pathname }}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 hover:bg-slate-50"
                          >
                            Ja tenho cadastro
                          </Link>
                        </div>
                      </div>
                    </>
                  ) : (
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
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
