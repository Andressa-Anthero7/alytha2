import { AlertCircle, CheckCircle2, Copy, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiFetch } from '../lib/api';
import { LEGAL_DOCUMENT_VERSION } from '../shared/legal';
import type { OfferPixData, OfferRegistration } from '../types';
import LegalAgreementCheckbox from './LegalAgreementCheckbox';

type OfferType = 'venda' | 'compra';
type OfferChannel = 'mesa' | 'direta';
type GrainStandard = 'exportacao' | 'mercado_interno';

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
  locationState: string;
  locationCity: string;
  locationComplement: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  negotiationChannel: OfferChannel;
  mesaCommission: string;
  nonGmo: boolean;
  damagedSoybean: boolean;
  moisture: string;
  impurity: string;
  damaged: string;
  ardidos: string;
  ph: string;
  protein: string;
  grainStandard: '' | GrainStandard;
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

type IbgeMunicipality = {
  id: number;
  nome: string;
};

const isOfferSubmissionResponse = (payload: unknown): payload is OfferSubmissionResponse =>
  Boolean(payload && typeof payload === 'object' && 'id' in payload && typeof (payload as { id?: unknown }).id === 'number');

const mesaCommissionOptions = ['0.50', '1.00', '1.50', '2.00', '2.50', '3.00', '3.50', '4.00', '4.50', '5.00'] as const;
const grainOptions = ['Soja', 'Milho', 'Sorgo'] as const;
const shippingOptions = [
  {
    value: 'FOB',
    title: 'FOB',
    description: 'Retirada na origem ou ponto indicado pelo vendedor.',
  },
  {
    value: 'CIF',
    title: 'CIF',
    description: 'Entrega no destino ou base combinada com o comprador.',
  },
] as const;
const paymentTermSuggestions = ['A vista', '7 dias', '15 dias', '30 dias', 'Contra entrega'] as const;
const ibgeLocalitiesApiBaseUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const brazilStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapa' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceara' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espirito Santo' },
  { code: 'GO', name: 'Goias' },
  { code: 'MA', name: 'Maranhao' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Para' },
  { code: 'PB', name: 'Paraiba' },
  { code: 'PR', name: 'Parana' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piaui' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondonia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'Sao Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
] as const;

const cropSuggestions = (() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 3 }, (_, index) => {
    const startYear = currentYear - 1 + index;
    return `${startYear}/${String(startYear + 1).slice(-2)}`;
  });
})();

const initialState: OfferFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  grain: 'Soja',
  quantity: '',
  unit: 'Sacas',
  price: '',
  locationState: '',
  locationCity: '',
  locationComplement: '',
  crop: '',
  shipping: 'FOB',
  negotiationChannel: 'mesa',
  mesaCommission: '1.00',
  nonGmo: false,
  damagedSoybean: false,
  moisture: '',
  impurity: '',
  damaged: '',
  ardidos: '',
  ph: '',
  protein: '',
  grainStandard: '',
  deliveryWindow: '',
  funrural: 'A definir na negociação',
  qualityNotes: '',
  paymentTerms: '',
  observations: '',
};

const formCopy = {
  venda: {
    sectionLabel: 'Oferta Alytha',
    priceLabel: 'Base de preço / referência por saca',
    locationLabel: 'Praça de origem / localidade',
    windowLabel: 'Janela de disponibilidade',
    qualityLabel: 'Complementos de qualidade / especificações',
    paymentLabel: 'Condições comerciais e pagamento',
    observationsLabel: 'Observações comerciais',
    qualityPlaceholder: 'Use este campo para registrar bonificações, descontos, laudos ou detalhes adicionais do lote.',
    paymentPlaceholder: 'Ex.: pagamento à vista, prazo de 7 dias, contra retirada, faturamento conforme cadastro aprovado.',
    observationsPlaceholder: 'Registre detalhes relevantes para a mesa, como carregamento, flexibilidade de volume e estratégia comercial.',
    submitLabel: 'Salvar oferta de venda',
    publicSubmitLabel: 'Enviar oferta ao corretor',
  },
  compra: {
    sectionLabel: 'Demanda Alytha',
    priceLabel: 'Faixa de preço de referência',
    locationLabel: 'Praça de entrega / retirada',
    windowLabel: 'Janela de recebimento',
    qualityLabel: 'Padrão de qualidade / exigências',
    paymentLabel: 'Condições comerciais e pagamento',
    observationsLabel: 'Observações da demanda',
    qualityPlaceholder: 'Descreva o padrão desejado, limites de umidade, impurezas, avariados e demais requisitos da compra.',
    paymentPlaceholder: 'Ex.: pagamento à vista, 7 dias, contra entrega, aprovação cadastral ou condição bancária específica.',
    observationsPlaceholder: 'Inclua detalhes operacionais ou comerciais importantes para a mesa estruturar a melhor originação.',
    submitLabel: 'Salvar demanda (compra)',
    publicSubmitLabel: 'Enviar demanda ao corretor',
  },
} as const;

const channelCards = [
  {
    id: 'mesa',
    title: 'Operar com a mesa Alytha',
    description: 'A negociação segue com acompanhamento comercial da mesa, e a comissão por saca fica registrada no cadastro.',
  },
  {
    id: 'direta',
    title: 'Publicar como oferta direta',
    description: 'A oportunidade entra sem intermediação da mesa. As 4 primeiras diretas do mês ficam sem taxa; da 5ª em diante, há cobrança de R$ 100,00.',
  },
] as const;

const publicChannelCards = [
  {
    id: 'mesa',
    title: 'Conduzir com a mesa Alytha',
    description: 'A oportunidade segue com apoio comercial da mesa e atendimento do corretor responsável por este link.',
  },
  {
    id: 'direta',
    title: 'Publicar sem intermediação da mesa',
    description: 'O cadastro continua vinculado ao corretor deste link, mas entra sem atuação comercial da mesa Alytha.',
  },
] as const;

const funruralOptions = ['Incluso no preço', 'Destacado no faturamento', 'A definir na negociação'] as const;
const grainStandardOptions = [
  { value: 'exportacao', label: 'Exportação' },
  { value: 'mercado_interno', label: 'Mercado interno' },
] as const;
const grainStandardLabelMap: Record<GrainStandard, string> = {
  exportacao: 'Exportação',
  mercado_interno: 'Mercado interno',
};

const getErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return 'Não foi possível salvar o cadastro.';
  }

  if ('detail' in payload && typeof payload.detail === 'string') {
    return payload.detail;
  }

  const values = Object.values(payload as Record<string, unknown>);
  const firstValue = values[0];
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
    return firstValue[0];
  }

  return 'Não foi possível salvar o cadastro.';
};

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQuantityPreview = (value: string, unit: string) => {
  const parsedValue = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 'Ainda nao informado';
  }

  return `${parsedValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unit}`;
};

const formatCurrencyPreview = (value: string) => {
  const parsedValue = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsedValue) && parsedValue > 0 ? formatCurrency(parsedValue) : 'Ainda nao informado';
};

const parseOptionalNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildLocationLabel = (city: string, stateCode: string, complement: string) => {
  const cityLabel = city.trim();
  const stateLabel = stateCode.trim().toUpperCase();
  const complementLabel = complement.trim();
  const baseLocation = [cityLabel, stateLabel].filter(Boolean).join(' - ');

  if (!baseLocation) {
    return '';
  }

  return complementLabel ? `${baseLocation} (${complementLabel})` : baseLocation;
};

const isIbgeMunicipality = (value: unknown): value is IbgeMunicipality =>
  Boolean(
    value
    && typeof value === 'object'
    && typeof (value as { id?: unknown }).id === 'number'
    && typeof (value as { nome?: unknown }).nome === 'string',
  );

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
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [municipalitiesByState, setMunicipalitiesByState] = useState<Record<string, string[]>>({});
  const [municipalityStatus, setMunicipalityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const copy = formCopy[offerType];
  const isPublicLead = mode === 'broker-link';
  const brokerDisplayLabel = brokerName || 'corretor responsável';
  const visibleChannelCards = isPublicLead ? publicChannelCards : channelCards;
  const shouldRegisterCommission = form.negotiationChannel === 'mesa' || isPublicLead;
  const showPhField = offerType === 'venda' && form.grain === 'Milho';
  const showProteinField = offerType === 'venda' && form.grain === 'Soja';
  const showSoybeanOptions = form.grain === 'Soja';
  const municipalities = municipalitiesByState[form.locationState] || [];
  const selectedState = brazilStates.find((state) => state.code === form.locationState);
  const resolvedLocation = useMemo(
    () => buildLocationLabel(form.locationCity, form.locationState, form.locationComplement),
    [form.locationCity, form.locationComplement, form.locationState],
  );
  const opportunitySummary = [
    { label: 'Produto', value: form.grain },
    { label: 'Praca', value: resolvedLocation || 'Selecione UF e municipio' },
    { label: 'Volume', value: formatQuantityPreview(form.quantity, form.unit) },
    { label: 'Preco', value: formatCurrencyPreview(form.price) },
    { label: 'Safra', value: form.crop.trim() || 'Ainda nao informada' },
    { label: 'Frete', value: form.shipping },
  ];

  const updateField = <T extends keyof OfferFormState>(name: T, value: OfferFormState[T]) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  useEffect(() => {
    if (!form.locationState) {
      setMunicipalityStatus('idle');
      return;
    }

    if (municipalitiesByState[form.locationState]) {
      setMunicipalityStatus('ready');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadMunicipalities = async () => {
      setMunicipalityStatus('loading');

      try {
        const response = await fetch(`${ibgeLocalitiesApiBaseUrl}/estados/${form.locationState}/municipios?orderBy=nome`, {
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as unknown;

        if (!response.ok || !Array.isArray(data)) {
          throw new Error('Nao foi possivel carregar os municipios.');
        }

        const nextMunicipalities = data
          .filter(isIbgeMunicipality)
          .map((municipality) => municipality.nome)
          .filter(Boolean);

        if (!cancelled) {
          setMunicipalitiesByState((current) => ({ ...current, [form.locationState]: nextMunicipalities }));
          setMunicipalityStatus('ready');
        }
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        if (!cancelled) {
          setMunicipalityStatus('error');
        }
      }
    };

    void loadMunicipalities();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [form.locationState, municipalitiesByState]);

  const handleGrainChange = (grain: string) => {
    setForm((previous) => ({
      ...previous,
      grain,
      ph: grain === 'Milho' ? previous.ph : '',
      protein: grain === 'Soja' ? previous.protein : '',
      damagedSoybean: grain === 'Soja' ? previous.damagedSoybean : false,
    }));
  };

  const handleLocationStateChange = (stateCode: string) => {
    setForm((previous) => ({
      ...previous,
      locationState: stateCode,
      locationCity: '',
      locationComplement: '',
    }));
  };

  const handleCopy = async (value: string, feedback: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(feedback);
      window.setTimeout(() => setCopyFeedback(''), 2500);
    } catch {
      setCopyFeedback('Não foi possível copiar neste momento.');
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

    if (isPublicLead && !legalAccepted) {
      setLoading(false);
      setError('Para enviar a oportunidade, confirme a leitura e aceite do contrato Alytha e da politica de LGPD.');
      return;
    }

    if (!resolvedLocation) {
      setLoading(false);
      setError('Selecione o estado e o municipio da praca antes de salvar.');
      return;
    }

    const endpoint = isPublicLead && brokerToken ? `/broker-links/${brokerToken}/offers` : '/offers';
    const quality = {
      moisture: offerType === 'venda' ? parseOptionalNumber(form.moisture) : undefined,
      impurity: offerType === 'venda' ? parseOptionalNumber(form.impurity) : undefined,
      damaged: offerType === 'venda' ? parseOptionalNumber(form.damaged) : undefined,
      ardidos: offerType === 'venda' ? parseOptionalNumber(form.ardidos) : undefined,
      ph: showPhField ? parseOptionalNumber(form.ph) : undefined,
      protein: showProteinField ? parseOptionalNumber(form.protein) : undefined,
      standard: offerType === 'venda' && form.grainStandard ? grainStandardLabelMap[form.grainStandard] : undefined,
      nonGmo: form.nonGmo ? true : undefined,
      damagedSoybean: showSoybeanOptions && form.damagedSoybean ? true : undefined,
      deliveryWindow: form.deliveryWindow,
      funrural: offerType === 'venda' ? form.funrural : undefined,
      notes: form.qualityNotes,
      observations: form.observations,
    };
    const payload = {
      ...(isPublicLead
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone,
            company: form.company,
            accept_terms: true,
            accept_privacy: true,
            legal_version: LEGAL_DOCUMENT_VERSION,
          }
        : {}),
      type: offerType,
      grain: form.grain,
      quantity: Number(form.quantity),
      unit: form.unit,
      price: Number(form.price),
      location: resolvedLocation,
      crop: form.crop,
      shipping: form.shipping,
      negotiationChannel: form.negotiationChannel,
      mesaCommission: shouldRegisterCommission ? Number(form.mesaCommission) : null,
      quality,
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
        setMessage('Cadastro recebido com sucesso. A oportunidade ficará aguardando a quitação da taxa via PIX para liberação.');
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
                  Este envio entra direto na base privada do corretor. Você não precisa criar login agora para compartilhar a oportunidade.
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
                placeholder="você@empresa.com.br"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Telefone</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="DDD + número"
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
                {isPublicLead ? 'Atendimento com apoio da mesa Alytha.' : 'Operação com a mesa inclui comissão comercial.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900/85">
                {isPublicLead
                  ? 'Sua oportunidade será registrada para atendimento do corretor e seguirá com a política comercial da mesa Alytha.'
                  : 'A comissão por saca fica registrada no cadastro desta oportunidade e será usada no match quando a mesa conduzir a operação.'}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.6rem] border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-sm font-black text-amber-950">
                {isPublicLead ? 'Publicação direta vinculada ao corretor.' : 'Publicação direta com política comercial da plataforma.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900/85">
                {isPublicLead
                  ? `O cadastro continua reservado para ${brokerDisplayLabel}. As 4 primeiras publicações diretas do mês ficam sem taxa; a partir da 5ª, o sistema gera PIX de ${formatCurrency(100)} para liberar a oportunidade.`
                  : `As 4 primeiras publicações diretas do mês ficam sem taxa. A partir da 5ª, o cadastro gera PIX de ${formatCurrency(100)} para liberação da oportunidade.`}
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
                {isPublicLead ? 'Comissão registrada no cadastro.' : 'Comissão da mesa.'}
              </p>
              <p className={`mt-2 text-sm leading-6 ${isPublicLead ? 'text-sky-900/85' : 'text-emerald-900/85'}`}>
                {isPublicLead
                  ? 'Esse valor fica salvo no cadastro e será usado no match desta oportunidade por ter entrado por link exclusivo.'
                  : 'Selecione abaixo a comissão por saca que deve ficar vinculada ao cadastro desta oportunidade.'}
              </p>
              <label className="mt-4 block space-y-2">
                <span className={`text-xs font-black uppercase tracking-[0.2em] ${isPublicLead ? 'text-sky-800' : 'text-emerald-800'}`}>
                  {isPublicLead ? 'Comissão do cadastro' : 'Comissão da mesa'}
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
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Produto</span>
            <div className="grid grid-cols-3 gap-2">
              {grainOptions.map((grain) => {
                const active = form.grain === grain;
                return (
                  <button
                    key={grain}
                    type="button"
                    onClick={() => handleGrainChange(grain)}
                    className={`rounded-2xl border px-3 py-3 text-sm font-black transition-colors ${
                      active ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                    aria-pressed={active}
                  >
                    {grain}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.nonGmo}
                  onChange={(event) => updateField('nonGmo', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Non GMO
              </label>

              {showSoybeanOptions ? (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-100">
                  <input
                    type="checkbox"
                    checked={form.damagedSoybean}
                    onChange={(event) => updateField('damagedSoybean', event.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  Soja avariada
                </label>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Safra</span>
            <input
              required
              value={form.crop}
              onChange={(event) => updateField('crop', event.target.value)}
              placeholder="Ex.: 2024/25"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
            <div className="flex flex-wrap gap-2">
              {cropSuggestions.map((crop) => (
                <button
                  key={crop}
                  type="button"
                  onClick={() => updateField('crop', crop)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    form.crop === crop ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {crop}
                </button>
              ))}
            </div>
          </div>

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

          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.locationLabel}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Escolha UF e município para padronizar a praça no marketplace e no mapa.</p>
              </div>
              <span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-black text-emerald-800">
                {resolvedLocation || 'Praça pendente'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[0.48fr_1fr]">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Estado</span>
                <select
                  required
                  value={form.locationState}
                  onChange={(event) => handleLocationStateChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione a UF</option>
                  {brazilStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Município</span>
                {municipalityStatus === 'error' ? (
                  <input
                    required
                    value={form.locationCity}
                    onChange={(event) => updateField('locationCity', event.target.value)}
                    placeholder="Digite o município"
                    className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500"
                  />
                ) : (
                  <select
                    required
                    value={form.locationCity}
                    onChange={(event) => updateField('locationCity', event.target.value)}
                    disabled={!form.locationState || municipalityStatus === 'loading'}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {!form.locationState
                        ? 'Selecione o estado primeiro'
                        : municipalityStatus === 'loading'
                          ? 'Carregando municípios...'
                          : 'Selecione o município'}
                    </option>
                    {municipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Complemento da praça</span>
                <input
                  value={form.locationComplement}
                  onChange={(event) => updateField('locationComplement', event.target.value)}
                  placeholder="Opcional: armazém, fazenda, porto, região ou ponto de retirada"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                />
              </label>
            </div>

            {municipalityStatus === 'loading' ? (
              <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Buscando municípios do {selectedState?.name || form.locationState}...
              </p>
            ) : null}
            {municipalityStatus === 'error' ? (
              <p className="mt-3 text-xs font-bold text-amber-800">
                Não foi possível carregar a lista agora. Digite o município manualmente para continuar.
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2 md:col-span-2">
            <legend className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Condição FOB / CIF</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {shippingOptions.map((option) => {
                const active = form.shipping === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('shipping', option.value)}
                    className={`rounded-[1.4rem] border p-4 text-left transition-colors ${
                      active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-sm font-black text-slate-950">{option.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

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
            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Qualidade do grão</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Umidade (%)</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.moisture}
                    onChange={(event) => updateField('moisture', event.target.value)}
                    placeholder="Ex.: 14"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Impureza (%)</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.impurity}
                    onChange={(event) => updateField('impurity', event.target.value)}
                    placeholder="Ex.: 1"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Avariados (%)</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.damaged}
                    onChange={(event) => updateField('damaged', event.target.value)}
                    placeholder="Ex.: 3"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Ardidos (%)</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.ardidos}
                    onChange={(event) => updateField('ardidos', event.target.value)}
                    placeholder="Ex.: 2"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </label>

                {showPhField ? (
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">PH (milho)</span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={form.ph}
                      onChange={(event) => updateField('ph', event.target.value)}
                      placeholder="Ex.: 78"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </label>
                ) : null}

                {showProteinField ? (
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Proteína (soja)</span>
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={form.protein}
                      onChange={(event) => updateField('protein', event.target.value)}
                      placeholder="Ex.: 36"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                    />
                  </label>
                ) : null}
              </div>

              <fieldset className="mt-5">
                <legend className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Padrão</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {grainStandardOptions.map((option) => {
                    const active = form.grainStandard === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                          active ? 'border-emerald-500 bg-white' : 'border-slate-200 bg-white/80 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="grainStandard"
                          value={option.value}
                          checked={active}
                          onChange={() => updateField('grainStandard', option.value)}
                          className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-slate-900">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}

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

          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.paymentLabel}</span>
            <div className="flex flex-wrap gap-2">
              {paymentTermSuggestions.map((paymentTerm) => (
                <button
                  key={paymentTerm}
                  type="button"
                  onClick={() => updateField('paymentTerms', paymentTerm)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    form.paymentTerms === paymentTerm
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {paymentTerm}
                </button>
              ))}
            </div>
            <textarea
              required
              value={form.paymentTerms}
              onChange={(event) => updateField('paymentTerms', event.target.value)}
              placeholder={copy.paymentPlaceholder}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Referência</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{pixData.reference}</p>
              </div>
            </div>
          </div>
        )}

        {copyFeedback && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{copyFeedback}</div>
        )}

        {isPublicLead ? <LegalAgreementCheckbox checked={legalAccepted} onChange={setLegalAccepted} className="mt-6" /> : null}

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
        <div className="rounded-[2rem] border border-slate-200 bg-white/92 p-5 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.55)] sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">Resumo em tempo real</p>
          <div className="mt-4 grid gap-3">
            {opportunitySummary.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</span>
                <span className="text-right text-sm font-black text-slate-950">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            A praça será salva como <span className="font-bold text-slate-950">{resolvedLocation || 'Cidade - UF'}</span>, mantendo o mapa e os filtros consistentes.
          </p>
        </div>

        <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-5 text-white shadow-[0_45px_120px_-60px_rgba(5,46,43,0.8)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200">Regras do cadastro</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-emerald-50">
            {isPublicLead ? (
              <>
                <p>O envio feito por este link fica reservado para o atendimento de {brokerDisplayLabel} dentro da Alytha.</p>
                <p>A comissão por saca também fica registrada neste cadastro e, no match, segue o valor definido aqui para o corretor.</p>
                <p>Se você optar pela publicação direta, as 4 primeiras do mês não geram taxa. A partir da 5ª, o sistema apresenta a cobrança de {formatCurrency(100)}.</p>
                <p>Quando houver cobrança, os dados do PIX aparecem logo após o envio do cadastro.</p>
              </>
            ) : (
              <>
                <p>Operações com a mesa exigem definição de comissão entre R$ 0,50 e R$ 5,00 por saca.</p>
                <p>Publicações diretas contam com 4 lançamentos sem taxa por mês. A partir da 5ª, a plataforma gera cobrança de {formatCurrency(100)}.</p>
                <p>Quando houver cobrança, o retorno do cadastro apresenta os dados do PIX em nome de Alytha Intermediações de Negócios Ltda.</p>
                {offerType === 'venda' ? <p>Na venda, a tratativa de Funrural fica registrada no cadastro para dar mais clareza comercial à mesa e à contraparte.</p> : null}
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.55)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Orientações</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            {isPublicLead ? (
              <>
                <p>Preencha produto, praça, volume, safra e condições comerciais com clareza para facilitar a avaliação do corretor.</p>
                <p>Use os campos de qualidade, pagamento e observações para registrar tudo o que pode acelerar o retorno comercial.</p>
                <p>Após o envio, o corretor recebe a oportunidade na base privada dele e pode seguir o atendimento com você.</p>
              </>
            ) : (
              <>
                <p>Preencha produto, praça, volume, safra e condições comerciais com clareza para acelerar a leitura da mesa.</p>
                <p>Use os campos de qualidade e observações para registrar especificações do lote, janela e pontos sensíveis da operação.</p>
                <p>Quando o cadastro vier de link exclusivo, a oportunidade fica restrita à base privada do corretor proprietário.</p>
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
              <p className="font-black">Comissão registrada</p>
              <p className="mt-2">
                {formatCurrency(registration.mesaCommission)} por saca{' '}
                {registration.exclusiveBrokerId
                  ? 'vinculada ao cadastro deste corretor e aplicada no match.'
                  : 'para operação com a mesa Alytha.'}
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
