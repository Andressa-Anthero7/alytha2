import { useEffect, useRef, useState, type ComponentType, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeftRight,
  Copy,
  Bell,
  ChevronDown,
  ChevronUp,
  FileText,
  GanttChartSquare,
  Handshake,
  Headset,
  KeyRound,
  LayoutGrid,
  Leaf,
  LogOut,
  MapPin,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { apiFetch, supportEmail, supportWhatsAppHref } from '../../shared/api';
import type { BrokeragePayer, BrokerLinkPayload, Negotiation, Offer, User as UserType } from '../../types';

type TradingDeskPageProps = {
  currentUser: UserType;
  onLogout: () => void;
};

type BrokerTab = 'MESA' | 'MARKET_INFO';
type MobileMesaTab = 'SELL' | 'MATCH' | 'BUY' | 'NEGOTIATIONS';
type MatchBrokerageMode = 'percentage' | 'per_sack' | 'spread';
type QuoteGrain = 'Soja' | 'Milho' | 'Sorgo';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
};

type ChatMessage = {
  id: number;
  text: string;
  sender: string;
  time: string;
};

type MarketTickerItem =
  | { type: 'quote'; label: string; value: string; trend: 'up' | 'down'; change: string }
  | { type: 'news'; text: string };

type QuoteRow = {
  location: string;
  state: string;
  updatedAt: string;
  prices: Partial<Record<QuoteGrain, number>>;
};

type GrainFilterDropdownProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
};

const tickerData: MarketTickerItem[] = [
  { type: 'quote', label: 'SOJA', value: 'Mercado físico', trend: 'up', change: 'praças monitoradas' },
  { type: 'quote', label: 'MILHO', value: 'Livro Alytha', trend: 'up', change: 'operações ativas' },
  { type: 'quote', label: 'SORGO', value: 'Intermediação', trend: 'up', change: 'negócios assistidos' },
  { type: 'news', text: 'Alytha conecta vendedores, compradores e corretagem nas principais regiões agrícolas.' },
  { type: 'news', text: 'Cotações físicas e referências externas aparecem sem dados simulados quando a fonte indisponibiliza o feed.' },
];

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: 'Nova oportunidade de venda',
    message: 'Uma nova oferta foi publicada e já pode ser avaliada pela mesa.',
    time: 'Há 5 min',
    unread: true,
  },
  {
    id: 2,
    title: 'Negociação atualizada',
    message: 'Uma negociação pendente recebeu atualização comercial.',
    time: 'Há 1 hora',
    unread: true,
  },
  {
    id: 3,
    title: 'Acompanhamento de contrato',
    message: 'Uma negociação aceita está pronta para avançar na formalização.',
    time: 'Hoje',
    unread: false,
  },
];

const brokerTabs: Array<{ id: BrokerTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'MESA', label: 'Mesa de Operações', icon: LayoutGrid },
  { id: 'MARKET_INFO', label: 'Cotações', icon: TrendingUp },
];

const mobileMesaTabs: Array<{ id: MobileMesaTab; label: string }> = [
  { id: 'SELL', label: 'Vendas' },
  { id: 'MATCH', label: 'Match' },
  { id: 'BUY', label: 'Compras' },
  { id: 'NEGOTIATIONS', label: 'Negociações' },
];

const DEFAULT_MATCH_PER_SACK_COMMISSION = '1,00';
const perSackCommissionOptions = Array.from({ length: 9 }, (_, index) => ((index + 2) * 0.5).toFixed(2).replace('.', ','));

const grainAccent: Record<string, string> = {
  Soja: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Milho: 'bg-amber-100 text-amber-800 border-amber-200',
  Sorgo: 'bg-orange-100 text-orange-800 border-orange-200',
};

const supportHref = supportWhatsAppHref || `mailto:${supportEmail}`;
const supportTarget = supportWhatsAppHref ? '_blank' : undefined;
const supportRel = supportWhatsAppHref ? 'noreferrer' : undefined;

const isSupportedGrain = (grain: string): grain is QuoteGrain => grain === 'Soja' || grain === 'Milho' || grain === 'Sorgo';

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompactCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQuantity = (quantity: number, unit: string) => `${Number(quantity).toLocaleString('pt-BR')} ${unit}`;

const formatDateLabel = (value?: string) => {
  if (!value) return 'Sem atualização';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem atualização';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const resolveLocationState = (location: string) => {
  const trimmed = location.trim();
  if (!trimmed) return '--';
  const state = trimmed.split('-').pop()?.trim().toUpperCase() || '--';
  return state.length <= 3 ? state : state.slice(0, 2);
};

const isSameMonth = (value: string, reference: Date) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getMonth() === reference.getMonth() && parsed.getFullYear() === reference.getFullYear();
};

type MatchRegistrationCommissionSource = {
  commission: number;
  formattedCommission: string;
  sourceLabel: string;
  offerLabel: string;
};

const getRegisteredCommissionSource = (
  offer: Offer | null,
  offerLabel: string,
): MatchRegistrationCommissionSource | null => {
  if (!offer || offer.mesaCommission == null) return null;

  const comesFromRegistration = offer.negotiationChannel === 'mesa' || offer.exclusiveBrokerId != null;
  if (!comesFromRegistration) return null;

  return {
    commission: Number(offer.mesaCommission),
    formattedCommission: Number(offer.mesaCommission).toFixed(2).replace('.', ','),
    sourceLabel: offer.exclusiveBrokerId != null ? 'link exclusivo' : 'cadastro da mesa',
    offerLabel,
  };
};

function GrainFilterDropdown({ value, options, onChange, label, compact = false }: GrainFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>}

      <button
        type="button"
        onClick={() => setOpen((currentValue) => !currentValue)}
        className={`inline-flex w-full items-center justify-between gap-3 rounded-full border border-slate-200 bg-slate-50 text-left font-bold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-white ${
          compact ? 'min-w-[11.5rem] px-4 py-2.5 text-sm' : 'px-4 py-3 text-sm'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)]">
          <div className="space-y-1" role="listbox" aria-label={label || 'Filtro de grão'}>
            {options.map((option) => {
              const active = option === value;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                    active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{option}</span>
                  {active && <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Ativo</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TradingDeskPage({ currentUser, onLogout }: TradingDeskPageProps) {
  const navigate = useNavigate();
  const [brokerTab, setBrokerTab] = useState<BrokerTab>('MESA');
  const [mobileMesaTab, setMobileMesaTab] = useState<MobileMesaTab>('MATCH');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, ChatMessage[]>>({});
  const [isDraggingOverSell, setIsDraggingOverSell] = useState(false);
  const [isDraggingOverBuy, setIsDraggingOverBuy] = useState(false);
  const [showMobileIndicators, setShowMobileIndicators] = useState(false);
  const [selectedGrain, setSelectedGrain] = useState<string>('Todos');
  const [selectedBuy, setSelectedBuy] = useState<Offer | null>(null);
  const [selectedSell, setSelectedSell] = useState<Offer | null>(null);
  const [matchBrokerageMode, setMatchBrokerageMode] = useState<MatchBrokerageMode>('per_sack');
  const [matchBrokerageValue, setMatchBrokerageValue] = useState(DEFAULT_MATCH_PER_SACK_COMMISSION);
  const [matchBrokeragePayer, setMatchBrokeragePayer] = useState<BrokeragePayer>('seller');
  const [brokerLinks, setBrokerLinks] = useState<BrokerLinkPayload | null>(null);
  const [brokerLinkFeedback, setBrokerLinkFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tickerItems = [...tickerData, ...tickerData, ...tickerData];
  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [offersRes, allOffersRes, negsRes, usersRes] = await Promise.all([
        apiFetch('/offers'),
        apiFetch('/offers?all=true'),
        apiFetch('/negotiations'),
        apiFetch('/users'),
      ]);

      if (!offersRes.ok || !allOffersRes.ok || !negsRes.ok) {
        throw new Error('Não foi possível sincronizar os dados da mesa.');
      }

      setOffers(await offersRes.json());
      setAllOffers(await allOffersRes.json());
      setNegotiations(await negsRes.json());

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      } else {
        setUsers([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar a mesa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (currentUser.type !== 'corretor') {
      setBrokerLinks(null);
      return;
    }

    const loadBrokerLinks = async () => {
      try {
        const response = await apiFetch('/broker-links/me/');
        const payload = (await response.json().catch(() => null)) as BrokerLinkPayload | { detail?: string } | null;
        if (!response.ok || !payload || !('token' in payload)) {
          return;
        }
        setBrokerLinks(payload);
      } catch {
        setBrokerLinks(null);
      }
    };

    void loadBrokerLinks();
  }, [currentUser.id, currentUser.type]);

  useEffect(() => {
    const validSellIds = new Set(
      offers
        .filter((offer) => offer.type === 'venda' && (selectedGrain === 'Todos' || offer.grain === selectedGrain))
        .map((offer) => offer.id),
    );
    const validBuyIds = new Set(
      offers
        .filter((offer) => offer.type === 'compra' && (selectedGrain === 'Todos' || offer.grain === selectedGrain))
        .map((offer) => offer.id),
    );

    if (selectedSell && !validSellIds.has(selectedSell.id)) {
      setSelectedSell(null);
    }

    if (selectedBuy && !validBuyIds.has(selectedBuy.id)) {
      setSelectedBuy(null);
    }
  }, [offers, selectedBuy, selectedGrain, selectedSell]);

  const grainOptions: string[] = ['Todos', ...Array.from(new Set<string>(offers.map((offer) => String(offer.grain))))];
  const activeOffers = offers.filter((offer) => offer.status !== 'finalizada');
  const sellOffers = activeOffers.filter((offer) => offer.type === 'venda' && (selectedGrain === 'Todos' || offer.grain === selectedGrain));
  const buyOffers = activeOffers.filter((offer) => offer.type === 'compra' && (selectedGrain === 'Todos' || offer.grain === selectedGrain));
  const pendingNegotiations = negotiations.filter((item) => item.status === 'pendente').length;
  const finishedNegotiations = negotiations.filter((item) => item.status === 'aceita' || item.status === 'recusada').length;
  const matchesCount = negotiations.length;
  const currentMonthReference = new Date();
  const pendingNegotiationsThisMonth = negotiations.filter(
    (item) => item.status === 'pendente' && isSameMonth(item.createdAt, currentMonthReference),
  );
  const acceptedNegotiationsThisMonth = negotiations.filter(
    (item) => item.status === 'aceita' && isSameMonth(item.createdAt, currentMonthReference),
  );
  const brokerCommissionForecast = pendingNegotiationsThisMonth.reduce((total, item) => total + Number(item.brokerageFee || 0), 0) * 0.3;
  const brokerCommissionConfirmed = acceptedNegotiationsThisMonth.reduce((total, item) => total + Number(item.brokerageFee || 0), 0) * 0.3;
  const brokerCommissionForecastLabel =
    pendingNegotiationsThisMonth.length === 1
      ? '1 match pendente no mes'
      : `${pendingNegotiationsThisMonth.length} matches pendentes no mes`;
  const brokerCommissionConfirmedLabel =
    acceptedNegotiationsThisMonth.length === 1
      ? '1 match aceito no mes'
      : `${acceptedNegotiationsThisMonth.length} matches aceitos no mes`;
  const matchRegistrationCommissionSource =
    getRegisteredCommissionSource(selectedSell, 'oferta de venda') ?? getRegisteredCommissionSource(selectedBuy, 'demanda de compra');
  const matchCommissionLocked = Boolean(matchRegistrationCommissionSource);
  const lockedMatchFormattedCommission = matchRegistrationCommissionSource?.formattedCommission ?? null;
  const effectiveMatchBrokerageMode: MatchBrokerageMode = matchCommissionLocked ? 'per_sack' : matchBrokerageMode;
  const spreadValue = selectedBuy && selectedSell ? Number(selectedBuy.price) - Number(selectedSell.price) : null;
  const spreadIsPositive = spreadValue !== null && spreadValue > 0;
  const canExecuteMatch = Boolean(selectedBuy && selectedSell) && (effectiveMatchBrokerageMode !== 'spread' || spreadIsPositive);

  useEffect(() => {
    if (!lockedMatchFormattedCommission) {
      return;
    }

    setMatchBrokerageMode('per_sack');
    setMatchBrokerageValue(lockedMatchFormattedCommission);
  }, [lockedMatchFormattedCommission]);

  let marketTrend = 'Equilibrado';
  let trendColor = 'text-slate-500';
  let trendBackground = 'bg-slate-100';
  let TrendIcon: ComponentType<{ className?: string }> = ArrowLeftRight;

  if (buyOffers.length > sellOffers.length * 1.2) {
    marketTrend = 'Mais comprador';
    trendColor = 'text-blue-600';
    trendBackground = 'bg-blue-50';
    TrendIcon = TrendingUp;
  } else if (sellOffers.length > buyOffers.length * 1.2) {
    marketTrend = 'Mais vendedor';
    trendColor = 'text-orange-600';
    trendBackground = 'bg-orange-50';
    TrendIcon = TrendingDown;
  }

  const quoteRows = Array.from(
    activeOffers.reduce<Map<string, QuoteRow>>((accumulator, offer) => {
      if (!isSupportedGrain(offer.grain)) return accumulator;

      const key = offer.location.trim() || `oferta-${offer.id}`;
      const current = accumulator.get(key) ?? {
        location: offer.location || 'Praça não informada',
        state: resolveLocationState(offer.location),
        updatedAt: offer.createdAt,
        prices: {},
      };

      current.prices[offer.grain] = Number(offer.price);
      current.updatedAt = offer.createdAt || current.updatedAt;
      accumulator.set(key, current);
      return accumulator;
    }, new Map()),
  )
    .map(([, value]) => value)
    .sort((first, second) => first.location.localeCompare(second.location, 'pt-BR'));

  const quoteSummaryCards = [
    { label: 'Livro Alytha', value: `${activeOffers.length} cotações`, tone: 'text-emerald-700' },
    { label: 'Praças ativas', value: `${quoteRows.length} regiões`, tone: 'text-slate-900' },
    {
      label: 'Última consolidação',
      value: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      tone: 'text-slate-900',
    },
  ];

  const externalReferences = [
    {
      label: 'Câmbio',
      description: 'Referência externa',
      status: 'Indisponível',
      note: 'A fonte de câmbio não está configurada ou ficou indisponível.',
    },
    {
      label: 'Mercado futuro',
      description: 'Feed profissional',
      status: 'Indisponível',
      note: 'O feed profissional de futuros não está configurado ou ficou indisponível.',
    },
  ];

  const sendMessage = (negId: number, text: string, sender: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    const newMsg: ChatMessage = {
      id: Date.now(),
      text: cleaned,
      sender,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((previous) => ({
      ...previous,
      [negId]: [...(previous[negId] || []), newMsg],
    }));
  };

  const getBrokeragePayerLabel = (payer?: BrokeragePayer | null) => (payer === 'buyer' ? 'comprador' : 'vendedor');

  const handleCopyBrokerLink = async (path: string, label: string) => {
    try {
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setBrokerLinkFeedback(label);
      window.setTimeout(() => setBrokerLinkFeedback(''), 2200);
    } catch {
      setBrokerLinkFeedback('Nao foi possivel copiar o link agora.');
    }
  };

  const getBrokerageRuleLabel = (neg: Negotiation) => {
    if (neg.brokerageMode === 'fixed') {
      return `em valor fixo de ${formatCurrency(Number(neg.brokerageValue ?? 0))}`;
    }

    if (neg.brokerageMode === 'spread') {
      return `apurada pelo spread de ${formatCurrency(Number(neg.brokerageValue ?? 0))} por saca entre compra e venda`;
    }

    if (neg.brokerageMode === 'per_sack') {
      return `de ${formatCurrency(Number(neg.brokerageValue ?? 0))} por saca`;
    }

    return `${Number(neg.brokeragePercentage ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}% sobre o montante total da operação`;
  };

  const getUserById = (id: number) => users.find((user) => user.id === id);

  const handleMatch = async () => {
    return handleMatchSubmission();

    let parsedCommissionValue: number | null = null;

    if (matchBrokerageMode === 'spread') {
      if (spreadValue === null) {
        setError('Selecione uma venda e uma compra para apurar o spread.');
        return;
      }

      if (!spreadIsPositive) {
        setError('O spread precisa ser positivo para ser usado como comissão.');
        return;
      }
    } else {
      const normalizedCommissionValue = matchBrokerageValue.replace(',', '.').trim();
    if (!normalizedCommissionValue) {
      setError('Informe o valor da comissão para executar o match.');
      return;
    }

      parsedCommissionValue = Number(normalizedCommissionValue);
    if (!Number.isFinite(parsedCommissionValue)) {
      setError('Informe um valor numérico válido para a comissão.');
      return;
    }

    if (matchBrokerageMode === 'percentage' && (parsedCommissionValue < 0 || parsedCommissionValue > 100)) {
      setError('A comissão em porcentagem deve estar entre 0 e 100.');
      return;
    }

    if (matchBrokerageMode === 'per_sack' && parsedCommissionValue < 1) {
      setError('A comissao em reais por saca deve ser maior ou igual a 1,00.');
      return;
    }

    if (matchBrokerageMode === 'per_sack') {
      if (parsedCommissionValue > 5) {
        setError('A comissão em reais por saca deve ser no máximo 5,00.');
        return;
      }

      const halfSteps = parsedCommissionValue * 2;
      if (Math.abs(halfSteps - Math.round(halfSteps)) > 1e-9) {
        setError('A comissão em reais por saca deve variar de 0,50 em 0,50.');
        return;
      }
    }

    }

    const payload: Record<string, number | string> = {
      buyOfferId: selectedBuy.id,
      sellOfferId: selectedSell.id,
      brokerageMode: matchBrokerageMode,
      brokeragePayer: matchBrokeragePayer,
    };

    if (matchBrokerageMode === 'percentage' && parsedCommissionValue !== null) {
      payload.brokeragePercentage = parsedCommissionValue;
    } else if (matchBrokerageMode === 'per_sack' && parsedCommissionValue !== null) {
      payload.brokerageValue = parsedCommissionValue;
    }

    setError(null);
    const response = await apiFetch('/negotiations/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      setError(payloadError?.detail || 'Não foi possível executar o match.');
      return;
    }

    setSelectedBuy(null);
    setSelectedSell(null);
    setMatchBrokerageMode('per_sack');
      setMatchBrokerageValue(DEFAULT_MATCH_PER_SACK_COMMISSION);
    setMatchBrokeragePayer('seller');
    await loadData();
  };

  const handleMatchSubmission = async () => {
    if (!selectedBuy || !selectedSell) return;

    let parsedCommissionValue: number | null = null;

    if (matchCommissionLocked) {
      if (!matchRegistrationCommissionSource) {
        setError('Nao foi possivel identificar a comissao cadastrada para este match.');
        return;
      }

      parsedCommissionValue = matchRegistrationCommissionSource.commission;
    } else if (effectiveMatchBrokerageMode === 'spread') {
      if (spreadValue === null) {
        setError('Selecione uma venda e uma compra para apurar o spread.');
        return;
      }

      if (!spreadIsPositive) {
        setError('O spread precisa ser positivo para ser usado como comissao.');
        return;
      }
    } else {
      const normalizedCommissionValue = matchBrokerageValue.replace(',', '.').trim();
      if (!normalizedCommissionValue) {
        setError('Informe o valor da comissao para executar o match.');
        return;
      }

      parsedCommissionValue = Number(normalizedCommissionValue);
      if (!Number.isFinite(parsedCommissionValue)) {
        setError('Informe um valor numerico valido para a comissao.');
        return;
      }

      if (effectiveMatchBrokerageMode === 'percentage' && (parsedCommissionValue < 0 || parsedCommissionValue > 100)) {
        setError('A comissao em porcentagem deve estar entre 0 e 100.');
        return;
      }

      if (effectiveMatchBrokerageMode === 'per_sack' && parsedCommissionValue < 1) {
        setError('A comissao em reais por saca deve ser maior ou igual a 1,00.');
        return;
      }

      if (effectiveMatchBrokerageMode === 'per_sack') {
        if (parsedCommissionValue > 5) {
          setError('A comissao em reais por saca deve ser no maximo 5,00.');
          return;
        }

        const halfSteps = parsedCommissionValue * 2;
        if (Math.abs(halfSteps - Math.round(halfSteps)) > 1e-9) {
          setError('A comissao em reais por saca deve variar de 0,50 em 0,50.');
          return;
        }
      }
    }

    const payload: Record<string, number | string> = {
      buyOfferId: selectedBuy.id,
      sellOfferId: selectedSell.id,
      brokerageMode: effectiveMatchBrokerageMode,
      brokeragePayer: matchBrokeragePayer,
    };

    if (effectiveMatchBrokerageMode === 'percentage' && parsedCommissionValue !== null) {
      payload.brokeragePercentage = parsedCommissionValue;
    } else if (effectiveMatchBrokerageMode === 'per_sack' && parsedCommissionValue !== null) {
      payload.brokerageValue = parsedCommissionValue;
    }

    setError(null);
    const response = await apiFetch('/negotiations/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      setError(payloadError?.detail || 'Nao foi possivel executar o match.');
      return;
    }

    setSelectedBuy(null);
    setSelectedSell(null);
    setMatchBrokerageMode('per_sack');
    setMatchBrokerageValue(DEFAULT_MATCH_PER_SACK_COMMISSION);
    setMatchBrokeragePayer('seller');
    await loadData();
  };

  const updateNegStatus = async (id: number, status: Negotiation['status']) => {
    setError(null);
    const response = await apiFetch(`/negotiations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.detail || 'Não foi possível atualizar a negociação.');
      return;
    }

    await loadData();
  };

  const handleOpenContract = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setShowContractModal(true);
    if (neg.status !== 'aceita') {
      void updateNegStatus(neg.id, 'aceita');
    }
  };

  const renderBrokerageControls = (compact = false) => (
    <div className={`rounded-2xl border border-white/10 bg-slate-950/30 ${compact ? 'p-3' : 'p-4'}`}>
      <p className={`font-black uppercase tracking-[0.22em] text-slate-300 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>Comissão</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
            matchBrokerageMode === 'per_sack'
              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          <input
            type="radio"
            name="brokerageMode"
            value="per_sack"
            checked={matchBrokerageMode === 'per_sack'}
            onChange={() => {
              setMatchBrokerageMode('per_sack');
              if (!perSackCommissionOptions.includes(matchBrokerageValue)) {
                setMatchBrokerageValue(DEFAULT_MATCH_PER_SACK_COMMISSION);
              }
            }}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
          R$/sc
        </label>
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
            matchBrokerageMode === 'percentage'
              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          <input
            type="radio"
            name="brokerageMode"
            value="percentage"
            checked={matchBrokerageMode === 'percentage'}
            onChange={() => setMatchBrokerageMode('percentage')}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
          %
        </label>
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
            matchBrokerageMode === 'spread'
              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          <input
            type="radio"
            name="brokerageMode"
            value="spread"
            checked={matchBrokerageMode === 'spread'}
            onChange={() => setMatchBrokerageMode('spread')}
            className="h-3.5 w-3.5 accent-emerald-500"
          />
          Spread
        </label>
      </div>

      {matchBrokerageMode === 'per_sack' ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Valor</span>
            <select
              value={matchBrokerageValue}
              onChange={(event) => setMatchBrokerageValue(event.target.value)}
              className="mt-1 w-full border-none bg-transparent text-sm font-bold text-white outline-none"
            >
              {perSackCommissionOptions.map((value) => (
                <option key={value} value={value} className="bg-slate-900 text-white">
                  R$ {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : matchBrokerageMode === 'spread' ? (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Spread apurado</span>
          <p className={`mt-2 text-sm font-black ${spreadIsPositive ? 'text-emerald-200' : 'text-orange-300'}`}>
            {spreadValue === null ? 'Selecione venda e compra para calcular.' : `R$ ${formatCompactCurrency(spreadValue)}/sc`}
          </p>
          <p className="mt-1 text-xs leading-6 text-slate-400">Diferença entre o preço da compra e o preço da venda por saca.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Percentual</span>
            <input
              type="text"
              inputMode="decimal"
              value={matchBrokerageValue}
              onChange={(event) => setMatchBrokerageValue(event.target.value.replace(/[^0-9.,]/g, ''))}
              onBlur={() => {
                const normalized = matchBrokerageValue.replace(',', '.').trim();
                const parsed = Number(normalized);
                if (!Number.isFinite(parsed)) return;
                setMatchBrokerageValue(parsed.toFixed(2).replace('.', ','));
              }}
              className="mt-1 w-full border-none bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
              placeholder="1,00"
            />
          </label>
        </div>
      )}

      <label className="mt-3 block rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Responsável</span>
        <select
          value={matchBrokeragePayer}
          onChange={(event) => setMatchBrokeragePayer(event.target.value as BrokeragePayer)}
          className="mt-1 w-full border-none bg-transparent text-sm font-bold text-white outline-none"
        >
          <option value="seller" className="bg-slate-900 text-white">
            Vendedor paga
          </option>
          <option value="buyer" className="bg-slate-900 text-white">
            Comprador paga
          </option>
        </select>
      </label>
    </div>
  );

  const renderMatchBrokerageControls = (compact = false) => {
    if (!matchCommissionLocked || !matchRegistrationCommissionSource) {
      return renderBrokerageControls(compact);
    }

    return (
      <div className={`rounded-2xl border border-white/10 bg-slate-950/30 ${compact ? 'p-3' : 'p-4'}`}>
        <p className={`font-black uppercase tracking-[0.22em] text-slate-300 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>Comissao</p>

        <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">Valor aplicado</span>
              <p className="mt-2 text-sm font-black text-emerald-100">R$ {matchRegistrationCommissionSource.formattedCommission}/sc</p>
            </div>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
              Vem do cadastro
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-emerald-100/80">
            Valor vindo do {matchRegistrationCommissionSource.sourceLabel} da {matchRegistrationCommissionSource.offerLabel}.
          </p>
        </div>

        <label className="mt-3 block rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Responsavel</span>
          <select
            value={matchBrokeragePayer}
            onChange={(event) => setMatchBrokeragePayer(event.target.value as BrokeragePayer)}
            className="mt-1 w-full border-none bg-transparent text-sm font-bold text-white outline-none"
          >
            <option value="seller" className="bg-slate-900 text-white">
              Vendedor paga
            </option>
            <option value="buyer" className="bg-slate-900 text-white">
              Comprador paga
            </option>
          </select>
        </label>
      </div>
    );
  };

  const renderSelectedOfferCard = (
    label: string,
    offer: Offer | null,
    accent: 'emerald' | 'orange' | 'blue',
    onClear?: () => void,
    compact = false,
  ) => {
    const accentClass =
      accent === 'orange'
        ? 'border-orange-500/30 bg-orange-500/8 text-orange-200'
        : accent === 'blue'
          ? 'border-blue-500/30 bg-blue-500/8 text-blue-200'
          : 'border-emerald-500/30 bg-emerald-500/8 text-emerald-200';

    return (
      <div
        className={`rounded-2xl border ${compact ? 'p-2.5 md:p-2 xl:p-2.5' : 'p-4'} ${
          offer ? accentClass : 'border-slate-800 bg-slate-900/55 text-slate-500'
        }`}
      >
        <div className={`flex items-start justify-between ${compact ? 'gap-2 md:gap-1.5' : 'gap-3'}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
            {offer ? (
              <>
                <h4 className={`font-black text-white ${compact ? 'mt-1 text-[15px] md:text-[14px]' : 'mt-2 text-lg'}`}>{offer.grain}</h4>
                <p className={`text-slate-300 ${compact ? 'mt-0.5 text-[11px] leading-4 md:text-[10px]' : 'mt-1 text-sm'}`}>{offer.location}</p>
                <p className={`font-mono font-black text-white ${compact ? 'mt-1.5 text-base md:mt-1 md:text-[15px]' : 'mt-3 text-xl'}`}>
                  {formatCurrency(Number(offer.price))}
                </p>
                <p
                  className={`font-bold uppercase tracking-[0.16em] text-slate-400 ${
                    compact ? 'mt-0.5 text-[10px] md:text-[9px]' : 'mt-1 text-xs'
                  }`}
                >
                  {formatQuantity(Number(offer.quantity), offer.unit)}
                </p>
              </>
            ) : (
              <p className={`${compact ? 'mt-1.5 text-[11px] leading-4 md:text-[10px]' : 'mt-3 text-sm leading-6'}`}>Aguardando seleção desta ponta da negociação.</p>
            )}
          </div>
          {offer && onClear && (
            <button
              type="button"
              onClick={onClear}
              className={`rounded-full border border-white/10 text-slate-400 transition-colors hover:border-white/20 hover:text-white ${
                compact ? 'p-1 md:p-0.5' : 'p-2'
              }`}
            >
              <X className={compact ? 'h-3 w-3 md:h-2.5 md:w-2.5' : 'h-4 w-4'} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMobileOfferList = (offerType: 'venda' | 'compra') => {
    const list = offerType === 'venda' ? sellOffers : buyOffers;
    const label = offerType === 'venda' ? 'oferta' : 'demanda';
    const toneClasses =
      offerType === 'venda'
        ? 'border-orange-200 text-orange-700 hover:border-orange-300'
        : 'border-blue-200 text-blue-700 hover:border-blue-300';

    if (list.length === 0) {
      return (
        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhuma {label} disponível neste filtro.</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">Ajuste o tipo de grão para continuar a triagem da mesa.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((offer) => {
          const isSelected = offerType === 'venda' ? selectedSell?.id === offer.id : selectedBuy?.id === offer.id;
          return (
            <article
              key={offer.id}
              className={`rounded-[1.8rem] border bg-white p-4 shadow-sm transition-colors ${
                isSelected ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                      grainAccent[offer.grain] || 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {offer.grain}
                  </span>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{formatCurrency(Number(offer.price))}</h3>
                </div>
                <p className="text-right text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{offer.shipping}</p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {offer.location}
                </p>
                <p>{formatQuantity(Number(offer.quantity), offer.unit)}</p>
                <p>Safra {offer.crop}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (offerType === 'venda') {
                    setSelectedSell(offer);
                  } else {
                    setSelectedBuy(offer);
                  }
                  setMobileMesaTab('MATCH');
                }}
                className={`mt-4 inline-flex w-full items-center justify-center rounded-full border px-4 py-3 text-sm font-black uppercase tracking-[0.2em] transition-colors ${toneClasses}`}
              >
                {isSelected ? `${label} selecionada` : `Selecionar ${label}`}
              </button>
            </article>
          );
        })}
      </div>
    );
  };

  const renderNegotiationList = (mobile = false) => {
    if (negotiations.length === 0) {
      return (
        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhuma negociação ativa.</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">Quando a mesa executar um match, o acompanhamento aparece aqui.</p>
        </div>
      );
    }

    if (mobile) {
      return (
        <div className="space-y-3">
          {negotiations.map((neg) => {
            const buyer = getUserById(neg.buyerId);
            const seller = getUserById(neg.sellerId);
            const accepted = neg.status === 'aceita';

            return (
              <article key={neg.id} className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Negociação #{neg.id}</p>
                    <h3 className="mt-2 text-base font-black text-slate-950">
                      {seller?.name || 'Vendedor'} x {buyer?.name || 'Comprador'}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                      accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {accepted ? 'Finalizada' : 'Aguardando'}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Comissão: {formatCurrency(Number(neg.brokerageFee))}</p>
                  <p>Responsável: {getBrokeragePayerLabel(neg.brokeragePayer)}</p>
                  <p>Criada em: {formatDateLabel(neg.createdAt)}</p>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveChat(neg.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-700"
                  >
                    <Handshake className="h-4 w-4" />
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenContract(neg)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-700"
                  >
                    <FileText className="h-4 w-4" />
                    Contrato
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100">
        {negotiations.map((neg) => {
          const buyer = getUserById(neg.buyerId);
          const seller = getUserById(neg.sellerId);
          const accepted = neg.status === 'aceita';

          return (
            <div key={neg.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Negociação #{neg.id}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-900">
                  {seller?.name || 'Vendedor'} x {buyer?.name || 'Comprador'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Comissão {formatCurrency(Number(neg.brokerageFee))} • {getBrokeragePayerLabel(neg.brokeragePayer)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                  accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}
              >
                {accepted ? 'Finalizada' : 'Aguardando'}
              </span>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveChat(neg.id)}
                  title="Abrir chat"
                  className="rounded-full border border-emerald-200 p-2 text-emerald-700 transition-colors hover:bg-emerald-50"
                >
                  <Handshake className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenContract(neg)}
                  title="Abrir contrato"
                  className="rounded-full border border-slate-200 p-2 text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDesktopOfferTable = (offerType: 'venda' | 'compra') => {
    const list = offerType === 'venda' ? sellOffers : buyOffers;
    const title = offerType === 'venda' ? 'Vendas' : 'Compras';
    const dotColor = offerType === 'venda' ? 'bg-orange-500' : 'bg-blue-500';
    const selectedId = offerType === 'venda' ? selectedSell?.id : selectedBuy?.id;

    const handleSelect = (offer: Offer) => {
      if (offerType === 'venda') {
        setSelectedSell(offer);
      } else {
        setSelectedBuy(offer);
      }
    };

    const handleDragStart = (event: DragEvent, offer: Offer) => {
      event.dataTransfer.setData('offerId', offer.id.toString());
      event.dataTransfer.setData('offerType', offer.type);
    };

    return (
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5 xl:px-4 xl:py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 xl:text-[11px]">{list.length} itens</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${trendBackground} ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {marketTrend}
            </span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-slate-500">Nenhum item para este filtro.</div>
        ) : (
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-400 xl:text-[11px]">
                  <th className="px-4 py-3 font-black">Produto</th>
                  <th className="px-4 py-3 font-black">Praça</th>
                  <th className="px-4 py-3 text-right font-black">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((offer) => (
                  <tr
                    key={offer.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, offer)}
                    onClick={() => handleSelect(offer)}
                    className={`cursor-pointer transition-colors ${selectedId === offer.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-2.5 xl:px-4 xl:py-3">
                      <div className="flex items-center gap-2.5 xl:gap-3">
                        <span className={`h-7 w-1 rounded-full xl:h-8 ${dotColor}`} />
                        <div>
                          <p className="text-sm font-bold text-slate-900 xl:text-[15px]">{offer.grain}</p>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 xl:text-xs">{offer.shipping}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 xl:px-4 xl:py-3">
                      <p className="text-[13px] text-slate-700 xl:text-sm">{offer.location}</p>
                      <p className="text-[11px] text-slate-500 xl:text-xs">{formatQuantity(Number(offer.quantity), offer.unit)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right xl:px-4 xl:py-3">
                      <p className={`font-mono text-sm font-black xl:text-base ${offerType === 'venda' ? 'text-orange-700' : 'text-blue-700'}`}>
                        {formatCompactCurrency(Number(offer.price))}
                      </p>
                      <p className="text-[11px] text-slate-500 xl:text-xs">Safra {offer.crop}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderContractModal = () => {
    if (!selectedNeg || !showContractModal) return null;

    const buyer = getUserById(selectedNeg.buyerId);
    const seller = getUserById(selectedNeg.sellerId);
    const offer = allOffers.find((item) => item.id === selectedNeg.offerId || item.id === selectedNeg.buyOfferId);
    const brokerageRuleLabel = getBrokerageRuleLabel(selectedNeg);
    const brokeragePayerLabel = getBrokeragePayerLabel(selectedNeg.brokeragePayer);

    return (
      <div className="fixed inset-0 z-[110] bg-black/60 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="relative h-full w-full overflow-y-auto bg-white p-6 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[2rem] sm:p-10">
          <div className="absolute left-0 top-0 h-1.5 w-full bg-emerald-600" />

          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950 sm:text-3xl">Contrato de Intermediação</h2>
              <p className="mt-2 font-mono text-xs text-slate-400">REF: #ALYTHA-{selectedNeg.id}-{new Date().getFullYear()}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowContractModal(false)}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Vendedor</p>
              <p className="mt-3 text-lg font-black text-slate-950">{seller?.name || '-'}</p>
              <p className="mt-1 text-sm text-slate-600">{seller?.email || '-'}</p>
            </div>
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Comprador</p>
              <p className="mt-3 text-lg font-black text-slate-950">{buyer?.name || '-'}</p>
              <p className="mt-1 text-sm text-slate-600">{buyer?.email || '-'}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Produto</p>
                <p className="mt-2 text-base font-bold text-slate-950">{offer?.grain || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Quantidade</p>
                <p className="mt-2 text-base font-bold text-slate-950">
                  {formatQuantity(Number(selectedNeg.proposedQuantity), offer?.unit || 'sc')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Preço acordado</p>
                <p className="mt-2 text-base font-black text-emerald-700">{formatCurrency(Number(selectedNeg.proposedPrice))}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Cláusula de corretagem</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Fica acordado o pagamento de comissão de corretagem {brokerageRuleLabel}, totalizando{' '}
                <span className="font-bold text-emerald-700">{formatCurrency(Number(selectedNeg.brokerageFee))}</span>, a ser paga
                pelo {brokeragePayerLabel} após a liquidação financeira.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Baixar PDF
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-700"
            >
              <ShieldCheck className="h-4 w-4" />
              Assinar digitalmente
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChat = (negId: number) => {
    const neg = negotiations.find((item) => item.id === negId);
    if (!neg) return null;

    const buyer = getUserById(neg.buyerId);
    const seller = getUserById(neg.sellerId);

    return (
      <div className="flex h-full flex-col overflow-hidden bg-white sm:h-[520px] sm:rounded-[1.8rem] sm:border sm:border-slate-200 sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Intermediação #{negId}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {buyer?.name || 'Comprador'} x {seller?.name || 'Vendedor'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveChat(null)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {(messages[negId] || []).map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'Corretor' ? 'items-end' : 'items-start'}`}>
              <span className="mb-1 text-[11px] font-bold text-slate-400">
                {msg.sender} • {msg.time}
              </span>
              <div
                className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm ${
                  msg.sender === 'Corretor' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {(messages[negId] || []).length === 0 && (
            <p className="pt-14 text-center text-sm text-slate-400">Inicie o diálogo com as partes para alinhar o contrato.</p>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mensagem para as partes..."
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  sendMessage(negId, (event.target as HTMLInputElement).value, 'Corretor');
                  (event.target as HTMLInputElement).value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={(event) => {
                const input = (event.currentTarget.previousElementSibling as HTMLInputElement | null);
                if (!input) return;
                sendMessage(negId, input.value, 'Corretor');
                input.value = '';
              }}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-emerald-700"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMarketInfoSection = () => (
    <div className="space-y-6 pb-2">
      <div className="grid gap-4 md:grid-cols-3">
        {quoteSummaryCards.map((card) => (
          <article key={card.label} className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
            <p className={`mt-3 text-2xl font-black ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Cotações nas principais praças</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Livro Alytha consolidado por praça, sem exibir dados simulados quando não houver referência ativa.
              </p>
            </div>
            <div className="hidden rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 sm:block">
              {quoteRows.length} praças
            </div>
          </div>

          {quoteRows.length === 0 ? (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhuma cotação disponível no livro Alytha.</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">As praças aparecem aqui assim que houver ofertas e demandas ativas na plataforma.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {quoteRows.map((row) => (
                <article key={row.location} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-950">{row.location}</h3>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {row.state} • Atualizado {formatDateLabel(row.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['Soja', 'Milho', 'Sorgo'] as QuoteGrain[]).map((grain) => (
                        <div key={grain} className="rounded-full border border-white bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
                          <span className="mr-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{grain}</span>
                          {row.prices[grain] ? formatCurrency(Number(row.prices[grain])) : 'Indisponível'}
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-950">Bolsa e referências externas</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Quando alguma fonte externa ficar indisponível, a interface assume essa condição sem exibir dados simulados.
          </p>

          <div className="mt-6 space-y-3">
            {externalReferences.map((reference) => (
              <article key={reference.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{reference.description}</p>
                    <h3 className="mt-2 text-lg font-black text-slate-950">{reference.label}</h3>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                    {reference.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-500">{reference.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderMesa = () => {
    const handleDrop = (event: DragEvent, targetType: 'venda' | 'compra') => {
      event.preventDefault();
      setIsDraggingOverSell(false);
      setIsDraggingOverBuy(false);

      const offerId = event.dataTransfer.getData('offerId');
      const offerType = event.dataTransfer.getData('offerType');
      if (offerType !== targetType) return;

      const offer = offers.find((item) => item.id === Number(offerId));
      if (!offer) return;

      if (targetType === 'venda') {
        setSelectedSell(offer);
      } else {
        setSelectedBuy(offer);
      }
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Mesa de Operações</h2>
            <p className="mt-1 text-sm leading-7 text-slate-500">Fluxo de vendas, match, compras e negociações da Alytha.</p>
          </div>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {[
              { label: 'Volume 24h', value: '12.450t' },
              { label: 'Matches', value: String(matchesCount) },
              { label: 'Aguardando', value: String(pendingNegotiations) },
              { label: 'Finalizadas', value: String(finishedNegotiations) },
            ].map((item) => (
              <div key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500 shadow-sm">
                <span className="font-black uppercase tracking-[0.18em]">{item.label}</span>
                <span className="ml-2 font-mono text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setShowMobileIndicators((currentValue) => !currentValue)}
            className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black tracking-tight text-slate-800 shadow-sm"
          >
            <span>Indicadores da mesa</span>
            {showMobileIndicators ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showMobileIndicators && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: 'Volume 24h', value: '12.450t' },
                { label: 'Matches', value: String(matchesCount) },
                { label: 'Aguardando', value: String(pendingNegotiations) },
                { label: 'Finalizadas', value: String(finishedNegotiations) },
              ].map((item) => (
                <div key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <span className="font-bold">{item.label}</span>
                  <span className="ml-2 font-mono font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
            <GrainFilterDropdown
              label="Filtro de grão"
              value={selectedGrain}
              options={grainOptions}
              onChange={setSelectedGrain}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {mobileMesaTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobileMesaTab(tab.id)}
                className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-colors ${
                  mobileMesaTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-700 shadow-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {mobileMesaTab === 'SELL' && renderMobileOfferList('venda')}
            {mobileMesaTab === 'BUY' && renderMobileOfferList('compra')}
            {mobileMesaTab === 'NEGOTIATIONS' && renderNegotiationList(true)}
            {mobileMesaTab === 'MATCH' && (
              <section className="rounded-[2rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-4 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Match central</p>
                    <h3 className="mt-2 text-2xl font-black">Mesa mobile</h3>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${trendBackground} ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {marketTrend}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {renderSelectedOfferCard('Venda selecionada', selectedSell, 'orange', () => setSelectedSell(null))}
                  <div className="flex justify-center">
                    <div className="rounded-full bg-white/10 p-3">
                      <ArrowLeftRight className="h-5 w-5 text-emerald-300" />
                    </div>
                  </div>
                  {renderSelectedOfferCard('Compra selecionada', selectedBuy, 'blue', () => setSelectedBuy(null))}
                </div>

                <div className="mt-4">{renderMatchBrokerageControls()}</div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Spread</p>
                  <p className={`mt-2 font-mono text-2xl font-black ${spreadIsPositive ? 'text-emerald-300' : 'text-orange-300'}`}>
                    {spreadValue === null ? '--' : `${spreadIsPositive ? '+' : ''}${formatCompactCurrency(spreadValue)}`}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canExecuteMatch}
                  onClick={() => void handleMatch()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Executar match
                </button>
              </section>
            )}
          </div>
        </div>

        <div className="hidden min-h-0 md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.45fr)_minmax(0,0.8fr)] md:gap-4 2xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.32fr)_minmax(0,0.86fr)]">
          {renderDesktopOfferTable('venda')}

          <div className="flex min-h-0 flex-col gap-3">
            <section className="relative overflow-hidden rounded-[1.8rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-4 text-white shadow-[0_40px_100px_-60px_rgba(15,23,42,0.95)] xl:p-5">
              <div className="absolute inset-x-10 top-0 h-28 bg-emerald-500/10 blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Match central</p>
                    <h3 className="mt-1 text-xl font-black xl:text-2xl">Mesa de negociação</h3>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${trendBackground} ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    {marketTrend}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingOverSell(true);
                    }}
                    onDragLeave={() => setIsDraggingOverSell(false)}
                    onDrop={(event) => handleDrop(event, 'venda')}
                    className={`rounded-[1.6rem] border-2 border-dashed p-2.5 transition-colors xl:p-3 ${
                      isDraggingOverSell ? 'border-orange-400 bg-orange-500/10' : 'border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    {renderSelectedOfferCard('Venda selecionada', selectedSell, 'orange', () => setSelectedSell(null), true)}
                  </div>

                  <div className="flex flex-col items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!canExecuteMatch}
                      onClick={() => void handleMatch()}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <div className="text-center">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Spread</p>
                      <p className={`mt-1.5 font-mono text-base font-black xl:text-lg ${spreadIsPositive ? 'text-emerald-200' : 'text-orange-300'}`}>
                        {spreadValue === null ? '--' : `${spreadIsPositive ? '+' : ''}${formatCompactCurrency(spreadValue)}`}
                      </p>
                    </div>
                  </div>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingOverBuy(true);
                    }}
                    onDragLeave={() => setIsDraggingOverBuy(false)}
                    onDrop={(event) => handleDrop(event, 'compra')}
                    className={`rounded-[1.6rem] border-2 border-dashed p-2.5 transition-colors xl:p-3 ${
                      isDraggingOverBuy ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    {renderSelectedOfferCard('Compra selecionada', selectedBuy, 'blue', () => setSelectedBuy(null), true)}
                  </div>
                </div>

                <div className="mt-3">{renderMatchBrokerageControls(true)}</div>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <GanttChartSquare className="h-4 w-4 text-slate-700" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">Monitor de negociações</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <span>Aguardando {pendingNegotiations}</span>
                  <span>Finalizadas {finishedNegotiations}</span>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">{renderNegotiationList()}</div>
            </section>
          </div>

          {renderDesktopOfferTable('compra')}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
      <div className="sticky top-0 z-50">
        <div className="relative flex overflow-hidden whitespace-nowrap border-b border-emerald-900 bg-emerald-950 py-2 text-xs text-white">
          <div className="flex w-max animate-marquee">
            {tickerItems.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className="mx-6 flex items-center">
                {item.type === 'quote' ? (
                  <>
                    <span className="mr-2 font-bold text-emerald-100">{item.label}</span>
                    <span className="mr-2 font-mono">{item.value}</span>
                    <span className={`flex items-center font-bold ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.trend === 'up' ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                      {item.change}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-50">{item.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <nav className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm sm:h-10 sm:w-10">
                <Leaf className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-lg font-black leading-none tracking-tight text-emerald-950 sm:text-xl">Alytha</h1>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">Agromarket</span>
              </div>
            </div>

            <div className="hidden md:block">
              <GrainFilterDropdown value={selectedGrain} options={grainOptions} onChange={setSelectedGrain} compact />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="hidden border-r border-slate-200 pr-4 text-right lg:block">
                <p className="text-xs font-bold capitalize text-slate-900">{currentDate.split(',')[0]}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{currentDate.split(',')[1]?.trim()}</p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowNotifications((currentValue) => !currentValue);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-emerald-700 sm:h-10 sm:w-10"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-orange-500" />
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-[18.5rem] origin-top-right overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl sm:w-80">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <h3 className="text-sm font-black text-slate-900">Notificações</h3>
                        <button type="button" className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          Marcar lidas
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {mockNotifications.map((notification) => (
                          <div key={notification.id} className="border-b border-slate-100 px-4 py-3 last:border-none">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                              {notification.unread && <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{notification.message}</p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{notification.time}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <a
                href={supportHref}
                target={supportTarget}
                rel={supportRel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-emerald-700 md:hidden"
                aria-label="Falar com suporte"
              >
                <Headset className="h-4 w-4" />
              </a>

              <a
                href={supportHref}
                target={supportTarget}
                rel={supportRel}
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:bg-slate-50 md:inline-flex"
              >
                <Headset className="h-4 w-4 text-emerald-600" />
                Suporte
              </a>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setShowUserMenu((currentValue) => !currentValue);
                  }}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 transition-colors hover:bg-slate-50 sm:px-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="truncate text-[11px] font-bold text-slate-900">{currentUser.name || 'Equipe Alytha'}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">Corretor</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-[22rem] origin-top-right overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl">
                      <div className="border-b border-slate-100 px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Conta profissional</p>
                        <p className="mt-2 truncate text-sm font-bold text-slate-900">{currentUser.name || 'Equipe Alytha'}</p>
                        <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                          {currentUser.company || 'Mesa Alytha'}
                        </p>
                        <p className="mt-2 truncate text-xs text-slate-500">{currentUser.email}</p>
                      </div>

                      <div className="hidden border-b border-slate-100 bg-emerald-50/70 px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Comissões (mês)</p>
                        <p className="mt-2 text-lg font-black text-emerald-700">Em apuração</p>
                      </div>

                      <div className="border-b border-slate-100 bg-emerald-50/70 px-4 py-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Comissoes do mes</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">30% da corretagem definida em cada match do mes.</p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Prevista</p>
                            <p className="mt-1.5 text-base font-black text-amber-700">{formatCurrency(brokerCommissionForecast)}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{brokerCommissionForecastLabel}</p>
                          </div>

                          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Confirmada</p>
                            <p className="mt-1.5 text-base font-black text-emerald-700">{formatCurrency(brokerCommissionConfirmed)}</p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{brokerCommissionConfirmedLabel}</p>
                          </div>
                        </div>
                      </div>

                      {currentUser.type === 'corretor' ? (
                        <div className="border-b border-slate-100 bg-sky-50/60 px-4 py-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Links exclusivos</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Copie seus links para receber cadastros de venda e compra direto na sua base privada.
                          </p>

                          <div className="mt-3 grid gap-2">
                            <button
                              type="button"
                              disabled={!brokerLinks}
                              onClick={() => brokerLinks && void handleCopyBrokerLink(brokerLinks.sellPath, 'Link exclusivo de venda copiado.')}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Copy className="h-4 w-4" />
                              Copiar link de venda
                            </button>
                            <button
                              type="button"
                              disabled={!brokerLinks}
                              onClick={() => brokerLinks && void handleCopyBrokerLink(brokerLinks.buyPath, 'Link exclusivo de compra copiado.')}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Copy className="h-4 w-4" />
                              Copiar link de compra
                            </button>
                          </div>

                          {brokerLinkFeedback && (
                            <div className="mt-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-sky-800">{brokerLinkFeedback}</div>
                          )}
                        </div>
                      ) : null}

                      <div className="space-y-1 px-2 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/perfil');
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <User className="h-4 w-4 text-slate-500" />
                          Perfil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/perfil/trocar-senha');
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <KeyRound className="h-4 w-4 text-slate-500" />
                          Trocar senha
                        </button>
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

                      <div className="border-t border-slate-100 px-2 py-2">
                        <button
                          type="button"
                          onClick={onLogout}
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

      {error && (
        <div className="mx-auto mt-4 flex max-w-7xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 pb-6 pt-3 sm:px-4 md:px-6 md:pb-8">
        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-20 text-center text-slate-500 shadow-sm">
            Sincronizando dados da plataforma...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-200">
              {brokerTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBrokerTab(tab.id)}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                    brokerTab === tab.id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {brokerTab === 'MESA' ? renderMesa() : renderMarketInfoSection()}
          </div>
        )}
      </main>

      {activeChat && (
        <div className="fixed inset-0 z-[105] bg-black/50 p-0 sm:flex sm:items-end sm:justify-end sm:bg-transparent sm:p-6">
          <div className="h-full w-full sm:h-auto sm:w-[26rem]">{renderChat(activeChat)}</div>
        </div>
      )}

      {renderContractModal()}
    </div>
  );
}
