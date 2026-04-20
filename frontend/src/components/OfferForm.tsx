import { AlertCircle, CheckCircle2, Copy, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import type { OfferPixData, OfferRegistration } from '../types';

type OfferType = 'venda' | 'compra';
type OfferChannel = 'mesa' | 'direta';

type OfferFormProps = {
  offerType: OfferType;
  title: string;
  subtitle: string;
  mode?: 'authenticated' | 'broker-link';
  brokerToken?: string;
  brokerName?: string;
};

type OfferFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  grain: string;
  quantity: string;
  unit: string;
  price: string;
  location: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  negotiationChannel: OfferChannel;
  mesaCommission: string;
  deliveryWindow: string;
  funrural: string;
  qualityNotes: string;
  paymentTerms: string;
  observations: string;
};

type OfferSubmissionResponse = {
  id: number;
  status: 'ativa' | 'finalizada' | 'aguardando_pagamento';
  registration?: OfferRegistration | null;
};

const isOfferSubmissionResponse = (payload: unknown): payload is OfferSubmissionResponse =>
  Boolean(payload && typeof payload === 'object' && 'id' in payload && typeof (payload as { id?: unknown }).id === 'number');

const mesaCommissionOptions = ['0.50', '1.00', '1.50', '2.00', '2.50', '3.00', '3.50', '4.00', '4.50', '5.00'] as const;

const initialState: OfferFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  grain: 'Soja',
  quantity: '',
  unit: 'Sacas',
  price: '',
  location: '',
  crop: '',
  shipping: 'FOB',
  negotiationChannel: 'mesa',
  mesaCommission: '0.50',
  deliveryWindow: '',
  funrural: 'A definir na negociacao',
  qualityNotes: '',
  paymentTerms: '',
  observations: '',
};

const formCopy = {
  venda: {
    sectionLabel: 'Oferta Alytha',
    priceLabel: 'Base de preco / referencia por saca',
    locationLabel: 'Praca de origem / localidade',
    windowLabel: 'Janela de disponibilidade',
    qualityLabel: 'Padrao de qualidade / especificacoes',
    paymentLabel: 'Condicoes comerciais e pagamento',
    observationsLabel: 'Observacoes comerciais',
    qualityPlaceholder: 'Informe padrao, umidade, impurezas, avariados, bonificacoes ou descontos aplicaveis ao lote.',
    paymentPlaceholder: 'Ex.: pagamento a vista, prazo de 7 dias, contra retirada, faturamento conforme cadastro aprovado.',
    observationsPlaceholder: 'Registre detalhes relevantes para a mesa, como carregamento, flexibilidade de volume e estrategia comercial.',
    submitLabel: 'Salvar oferta de venda',
    publicSubmitLabel: 'Enviar oferta ao corretor',
  },
  compra: {
    sectionLabel: 'Demanda Alytha',
    priceLabel: 'Faixa de preco de referencia',
    locationLabel: 'Praca de entrega / retirada',
    windowLabel: 'Janela de recebimento',
    qualityLabel: 'Padrao de qualidade / exigencias',
    paymentLabel: 'Condicoes comerciais e pagamento',
    observationsLabel: 'Observacoes da demanda',
    qualityPlaceholder: 'Descreva padrao desejado, limites de umidade, impurezas, avariados e demais requisitos da compra.',
    paymentPlaceholder: 'Ex.: pagamento a vista, 7 dias, contra entrega, aprovacao cadastral ou condicao bancaria especifica.',
    observationsPlaceholder: 'Inclua detalhes operacionais ou comerciais importantes para a mesa estruturar a melhor originacao.',
    submitLabel: 'Salvar demanda (compra)',
    publicSubmitLabel: 'Enviar demanda ao corretor',
  },
} as const;

const channelCards = [
  {
    id: 'mesa',
    title: 'Operar com a mesa Alytha',
    description: 'A negociacao segue com acompanhamento comercial da mesa, e a comissao por saca fica registrada no cadastro.',
  },
  {
    id: 'direta',
    title: 'Publicar como oferta direta',
    description: 'A oportunidade entra sem intermediacao da mesa. As 4 primeiras diretas do mes ficam sem taxa; da 5a em diante, ha cobranca de R$ 100,00.',
  },
] as const;

const publicChannelCards = [
  {
    id: 'mesa',
    title: 'Conduzir com a mesa Alytha',
    description: 'A oportunidade segue com apoio comercial da mesa e atendimento do corretor responsavel por este link.',
  },
  {
    id: 'direta',
    title: 'Publicar sem intermediacao da mesa',
    description: 'O cadastro continua vinculado ao corretor deste link, mas entra sem atuacao comercial da mesa Alytha.',
  },
] as const;

const funruralOptions = ['Incluso no preco', 'Destacado no faturamento', 'A definir na negociacao'] as const;

const getErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return 'Nao foi possivel salvar o cadastro.';
  }

  if ('detail' in payload && typeof payload.detail === 'string') {
    return payload.detail;
  }

  const values = Object.values(payload as Record<string, unknown>);
  const firstValue = values[0];
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
    return firstValue[0];
  }

  return 'Nao foi possivel salvar o cadastro.';
};

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OfferForm({
  offerType,
  title,
  subtitle,
  mode = 'authenticated',
  brokerToken,
  brokerName,
}: OfferFormProps) {
  const [form, setForm] = useState<OfferFormState>(initialState);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<OfferPixData | null>(null);
  const [registration, setRegistration] = useState<OfferRegistration | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');

  const copy = formCopy[offerType];
  const isPublicLead = mode === 'broker-link';
  const brokerDisplayLabel = brokerName || 'corretor responsavel';
  const visibleChannelCards = isPublicLead ? publicChannelCards : channelCards;
  const shouldRegisterCommission = form.negotiationChannel === 'mesa' || isPublicLead;

  const updateField = <T extends keyof OfferFormState>(name: T, value: OfferFormState[T]) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCopy = async (value: string, feedback: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(feedback);
      window.setTimeout(() => setCopyFeedback(''), 2500);
    } catch {
      setCopyFeedback('Nao foi possivel copiar neste momento.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setPixData(null);
    setRegistration(null);
    setCopyFeedback('');

    const endpoint = isPublicLead && brokerToken ? `/broker-links/${brokerToken}/offers` : '/offers';
    const payload = {
      ...(isPublicLead
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone,
            company: form.company,
          }
        : {}),
      type: offerType,
      grain: form.grain,
      quantity: Number(form.quantity),
      unit: form.unit,
      price: Number(form.price),
      location: form.location,
      crop: form.crop,
      shipping: form.shipping,
      negotiationChannel: form.negotiationChannel,
      mesaCommission: shouldRegisterCommission ? Number(form.mesaCommission) : null,
      quality: {
        deliveryWindow: form.deliveryWindow,
        funrural: offerType === 'venda' ? form.funrural : undefined,
        notes: form.qualityNotes,
        observations: form.observations,
      },
      paymentTerms: form.paymentTerms,
    };

    try {
      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as OfferSubmissionResponse | Record<string, unknown> | null;
      if (!response.ok || !isOfferSubmissionResponse(responsePayload)) {
        throw new Error(getErrorMessage(responsePayload));
      }

      const registrationPayload = responsePayload.registration || null;
      setRegistration(registrationPayload);
      setPixData(registrationPayload?.pix || null);
      setForm((previous) => ({
        ...initialState,
        name: isPublicLead ? previous.name : '',
        email: isPublicLead ? previous.email : '',
        phone: isPublicLead ? previous.phone : '',
        company: isPublicLead ? previous.company : '',
      }));

      if (responsePayload.status === 'aguardando_pagamento' && registrationPayload?.pix) {
        setMessage('Cadastro recebido com sucesso. A oportunidade ficara aguardando a quitacao da taxa via PIX para liberacao.');
      } else {
        setMessage(
          isPublicLead
            ? `Cadastro enviado com sucesso para ${brokerDisplayLabel}.`
            : offerType === 'venda'
              ? 'Oferta de venda cadastrada com sucesso.'
              : 'Demanda de compra cadastrada com sucesso.',
        );
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.24fr_0.76fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/80 bg-white/92 p-5 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur sm:p-8"
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">
            {isPublicLead ? 'Canal do corretor' : copy.sectionLabel}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{subtitle}</p>
        </div>

        {isPublicLead && (
          <div className="mt-8 rounded-[1.8rem] border border-sky-100 bg-sky-50/70 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-sky-950">Atendimento vinculado a {brokerDisplayLabel}</p>
                <p className="mt-2 text-sm leading-7 text-sky-900/80">
                  Este envio entra direto na base privada do corretor. Voce nao precisa criar login agora para compartilhar a oportunidade.
                </p>
              </div>
            </div>
          </div>
        )}

        {isPublicLead && (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Seu nome</span>
              <input
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Nome completo"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">E-mail</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                placeholder="voce@empresa.com.br"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Telefone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="DDD + numero"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Empresa</span>
              <input
                value={form.company}
                onChange={(event) => updateField('company', event.target.value)}
                placeholder="Empresa / fazenda / unidade"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>
          </div>
        )}

        <div className="mt-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {isPublicLead ? 'Como deseja conduzir essa oportunidade' : 'Como deseja negociar'}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleChannelCards.map((item) => {
              const active = form.negotiationChannel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => updateField('negotiationChannel', item.id as OfferChannel)}
                  className={`rounded-[1.6rem] border p-4 text-left transition-colors ${
                    active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </button>
              );
            })}
          </div>

          {form.negotiationChannel === 'mesa' ? (
            <div className="mt-4 rounded-[1.6rem] border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-sm font-black text-emerald-950">
                {isPublicLead ? 'Atendimento com apoio da mesa Alytha.' : 'Operacao com a mesa inclui comissao comercial.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900/85">
                {isPublicLead
                  ? 'Sua oportunidade sera registrada para atendimento do corretor e seguira com a politica comercial da mesa Alytha.'
                  : 'A comissao por saca fica registrada no cadastro desta oportunidade e sera usada no match quando a mesa conduzir a operacao.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.6rem] border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-sm font-black text-amber-950">
                {isPublicLead ? 'Publicacao direta vinculada ao corretor.' : 'Publicacao direta com politica comercial da plataforma.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900/85">
                {isPublicLead
                  ? `O cadastro continua reservado para ${brokerDisplayLabel}. As 4 primeiras publicacoes diretas do mes ficam sem taxa; a partir da 5a, o sistema gera PIX de ${formatCurrency(100)} para liberar a oportunidade.`
                  : `As 4 primeiras publicacoes diretas do mes ficam sem taxa. A partir da 5a, o cadastro gera PIX de ${formatCurrency(100)} para liberacao da oportunidade.`}
              </p>
            </div>
          )}

          {shouldRegisterCommission ? (
            <div
              className={`mt-4 rounded-[1.6rem] p-4 ${
                isPublicLead ? 'border border-sky-100 bg-sky-50/70' : 'border border-emerald-100 bg-emerald-50/70'
              }`}
            >
              <p className={`text-sm font-black ${isPublicLead ? 'text-sky-950' : 'text-emerald-950'}`}>
                {isPublicLead ? 'Comissao registrada no cadastro.' : 'Comissao da mesa.'}
              </p>
              <p className={`mt-2 text-sm leading-6 ${isPublicLead ? 'text-sky-900/85' : 'text-emerald-900/85'}`}>
                {isPublicLead
                  ? 'Esse valor fica salvo no cadastro e sera usado no match desta oportunidade por ter entrado por link exclusivo.'
                  : 'Selecione abaixo a comissao por saca que deve ficar vinculada ao cadastro desta oportunidade.'}
              </p>
              <label className="mt-4 block space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.2em] ${isPublicLead ? 'text-sky-800' : 'text-emerald-800'}`}>
                  {isPublicLead ? 'Comissao do cadastro' : 'Comissao da mesa'}
                </span>
                <select
                  value={form.mesaCommission}
                  onChange={(event) => updateField('mesaCommission', event.target.value)}
                  className={`w-full rounded-2xl bg-white px-4 py-3 outline-none ${
                    isPublicLead ? 'border border-sky-200 focus:border-sky-500' : 'border border-emerald-200 focus:border-emerald-500'
                  }`}
                >
                  {mesaCommissionOptions.map((value) => (
                    <option key={value} value={value}>
                      R$ {value.replace('.', ',')} / saca
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Produto</span>
            <select
              value={form.grain}
              onChange={(event) => updateField('grain', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="Soja">Soja</option>
              <option value="Milho">Milho</option>
              <option value="Sorgo">Sorgo</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Safra</span>
            <input
              required
              value={form.crop}
              onChange={(event) => updateField('crop', event.target.value)}
              placeholder="Ex.: 2024/25"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Quantidade</span>
            <input
              required
              min="1"
              step="0.01"
              type="number"
              value={form.quantity}
              onChange={(event) => updateField('quantity', event.target.value)}
              placeholder="Ex.: 1500"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Unidade</span>
            <select
              value={form.unit}
              onChange={(event) => updateField('unit', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="Sacas">Sacas</option>
              <option value="Toneladas">Toneladas</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.priceLabel}</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="Ex.: 132.50"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.locationLabel}</span>
            <input
              required
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Ex.: Rondonopolis - MT"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Condicao FOB / CIF</span>
            <select
              value={form.shipping}
              onChange={(event) => updateField('shipping', event.target.value as 'FOB' | 'CIF')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.windowLabel}</span>
            <input
              value={form.deliveryWindow}
              onChange={(event) => updateField('deliveryWindow', event.target.value)}
              placeholder="Ex.: abril a maio / embarque imediato / retirada programada"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          {offerType === 'venda' ? (
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tratativa de Funrural</span>
              <select
                value={form.funrural}
                onChange={(event) => updateField('funrural', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              >
                {funruralOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.qualityLabel}</span>
            <textarea
              value={form.qualityNotes}
              onChange={(event) => updateField('qualityNotes', event.target.value)}
              placeholder={copy.qualityPlaceholder}
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.paymentLabel}</span>
            <textarea
              required
              value={form.paymentTerms}
              onChange={(event) => updateField('paymentTerms', event.target.value)}
              placeholder={copy.paymentPlaceholder}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.observationsLabel}</span>
            <textarea
              value={form.observations}
              onChange={(event) => updateField('observations', event.target.value)}
              placeholder={copy.observationsPlaceholder}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>

        {message && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pixData && (
          <div className="mt-6 rounded-[1.8rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">PIX para liberar o cadastro</p>
                <h2 className="mt-3 text-2xl font-black text-amber-950">Taxa de oferta direta</h2>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy(pixData.copyMessage, 'Dados do PIX copiados.')}
                className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-amber-800"
              >
                <Copy className="h-4 w-4" />
                Copiar PIX
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Favorecido</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{pixData.beneficiary}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Valor</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{pixData.formattedAmount}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Chave PIX CNPJ</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{pixData.pixKey}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Referencia</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{pixData.reference}</p>
              </div>
            </div>
          </div>
        )}

        {copyFeedback && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{copyFeedback}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isPublicLead ? copy.publicSubmitLabel : copy.submitLabel}
        </button>
      </form>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-5 text-white shadow-[0_45px_120px_-60px_rgba(5,46,43,0.8)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200">Regras do cadastro</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-emerald-50">
            {isPublicLead ? (
              <>
                <p>O envio feito por este link fica reservado para o atendimento de {brokerDisplayLabel} dentro da Alytha.</p>
                <p>A comissao por saca tambem fica registrada neste cadastro e, no match, segue o valor definido aqui para o corretor.</p>
                <p>Se voce optar pela publicacao direta, as 4 primeiras do mes nao geram taxa. A partir da 5a, o sistema apresenta a cobranca de {formatCurrency(100)}.</p>
                <p>Quando houver cobranca, os dados do PIX aparecem logo apos o envio do cadastro.</p>
              </>
            ) : (
              <>
                <p>Operacoes com a mesa exigem definicao de comissao entre R$ 0,50 e R$ 5,00 por saca.</p>
                <p>Publicacoes diretas contam com 4 lancamentos sem taxa por mes. A partir da 5a, a plataforma gera cobranca de {formatCurrency(100)}.</p>
                <p>Quando houver cobranca, o retorno do cadastro apresenta os dados do PIX em nome de Alytha Intermediacoes de Negocios Ltda.</p>
                {offerType === 'venda' ? <p>Na venda, a tratativa de Funrural fica registrada no cadastro para dar mais clareza comercial a mesa e a contraparte.</p> : null}
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.55)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Orientacoes</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            {isPublicLead ? (
              <>
                <p>Preencha produto, praca, volume, safra e condicoes comerciais com clareza para facilitar a avaliacao do corretor.</p>
                <p>Use os campos de qualidade, pagamento e observacoes para registrar tudo o que pode acelerar o retorno comercial.</p>
                <p>Apos o envio, o corretor recebe a oportunidade na base privada dele e pode seguir o atendimento com voce.</p>
              </>
            ) : (
              <>
                <p>Preencha produto, praca, volume, safra e condicoes comerciais com clareza para acelerar a leitura da mesa.</p>
                <p>Use os campos de qualidade e observacoes para registrar especificacoes do lote, janela e pontos sensiveis da operacao.</p>
                <p>Quando o cadastro vier de link exclusivo, a oportunidade fica restrita a base privada do corretor proprietario.</p>
              </>
            )}
          </div>

          {registration?.channel === 'direta' ? (
            <div className="mt-5 rounded-[1.6rem] border border-amber-100 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              <p className="font-black">Resumo da oferta direta</p>
              <p className="mt-2">Cadastros diretos usados neste mes: {registration.directOffersUsedThisMonth ?? '-'}</p>
              <p className="mt-1">Restantes sem taxa: {registration.freeDirectOffersRemaining ?? '-'}</p>
            </div>
          ) : null}

          {registration?.mesaCommission ? (
            <div className="mt-5 rounded-[1.6rem] border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
              <p className="font-black">Comissao registrada</p>
              <p className="mt-2">
                {formatCurrency(registration.mesaCommission)} por saca{' '}
                {registration.exclusiveBrokerId
                  ? 'vinculada ao cadastro deste corretor e aplicada no match.'
                  : 'para operacao com a mesa Alytha.'}
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
