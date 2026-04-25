import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  FilePlus2,
  HandCoins,
  Home,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PackageSearch,
  Save,
  ShieldCheck,
  Trash2,
  Users2,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { clearAuth, getCurrentUser } from '../lib/auth';
import { BACKOFFICE_PATH, HOME_PATH, OPERATIONS_PATH } from '../shared/appRoutes';
import { BrandLogo } from '../shared/BrandLogo';
import { formatCurrency, formatDateTime, formatNumber } from '../shared/format';
import type { BrokerageMode, BrokeragePayer, Negotiation, Offer, User } from '../types';

type BackofficeTab = 'overview' | 'users' | 'offers' | 'negotiations';

type UserFormState = {
  type: User['type'];
  name: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  legal_name: string;
  profile_segment: string;
  document_type: string;
  document_number: string;
  state_registration: string;
  address_zip_code: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_country: string;
  document_notes: string;
};

type OfferFormState = {
  userId: string;
  type: Offer['type'];
  grain: string;
  quantity: string;
  unit: string;
  price: string;
  location: string;
  crop: string;
  shipping: Offer['shipping'];
  negotiationChannel: Offer['negotiationChannel'];
  mesaCommission: string;
  nonGmo: boolean;
  deliveryWindow: string;
  qualityStandard: string;
  qualityNotes: string;
  observations: string;
  funrural: string;
  paymentTerms: string;
};

type MatchFormState = {
  sellOfferId: string;
  buyOfferId: string;
  brokerageMode: BrokerageMode;
  brokerageValue: string;
  brokeragePayer: BrokeragePayer;
};

type UserFilter = 'todos' | 'novos' | User['type'];

const tabs: Array<{ id: BackofficeTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Visao geral', icon: LayoutDashboard },
  { id: 'users', label: 'Usuarios', icon: Users2 },
  { id: 'offers', label: 'Ofertas e demandas', icon: PackageSearch },
  { id: 'negotiations', label: 'Comissoes e negociacoes', icon: HandCoins },
];

const tabDescriptions: Record<BackofficeTab, { title: string; description: string }> = {
  overview: {
    title: 'Central administrativa Alytha',
    description:
      'Acompanhe os principais indicadores do escritorio, revise a saude da operacao e navegue rapidamente para os fluxos do dia a dia do backoffice.',
  },
  users: {
    title: 'Gestao de cadastros e perfis',
    description:
      'Controle compradores, vendedores, corretores e acessos de backoffice em uma tela orientada a operacao, com foco em cadastro, manutencao e auditoria.',
  },
  offers: {
    title: 'Livro de ofertas e demandas',
    description:
      'Cadastre oportunidades, acompanhe o livro comercial da plataforma e filtre entradas por tipo, canal, status e responsavel.',
  },
  negotiations: {
    title: 'Comissoes, matches e negociacoes',
    description:
      'Abra matches, acompanhe a corretagem por corretor e atualize o status de cada negociacao com uma visao mais proxima de CRM operacional.',
  },
};

const roleLabels: Record<User['type'], string> = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
};

const offerTypeLabels: Record<Offer['type'], string> = {
  venda: 'Oferta',
  compra: 'Demanda',
};

const offerStatusLabels: Record<Offer['status'], string> = {
  ativa: 'Ativa',
  finalizada: 'Finalizada',
  aguardando_pagamento: 'Aguardando PIX',
};

const offerChannelLabels: Record<Offer['negotiationChannel'], string> = {
  mesa: 'Mesa Alytha',
  direta: 'Oferta direta',
};

const negotiationStatusLabels: Record<Negotiation['status'], string> = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
};

const negotiationModeLabels: Record<BrokerageMode, string> = {
  percentage: 'Percentual',
  fixed: 'Valor fixo',
  per_sack: 'Por saca',
  spread: 'Spread',
};

const brokeragePayerLabels: Record<BrokeragePayer, string> = {
  seller: 'Vendedor',
  buyer: 'Comprador',
};

const profileSegmentOptions: Record<User['type'], Array<{ value: string; label: string }>> = {
  comprador: [
    { value: 'industria', label: 'Industria' },
    { value: 'trading', label: 'Trading' },
    { value: 'distribuidora', label: 'Distribuidora' },
    { value: 'granja', label: 'Granja' },
    { value: 'exportadora', label: 'Exportadora' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'cerealista', label: 'Cerealista' },
    { value: 'esmagadora', label: 'Esmagadora' },
    { value: 'nutricao_animal', label: 'Nutricao animal' },
    { value: 'outros', label: 'Outros' },
  ],
  vendedor: [
    { value: 'produtor_rural', label: 'Produtor rural' },
    { value: 'fazenda', label: 'Fazenda' },
    { value: 'silos', label: 'Silos' },
    { value: 'armazens', label: 'Armazens' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'originador', label: 'Originador' },
    { value: 'revenda', label: 'Revenda' },
    { value: 'trading', label: 'Trading' },
    { value: 'outros', label: 'Outros' },
  ],
  corretor: [
    { value: 'autonomo', label: 'Autonomo' },
    { value: 'empresa_corretora', label: 'Empresa corretora' },
    { value: 'mesa_corretora', label: 'Mesa corretora' },
  ],
  backoffice: [],
};

const userRoleOptions: Array<{ value: User['type']; label: string }> = [
  { value: 'corretor', label: 'Corretor' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'backoffice', label: 'Backoffice' },
];

const grainOptions = ['Soja', 'Milho', 'Sorgo'] as const;
const unitOptions = ['Sacas', 'Toneladas'] as const;
const shippingOptions: Offer['shipping'][] = ['FOB', 'CIF'];
const offerChannelOptions: Offer['negotiationChannel'][] = ['mesa', 'direta'];
const mesaCommissionOptions = ['0.50', '1.00', '1.50', '2.00', '2.50', '3.00', '3.50', '4.00', '4.50', '5.00'] as const;
const documentTypeOptions = [
  { value: '', label: 'Nao informar' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
];

function createEmptyUserForm(type: User['type'] = 'corretor'): UserFormState {
  return {
    type,
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    legal_name: '',
    profile_segment: '',
    document_type: '',
    document_number: '',
    state_registration: '',
    address_zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    address_country: 'Brasil',
    document_notes: '',
  };
}

function createEmptyOfferForm(): OfferFormState {
  return {
    userId: '',
    type: 'venda',
    grain: 'Soja',
    quantity: '',
    unit: 'Sacas',
    price: '',
    location: '',
    crop: '',
    shipping: 'FOB',
    negotiationChannel: 'mesa',
    mesaCommission: '1.00',
    nonGmo: false,
    deliveryWindow: '',
    qualityStandard: '',
    qualityNotes: '',
    observations: '',
    funrural: 'A definir na negociacao',
    paymentTerms: '',
  };
}

function createEmptyMatchForm(): MatchFormState {
  return {
    sellOfferId: '',
    buyOfferId: '',
    brokerageMode: 'per_sack',
    brokerageValue: '1.00',
    brokeragePayer: 'seller',
  };
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  if ('detail' in payload && typeof payload.detail === 'string') {
    return payload.detail;
  }

  const firstValue = Object.values(payload as Record<string, unknown>)[0];
  if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
    return firstValue[0];
  }

  return fallback;
}

function findUserById(users: User[], id: number) {
  return users.find((user) => user.id === id) || null;
}

function findOfferById(offers: Offer[], id: number) {
  return offers.find((offer) => offer.id === id) || null;
}

function getBrokerageRuleLabel(negotiation: Negotiation) {
  if (negotiation.brokerageMode === 'fixed') {
    return `${formatCurrency(negotiation.brokerageValue)} em valor fixo`;
  }

  if (negotiation.brokerageMode === 'spread') {
    return `${formatCurrency(negotiation.brokerageValue)} por saca em spread`;
  }

  if (negotiation.brokerageMode === 'per_sack') {
    return `${formatCurrency(negotiation.brokerageValue)} por saca`;
  }

  return `${formatNumber(negotiation.brokeragePercentage)}% sobre a operacao`;
}

function SummaryCard({
  label,
  value,
  detail,
  tone = 'emerald',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'emerald' | 'amber' | 'slate' | 'sky';
}) {
  const toneClasses = {
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
    slate: 'border-slate-200',
    sky: 'border-sky-200',
  } as const;

  const accentClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-500',
    sky: 'bg-sky-500',
  } as const;

  return (
    <article className={`rounded-xl border bg-white p-3 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`h-2 w-2 rounded-sm ${accentClasses[tone]}`} />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <p className="text-[11px] font-medium text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default function BackofficePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser<User>();
  const [activeTab, setActiveTab] = useState<BackofficeTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserFilter>('todos');
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyUserForm());
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userDeletingId, setUserDeletingId] = useState<number | null>(null);
  const [userValidatingId, setUserValidatingId] = useState<number | null>(null);
  const [userError, setUserError] = useState('');
  const [userNotice, setUserNotice] = useState('');

  const [offerSearch, setOfferSearch] = useState('');
  const [offerTypeFilter, setOfferTypeFilter] = useState<'todos' | Offer['type']>('todos');
  const [offerStatusFilter, setOfferStatusFilter] = useState<'todos' | Offer['status']>('todos');
  const [offerChannelFilter, setOfferChannelFilter] = useState<'todos' | Offer['negotiationChannel']>('todos');
  const [offerForm, setOfferForm] = useState<OfferFormState>(createEmptyOfferForm());
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerDeletingId, setOfferDeletingId] = useState<number | null>(null);
  const [offerError, setOfferError] = useState('');
  const [offerNotice, setOfferNotice] = useState('');

  const [matchForm, setMatchForm] = useState<MatchFormState>(createEmptyMatchForm());
  const [negotiationSearch, setNegotiationSearch] = useState('');
  const [negotiationStatusFilter, setNegotiationStatusFilter] = useState<'todos' | Negotiation['status']>('todos');
  const [matchSaving, setMatchSaving] = useState(false);
  const [negotiationSavingId, setNegotiationSavingId] = useState<number | null>(null);
  const [negotiationDeletingId, setNegotiationDeletingId] = useState<number | null>(null);
  const [negotiationError, setNegotiationError] = useState('');
  const [negotiationNotice, setNegotiationNotice] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setPageError('');

      try {
        const [usersResponse, offersResponse, negotiationsResponse] = await Promise.all([
          apiFetch('/users'),
          apiFetch('/offers?all=true'),
          apiFetch('/negotiations'),
        ]);

        const usersPayload = (await usersResponse.json().catch(() => null)) as User[] | { detail?: string } | null;
        const offersPayload = (await offersResponse.json().catch(() => null)) as Offer[] | { detail?: string } | null;
        const negotiationsPayload = (await negotiationsResponse.json().catch(() => null)) as
          | Negotiation[]
          | { detail?: string }
          | null;

        if (!usersResponse.ok || !Array.isArray(usersPayload)) {
          throw new Error(extractErrorMessage(usersPayload, 'Nao foi possivel carregar os usuarios do backoffice.'));
        }
        if (!offersResponse.ok || !Array.isArray(offersPayload)) {
          throw new Error(extractErrorMessage(offersPayload, 'Nao foi possivel carregar as ofertas do backoffice.'));
        }
        if (!negotiationsResponse.ok || !Array.isArray(negotiationsPayload)) {
          throw new Error(extractErrorMessage(negotiationsPayload, 'Nao foi possivel carregar as negociacoes do backoffice.'));
        }

        setUsers(usersPayload);
        setOffers(offersPayload);
        setNegotiations(negotiationsPayload);

        const defaultOfferOwner = usersPayload.find((user) => user.type !== 'backoffice');
        setOfferForm((current) => ({
          ...current,
          userId: current.userId || (defaultOfferOwner ? String(defaultOfferOwner.id) : ''),
        }));
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Erro inesperado ao carregar o backoffice.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.type !== 'backoffice') {
    return <Navigate to={currentUser.type === 'corretor' ? OPERATIONS_PATH : '/dashboard'} replace />;
  }

  const loadData = async () => {
    setRefreshing(true);
    setPageError('');

    try {
      const [usersResponse, offersResponse, negotiationsResponse] = await Promise.all([
        apiFetch('/users'),
        apiFetch('/offers?all=true'),
        apiFetch('/negotiations'),
      ]);

      const usersPayload = (await usersResponse.json().catch(() => null)) as User[] | { detail?: string } | null;
      const offersPayload = (await offersResponse.json().catch(() => null)) as Offer[] | { detail?: string } | null;
      const negotiationsPayload = (await negotiationsResponse.json().catch(() => null)) as
        | Negotiation[]
        | { detail?: string }
        | null;

      if (!usersResponse.ok || !Array.isArray(usersPayload)) {
        throw new Error(extractErrorMessage(usersPayload, 'Nao foi possivel sincronizar os usuarios.'));
      }
      if (!offersResponse.ok || !Array.isArray(offersPayload)) {
        throw new Error(extractErrorMessage(offersPayload, 'Nao foi possivel sincronizar as ofertas.'));
      }
      if (!negotiationsResponse.ok || !Array.isArray(negotiationsPayload)) {
        throw new Error(extractErrorMessage(negotiationsPayload, 'Nao foi possivel sincronizar as negociacoes.'));
      }

      setUsers(usersPayload);
      setOffers(offersPayload);
      setNegotiations(negotiationsPayload);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Erro inesperado ao sincronizar o backoffice.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const totalUsers = users.length;
  const sellerUsers = users.filter((user) => user.type === 'vendedor').length;
  const buyerUsers = users.filter((user) => user.type === 'comprador').length;
  const brokerUsers = users.filter((user) => user.type === 'corretor');
  const pendingValidationUsers = users.filter((user) => user.is_validated === false);
  const activeOffers = offers.filter((offer) => offer.status === 'ativa');
  const pendingOffers = offers.filter((offer) => offer.status === 'aguardando_pagamento');
  const deskOffers = offers.filter((offer) => offer.negotiationChannel === 'mesa');
  const directOffers = offers.filter((offer) => offer.negotiationChannel === 'direta');
  const pendingNegotiations = negotiations.filter((negotiation) => negotiation.status === 'pendente');
  const acceptedNegotiations = negotiations.filter((negotiation) => negotiation.status === 'aceita');
  const totalBrokerage = negotiations.reduce((total, negotiation) => total + Number(negotiation.brokerageFee || 0), 0);
  const pendingBrokerage = pendingNegotiations.reduce((total, negotiation) => total + Number(negotiation.brokerageFee || 0), 0);
  const acceptedBrokerage = acceptedNegotiations.reduce((total, negotiation) => total + Number(negotiation.brokerageFee || 0), 0);

  const brokerSummaries = brokerUsers
    .map((broker) => {
      const brokerNegotiations = negotiations.filter((negotiation) => negotiation.brokerId === broker.id);
      const brokerPending = brokerNegotiations.filter((negotiation) => negotiation.status === 'pendente');
      const brokerAccepted = brokerNegotiations.filter((negotiation) => negotiation.status === 'aceita');
      const grossPending = brokerPending.reduce((total, negotiation) => total + Number(negotiation.brokerageFee || 0), 0);
      const grossAccepted = brokerAccepted.reduce((total, negotiation) => total + Number(negotiation.brokerageFee || 0), 0);

      return {
        broker,
        totalNegotiations: brokerNegotiations.length,
        grossPending,
        grossAccepted,
        estimatedPending: grossPending * 0.3,
        estimatedAccepted: grossAccepted * 0.3,
      };
    })
    .sort((first, second) => second.grossAccepted - first.grossAccepted);

  const recentUsers = [...users].sort((first, second) => second.id - first.id).slice(0, 6);
  const recentOffers = [...offers].slice(0, 6);

  const visibleUsers = users.filter((user) => {
    if (userRoleFilter === 'novos' && user.is_validated !== false) {
      return false;
    }
    if (userRoleFilter !== 'todos' && userRoleFilter !== 'novos' && user.type !== userRoleFilter) {
      return false;
    }

    const haystack = `${user.name} ${user.email} ${user.company || ''} ${roleLabels[user.type]}`.toLowerCase();
    return haystack.includes(userSearch.trim().toLowerCase());
  });

  const visibleOffers = offers.filter((offer) => {
    if (offerTypeFilter !== 'todos' && offer.type !== offerTypeFilter) {
      return false;
    }
    if (offerStatusFilter !== 'todos' && offer.status !== offerStatusFilter) {
      return false;
    }
    if (offerChannelFilter !== 'todos' && offer.negotiationChannel !== offerChannelFilter) {
      return false;
    }

    const owner = findUserById(users, offer.userId);
    const haystack = `${offer.grain} ${offer.location} ${offer.crop} ${owner?.name || ''} ${owner?.email || ''}`.toLowerCase();
    return haystack.includes(offerSearch.trim().toLowerCase());
  });

  const visibleNegotiations = negotiations.filter((negotiation) => {
    if (negotiationStatusFilter !== 'todos' && negotiation.status !== negotiationStatusFilter) {
      return false;
    }

    const buyer = findUserById(users, negotiation.buyerId);
    const seller = findUserById(users, negotiation.sellerId);
    const broker = findUserById(users, negotiation.brokerId);
    const haystack =
      `${buyer?.name || ''} ${seller?.name || ''} ${broker?.name || ''} ${negotiationModeLabels[negotiation.brokerageMode || 'percentage']}`.toLowerCase();
    return haystack.includes(negotiationSearch.trim().toLowerCase());
  });

  const offerOwnerOptions = users
    .filter((user) => user.type !== 'backoffice')
    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));

  const activeSellOffers = activeOffers.filter((offer) => offer.type === 'venda');
  const activeBuyOffers = activeOffers.filter((offer) => offer.type === 'compra');
  const selectedSellOffer = matchForm.sellOfferId ? findOfferById(offers, Number(matchForm.sellOfferId)) : null;
  const selectedBuyOffer = matchForm.buyOfferId ? findOfferById(offers, Number(matchForm.buyOfferId)) : null;
  const lockedCommissionOffer = [selectedSellOffer, selectedBuyOffer].find(
    (offer) => offer && (offer.negotiationChannel === 'mesa' || offer.exclusiveBrokerId != null) && offer.mesaCommission != null,
  );
  const activeTabInfo = tabDescriptions[activeTab];
  const tabMetrics: Record<BackofficeTab, string> = {
    overview: 'KPIs da operacao',
    users: `${formatNumber(totalUsers)} cadastros`,
    offers: `${formatNumber(offers.length)} oportunidades`,
    negotiations: `${formatNumber(negotiations.length)} negociacoes`,
  };
  const totalPipelineItems = Math.max(totalUsers + activeOffers.length + negotiations.length, 1);
  const crmPipeline = [
    {
      label: 'Contas cadastradas',
      value: totalUsers,
      detail: `${formatNumber(sellerUsers + buyerUsers)} clientes e ${formatNumber(brokerUsers.length)} corretores`,
    },
    {
      label: 'Livro ativo',
      value: activeOffers.length,
      detail: `${formatNumber(deskOffers.length)} mesa, ${formatNumber(directOffers.length)} diretas`,
    },
    {
      label: 'Negociacao em follow-up',
      value: pendingNegotiations.length,
      detail: formatCurrency(pendingBrokerage),
    },
    {
      label: 'Ganho confirmado',
      value: acceptedNegotiations.length,
      detail: formatCurrency(acceptedBrokerage),
    },
  ];
  const crmActionItems = [
    {
      label: 'Validar novos acessos',
      value: pendingValidationUsers.length,
      detail: 'cadastros aguardando liberacao',
    },
    {
      label: 'Revisar pagamentos PIX',
      value: pendingOffers.length,
      detail: 'ofertas aguardando liberacao',
    },
    {
      label: 'Priorizar follow-up comercial',
      value: pendingNegotiations.length,
      detail: 'negociacoes pendentes',
    },
    {
      label: 'Atualizar base de corretores',
      value: brokerUsers.length,
      detail: 'perfis com comissao monitorada',
    },
  ];
  const sidebarMetrics = [
    { label: 'Usuarios', value: formatNumber(totalUsers), detail: 'base cadastrada' },
    { label: 'Livro ativo', value: formatNumber(activeOffers.length), detail: 'oportunidades abertas' },
    { label: 'Follow-up', value: formatNumber(pendingNegotiations.length), detail: 'negociacoes pendentes' },
    { label: 'Receita', value: formatCurrency(acceptedBrokerage), detail: 'corretagem aceita' },
  ];
  const sidebarIndicators = [
    { label: 'Validacao', value: formatNumber(pendingValidationUsers.length) },
    { label: 'PIX pendente', value: formatNumber(pendingOffers.length) },
    { label: 'Corretores', value: formatNumber(brokerUsers.length) },
    { label: 'Mesa', value: formatNumber(deskOffers.length) },
  ];
  const viewingUserDetails = viewingUser
    ? [
        { label: 'Nome', value: viewingUser.name || 'Nao informado' },
        { label: 'E-mail', value: viewingUser.email || 'Nao informado' },
        { label: 'Perfil', value: roleLabels[viewingUser.type] },
        { label: 'Status de login', value: viewingUser.is_validated === false ? 'Pendente validacao' : 'Login liberado' },
        { label: 'Telefone / WhatsApp', value: viewingUser.phone || 'Nao informado' },
        { label: 'Empresa', value: viewingUser.company || 'Nao informado' },
        { label: 'Razao social', value: viewingUser.legal_name || 'Nao informado' },
        { label: 'Categoria', value: viewingUser.profile_segment ? viewingUser.profile_segment.replaceAll('_', ' ') : 'Nao informado' },
        { label: 'Documento', value: viewingUser.document_type ? viewingUser.document_type.toUpperCase() : 'Nao informado' },
        { label: 'Numero do documento', value: viewingUser.document_number || 'Nao informado' },
        { label: 'Inscricao estadual', value: viewingUser.state_registration || 'Nao informado' },
        { label: 'CEP', value: viewingUser.address_zip_code || 'Nao informado' },
        {
          label: 'Endereco',
          value: [viewingUser.address_street, viewingUser.address_number, viewingUser.address_district].filter(Boolean).join(', ') || 'Nao informado',
        },
        { label: 'Cidade / UF', value: [viewingUser.address_city, viewingUser.address_state].filter(Boolean).join(' / ') || 'Nao informado' },
        { label: 'Aceite contrato', value: viewingUser.terms_accepted_at ? formatDateTime(viewingUser.terms_accepted_at) : 'Nao registrado' },
        { label: 'Aceite LGPD', value: viewingUser.privacy_accepted_at ? formatDateTime(viewingUser.privacy_accepted_at) : 'Nao registrado' },
        { label: 'Versao legal', value: viewingUser.legal_version || 'Nao registrada' },
      ]
    : [];

  const handleSelectTab = (tab: BackofficeTab) => {
    setActiveTab(tab);
    setViewingUser(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderManagerSidebar = () => (
    <div className="flex h-full flex-col p-3">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center justify-between gap-2">
          <BrandLogo className="h-9" width={240} height={240} />
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Manager</span>
            <button
              type="button"
              onClick={() => setDesktopSidebarVisible(false)}
              className="hidden items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 lg:inline-flex"
            >
              <X className="h-3.5 w-3.5" />
              Ocultar
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Conta ativa</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">{currentUser.name || currentUser.email}</p>
          <p className="truncate text-[11px] text-slate-500">{currentUser.email}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Gerenciador</p>
        <nav className="mt-2 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    active ? 'bg-white/10 text-emerald-300' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{tab.label}</span>
                  <span className={`mt-0.5 block text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{tabMetrics[tab.id]}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Resumo</p>
        <div className="mt-2 grid gap-2">
          {sidebarMetrics.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{item.detail}</p>
                </div>
                <p className="text-sm font-semibold text-slate-950">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Indicadores</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {sidebarIndicators.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[11px] text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Acoes</p>
        <div className="mt-2 grid gap-1.5">
          <Link
            to={HOME_PATH}
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center justify-between border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Home
            <Home className="h-4 w-4" />
          </Link>
          <Link
            to={OPERATIONS_PATH}
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center justify-between border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Mesa de negociacao
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/perfil"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center justify-between border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Meu perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={refreshing}
            className="inline-flex items-center justify-between border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Sincronizar
          </button>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">Rota</p>
          <p className="mt-1 break-all text-[11px] font-semibold text-slate-800">{BACKOFFICE_PATH}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  const handleUserRoleChange = (role: User['type']) => {
    setUserForm((current) => ({
      ...current,
      type: role,
      profile_segment: profileSegmentOptions[role].some((option) => option.value === current.profile_segment) ? current.profile_segment : '',
    }));
  };

  const handleEditUser = (user: User) => {
    setActiveTab('users');
    setViewingUser(null);
    setEditingUserId(user.id);
    setUserError('');
    setUserNotice('');
    setUserForm({
      type: user.type,
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      company: user.company || '',
      legal_name: user.legal_name || '',
      profile_segment: user.profile_segment || '',
      document_type: user.document_type || '',
      document_number: user.document_number || '',
      state_registration: user.state_registration || '',
      address_zip_code: user.address_zip_code || '',
      address_street: user.address_street || '',
      address_number: user.address_number || '',
      address_complement: user.address_complement || '',
      address_district: user.address_district || '',
      address_city: user.address_city || '',
      address_state: user.address_state || '',
      address_country: user.address_country || 'Brasil',
      document_notes: user.document_notes || '',
    });
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(createEmptyUserForm());
    setUserError('');
    setUserNotice('');
  };

  const handleSaveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserSaving(true);
    setUserError('');
    setUserNotice('');

    if (!editingUserId && !userForm.password.trim()) {
      setUserError('Informe uma senha inicial para o novo cadastro.');
      setUserSaving(false);
      return;
    }

    try {
      const response = await apiFetch(editingUserId ? `/users/${editingUserId}` : '/users', {
        method: editingUserId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          type: userForm.type,
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password.trim() || undefined,
          phone: userForm.phone.trim(),
          company: userForm.company.trim(),
          legal_name: userForm.legal_name.trim(),
          profile_segment: userForm.profile_segment.trim(),
          document_type: userForm.document_type.trim(),
          document_number: userForm.document_number.trim(),
          state_registration: userForm.state_registration.trim(),
          address_zip_code: userForm.address_zip_code.trim(),
          address_street: userForm.address_street.trim(),
          address_number: userForm.address_number.trim(),
          address_complement: userForm.address_complement.trim(),
          address_district: userForm.address_district.trim(),
          address_city: userForm.address_city.trim(),
          address_state: userForm.address_state.trim(),
          address_country: userForm.address_country.trim() || 'Brasil',
          document_notes: userForm.document_notes.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;
      if (!response.ok || !payload || !('email' in payload)) {
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel salvar o cadastro.'));
      }

      setEditingUserId(payload.id);
      setUserForm((current) => ({
        ...current,
        password: '',
        name: payload.name || '',
        email: payload.email || '',
        phone: payload.phone || '',
        company: payload.company || '',
        legal_name: payload.legal_name || '',
        profile_segment: payload.profile_segment || '',
        document_type: payload.document_type || '',
        document_number: payload.document_number || '',
        state_registration: payload.state_registration || '',
        address_zip_code: payload.address_zip_code || '',
        address_street: payload.address_street || '',
        address_number: payload.address_number || '',
        address_complement: payload.address_complement || '',
        address_district: payload.address_district || '',
        address_city: payload.address_city || '',
        address_state: payload.address_state || '',
        address_country: payload.address_country || 'Brasil',
        document_notes: payload.document_notes || '',
      }));
      setUserNotice(editingUserId ? 'Cadastro atualizado com sucesso.' : 'Cadastro criado com sucesso.');
      await loadData();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Erro inesperado ao salvar o cadastro.');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      setUserError('Nao e recomendado remover o proprio usuario de backoffice em uso.');
      return;
    }

    if (!window.confirm(`Remover o cadastro de ${user.name}?`)) {
      return;
    }

    setUserDeletingId(user.id);
    setUserError('');
    setUserNotice('');

    try {
      const response = await apiFetch(`/users/${user.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel remover o usuario.'));
      }

      if (editingUserId === user.id) {
        resetUserForm();
      }
      if (viewingUser?.id === user.id) {
        setViewingUser(null);
      }
      setUserNotice('Cadastro removido com sucesso.');
      await loadData();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Erro inesperado ao remover o usuario.');
    } finally {
      setUserDeletingId(null);
    }
  };

  const handleValidateUser = async (user: User) => {
    if (user.is_validated !== false) {
      return;
    }

    setUserValidatingId(user.id);
    setUserError('');
    setUserNotice('');

    try {
      const response = await apiFetch(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_validated: true }),
      });

      const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;
      if (!response.ok || !payload || !('email' in payload)) {
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel validar o cadastro.'));
      }

      setUserNotice(`Login liberado para ${payload.name}.`);
      await loadData();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Erro inesperado ao validar o cadastro.');
    } finally {
      setUserValidatingId(null);
    }
  };

  const handleSaveOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOfferSaving(true);
    setOfferError('');
    setOfferNotice('');

    if (!offerForm.userId) {
      setOfferError('Selecione o usuario responsavel pelo cadastro.');
      setOfferSaving(false);
      return;
    }

    try {
      const response = await apiFetch('/offers', {
        method: 'POST',
        body: JSON.stringify({
          userId: Number(offerForm.userId),
          type: offerForm.type,
          grain: offerForm.grain,
          quantity: Number(offerForm.quantity),
          unit: offerForm.unit,
          price: Number(offerForm.price),
          location: offerForm.location.trim(),
          crop: offerForm.crop.trim(),
          shipping: offerForm.shipping,
          negotiationChannel: offerForm.negotiationChannel,
          mesaCommission: offerForm.negotiationChannel === 'mesa' ? Number(offerForm.mesaCommission) : null,
          quality: {
            nonGmo: offerForm.nonGmo ? true : undefined,
            deliveryWindow: offerForm.deliveryWindow.trim() || undefined,
            standard: offerForm.qualityStandard.trim() || undefined,
            notes: offerForm.qualityNotes.trim() || undefined,
            observations: offerForm.observations.trim() || undefined,
            funrural: offerForm.type === 'venda' ? offerForm.funrural.trim() || undefined : undefined,
          },
          paymentTerms: offerForm.paymentTerms.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as Offer | { detail?: string } | null;
      if (!response.ok || !payload || !('id' in payload)) {
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel cadastrar a oportunidade.'));
      }

      setOfferNotice(
        payload.status === 'aguardando_pagamento'
          ? 'Oferta criada com sucesso e marcada como aguardando PIX.'
          : 'Oportunidade cadastrada com sucesso.',
      );
      setOfferForm((current) => ({
        ...createEmptyOfferForm(),
        type: current.type,
        userId: current.userId,
      }));
      await loadData();
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Erro inesperado ao cadastrar a oportunidade.');
    } finally {
      setOfferSaving(false);
    }
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (!window.confirm(`Remover a ${offerTypeLabels[offer.type].toLowerCase()} ${offer.id}?`)) {
      return;
    }

    setOfferDeletingId(offer.id);
    setOfferError('');
    setOfferNotice('');

    try {
      const response = await apiFetch(`/offers/${offer.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel remover a oportunidade.'));
      }

      setOfferNotice('Oportunidade removida com sucesso.');
      await loadData();
    } catch (error) {
      setOfferError(error instanceof Error ? error.message : 'Erro inesperado ao remover a oportunidade.');
    } finally {
      setOfferDeletingId(null);
    }
  };

  const handleCreateMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMatchSaving(true);
    setNegotiationError('');
    setNegotiationNotice('');

    if (!matchForm.sellOfferId || !matchForm.buyOfferId) {
      setNegotiationError('Selecione uma oferta de venda e uma demanda de compra para criar o match.');
      setMatchSaving(false);
      return;
    }

    try {
      const payload: Record<string, number | string> = {
        buyOfferId: Number(matchForm.buyOfferId),
        sellOfferId: Number(matchForm.sellOfferId),
        brokerageMode: matchForm.brokerageMode,
        brokeragePayer: matchForm.brokeragePayer,
      };

      if (matchForm.brokerageMode === 'percentage') {
        payload.brokeragePercentage = Number(matchForm.brokerageValue);
      } else if (matchForm.brokerageMode === 'fixed' || matchForm.brokerageMode === 'per_sack') {
        payload.brokerageValue = Number(matchForm.brokerageValue);
      }

      const response = await apiFetch('/negotiations/match', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const responsePayload = (await response.json().catch(() => null)) as Negotiation | { detail?: string } | null;
      if (!response.ok || !responsePayload || !('id' in responsePayload)) {
        throw new Error(extractErrorMessage(responsePayload, 'Nao foi possivel criar o match.'));
      }

      setNegotiationNotice('Match criado com sucesso.');
      setMatchForm(createEmptyMatchForm());
      await loadData();
    } catch (error) {
      setNegotiationError(error instanceof Error ? error.message : 'Erro inesperado ao criar o match.');
    } finally {
      setMatchSaving(false);
    }
  };

  const handleUpdateNegotiationStatus = async (negotiationId: number, status: Negotiation['status']) => {
    setNegotiationSavingId(negotiationId);
    setNegotiationError('');
    setNegotiationNotice('');

    try {
      const response = await apiFetch(`/negotiations/${negotiationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json().catch(() => null)) as Negotiation | { detail?: string } | null;
      if (!response.ok || !payload || !('id' in payload)) {
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel atualizar a negociacao.'));
      }

      setNegotiationNotice(`Negociacao atualizada para ${negotiationStatusLabels[status].toLowerCase()}.`);
      await loadData();
    } catch (error) {
      setNegotiationError(error instanceof Error ? error.message : 'Erro inesperado ao atualizar a negociacao.');
    } finally {
      setNegotiationSavingId(null);
    }
  };

  const handleDeleteNegotiation = async (negotiationId: number) => {
    if (!window.confirm('Remover esta negociacao?')) {
      return;
    }

    setNegotiationDeletingId(negotiationId);
    setNegotiationError('');
    setNegotiationNotice('');

    try {
      const response = await apiFetch(`/negotiations/${negotiationId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, 'Nao foi possivel remover a negociacao.'));
      }

      setNegotiationNotice('Negociacao removida com sucesso.');
      await loadData();
    } catch (error) {
      setNegotiationError(error instanceof Error ? error.message : 'Erro inesperado ao remover a negociacao.');
    } finally {
      setNegotiationDeletingId(null);
    }
  };

  return (
    <div className="backoffice-crm backoffice-font-scale min-h-screen bg-[#f5f7f9] text-slate-900">
      <div className="mx-auto max-w-[1540px] px-3 py-4 sm:px-5 lg:px-6">
        <div className={`grid gap-3 ${desktopSidebarVisible ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)]'}`}>
          <aside
            className={`hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] ${
              desktopSidebarVisible ? 'lg:block' : 'lg:hidden'
            }`}
          >
            {renderManagerSidebar()}
          </aside>

          {mobileMenuOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do gerenciador do backoffice">
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-slate-950/45"
              />
              <aside className="relative h-full w-[min(88vw,340px)] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl shadow-slate-950/25">
                <div className="absolute right-3 top-3 z-10">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                    aria-label="Fechar menu do gerenciador"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renderManagerSidebar()}
              </aside>
            </div>
          ) : null}

          <div className="min-w-0 space-y-3 [&_a.inline-flex]:rounded-lg [&_a.inline-flex]:font-medium [&_a.inline-flex]:normal-case [&_a.inline-flex]:tracking-normal [&_a.inline-flex]:shadow-none [&_button.inline-flex]:rounded-lg [&_button.inline-flex]:font-medium [&_button.inline-flex]:normal-case [&_button.inline-flex]:tracking-normal [&_button.inline-flex]:shadow-none [&_form_label>span]:text-xs [&_form_label>span]:font-medium [&_form_label>span]:normal-case [&_form_label>span]:tracking-normal [&_form_label>span]:text-slate-600 [&_input]:rounded-lg [&_input]:border-slate-300 [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_select]:rounded-lg [&_select]:border-slate-300 [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_textarea]:rounded-lg [&_textarea]:border-slate-300 [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
                    aria-label="Abrir menu do gerenciador"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>Gerenciador de backoffice</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{tabs.find((tab) => tab.id === activeTab)?.label}</span>
                    </div>
                    <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{activeTabInfo.title}</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">{activeTabInfo.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={HOME_PATH}
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </Link>
                  <Link
                    to={OPERATIONS_PATH}
                    className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Mesa de negociacao
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {!desktopSidebarVisible ? (
                    <button
                      type="button"
                      onClick={() => setDesktopSidebarVisible(true)}
                      className="hidden items-center justify-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 lg:inline-flex"
                    >
                      <Menu className="h-4 w-4" />
                      Mostrar menu
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void loadData()}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Base de usuarios',
                  value: formatNumber(users.length),
                  detail: `${formatNumber(pendingValidationUsers.length)} novo(s) aguardando validacao`,
                },
                {
                  label: 'Livro comercial',
                  value: formatNumber(activeOffers.length),
                  detail: `${formatNumber(deskOffers.length)} mesa / ${formatNumber(directOffers.length)} diretas`,
                },
                {
                  label: 'Negociacoes abertas',
                  value: formatNumber(pendingNegotiations.length),
                  detail: `${formatCurrency(pendingBrokerage)} em corretagem pendente`,
                },
                {
                  label: 'Receita aceita',
                  value: formatCurrency(acceptedBrokerage),
                  detail: `${formatNumber(acceptedNegotiations.length)} negociacao(oes) aceitas`,
                },
              ].map((item) => (
                <article key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </article>
              ))}
            </section>

            {loading ? (
              <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/80">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
                <span className="text-sm font-semibold text-slate-700">Carregando o backoffice...</span>
              </div>
            ) : (
              <>
                {pageError ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{pageError}</span>
                  </div>
                ) : null}

            {activeTab === 'overview' ? (
              <section className="space-y-3 [&_section]:rounded-xl [&_section]:border-slate-200 [&_section]:bg-white [&_section]:shadow-sm [&_section]:shadow-slate-200/70">
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className="border bg-white p-4">
                    <SectionTitle
                      eyebrow="Pipeline CRM"
                      title="Funil comercial do backoffice"
                      description="Leitura operacional das contas, oportunidades, follow-ups e ganhos confirmados."
                    />

                    <div className="mt-4 space-y-3">
                      {crmPipeline.map((stage, index) => (
                        <article key={stage.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">{stage.label}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{stage.detail}</p>
                            </div>
                            <p className="text-lg font-semibold text-slate-950">{formatNumber(stage.value)}</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                            <div
                              className={`h-full rounded-full ${index === 2 ? 'bg-amber-500' : index === 3 ? 'bg-emerald-500' : 'bg-slate-900'}`}
                              style={{ width: `${Math.max(8, Math.round((stage.value / totalPipelineItems) * 100))}%` }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="border bg-white p-4">
                    <SectionTitle
                      eyebrow="Fila de trabalho"
                      title="Acoes prioritarias"
                      description="Itens que ajudam o backoffice a agir como CRM: cobrar pendencias, nutrir follow-up e manter a base limpa."
                    />

                    <div className="mt-4 space-y-3">
                      {crmActionItems.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-900">{formatNumber(item.value)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2">
                      <Link
                        to={OPERATIONS_PATH}
                        className="inline-flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 hover:bg-white"
                      >
                        Abrir mesa operacional
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('users');
                          resetUserForm();
                        }}
                        className="inline-flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 hover:bg-white"
                      >
                        Novo cadastro
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('offers')}
                        className="inline-flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 hover:bg-white"
                      >
                        Nova oportunidade
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="border bg-white p-4">
                    <SectionTitle
                      eyebrow="Contas recentes"
                      title="Ultimos cadastros"
                      description="Lista rapida para revisar dados de relacionamento e ajustar perfis."
                    />

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                      {recentUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="flex w-full items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 text-left last:border-b-0 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                          <span className="shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {roleLabels[user.type]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="border bg-white p-4">
                    <SectionTitle
                      eyebrow="Receita por corretor"
                      title="Comissao consolidada"
                      description="Resumo de performance dos corretores, com estimativa de repasse pela regra atual."
                    />

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                      {brokerSummaries.slice(0, 4).map((summary) => (
                        <article key={summary.broker.id} className="border-b border-slate-200 bg-white px-3 py-3 last:border-b-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">{summary.broker.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatNumber(summary.totalNegotiations)} negociacoes</p>
                            </div>
                            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(summary.estimatedAccepted)}</p>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs text-slate-500">Bruta aceita</p>
                              <p className="text-sm font-semibold text-slate-950">{formatCurrency(summary.grossAccepted)}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs text-slate-500">Estimativa 30%</p>
                              <p className="text-sm font-semibold text-slate-950">{formatCurrency(summary.estimatedAccepted)}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="border bg-white p-4">
                  <SectionTitle
                    eyebrow="Livro recente"
                    title="Ultimas oportunidades"
                    description="Entrada recente de ofertas e demandas para atendimento e auditoria."
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {recentOffers.map((offer) => {
                      const owner = findUserById(users, offer.userId);
                      return (
                        <article key={offer.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              {offerTypeLabels[offer.type]}
                            </span>
                            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              {offerStatusLabels[offer.status]}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-slate-950">
                            {offer.grain} · {formatNumber(offer.quantity)} {offer.unit}
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">{offer.location}</p>
                          <p className="mt-3 text-sm font-medium text-slate-900">{owner?.name || 'Usuario nao localizado'}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatCurrency(offer.price)}</p>
                          <p className="mt-3 text-xs font-medium text-slate-500">
                            {formatDateTime(offer.createdAt)}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </section>
            ) : null}

            {activeTab === 'users' ? (
              <section className="grid gap-4 xl:h-[calc(150vh-330px)] xl:min-h-0 xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch [&_section]:rounded-xl [&_section]:border-slate-200 [&_section]:bg-white [&_section]:p-5 [&_section]:shadow-sm [&_section]:shadow-slate-200/70 [&_article]:rounded-lg [&_article]:border-slate-200 [&_article]:bg-slate-50/70 [&_article]:shadow-none">
                <div className="min-h-0 space-y-6 xl:h-full">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)] xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
                    <SectionTitle
                      eyebrow="Categorias de perfil"
                      title="Cadastro completo de compradores, vendedores, corretores e backoffice"
                      description="Use esta area para criar novos perfis, ajustar informacoes cadastrais, redefinir senha e manter a base de usuarios organizada."
                    />

                    <form onSubmit={handleSaveUser} className="mt-6 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2 custom-scrollbar">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Perfil</span>
                          <select
                            value={userForm.type}
                            onChange={(event) => handleUserRoleChange(event.target.value as User['type'])}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {userRoleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Segmento</span>
                          <select
                            value={userForm.profile_segment}
                            onChange={(event) => setUserForm((current) => ({ ...current, profile_segment: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            <option value="">Selecionar</option>
                            {profileSegmentOptions[userForm.type].map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Nome</span>
                          <input
                            required
                            value={userForm.name}
                            onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">E-mail</span>
                          <input
                            required
                            type="email"
                            value={userForm.email}
                            onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            {editingUserId ? 'Nova senha (opcional)' : 'Senha inicial'}
                          </span>
                          <input
                            type="password"
                            value={userForm.password}
                            onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Telefone</span>
                          <input
                            value={userForm.phone}
                            onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Empresa</span>
                          <input
                            value={userForm.company}
                            onChange={(event) => setUserForm((current) => ({ ...current, company: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Razao social</span>
                          <input
                            value={userForm.legal_name}
                            onChange={(event) => setUserForm((current) => ({ ...current, legal_name: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Documento</span>
                          <select
                            value={userForm.document_type}
                            onChange={(event) => setUserForm((current) => ({ ...current, document_type: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {documentTypeOptions.map((option) => (
                              <option key={option.value || 'empty'} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Numero do documento</span>
                          <input
                            value={userForm.document_number}
                            onChange={(event) => setUserForm((current) => ({ ...current, document_number: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Inscricao estadual</span>
                          <input
                            value={userForm.state_registration}
                            onChange={(event) => setUserForm((current) => ({ ...current, state_registration: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">CEP</span>
                          <input
                            value={userForm.address_zip_code}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_zip_code: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Endereco</span>
                          <input
                            value={userForm.address_street}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_street: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Numero</span>
                          <input
                            value={userForm.address_number}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_number: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Complemento</span>
                          <input
                            value={userForm.address_complement}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_complement: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Bairro</span>
                          <input
                            value={userForm.address_district}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_district: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Cidade</span>
                          <input
                            value={userForm.address_city}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_city: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">UF</span>
                          <input
                            value={userForm.address_state}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_state: event.target.value.toUpperCase() }))}
                            maxLength={2}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pais</span>
                          <input
                            value={userForm.address_country}
                            onChange={(event) => setUserForm((current) => ({ ...current, address_country: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Observacoes documentais</span>
                          <textarea
                            value={userForm.document_notes}
                            onChange={(event) => setUserForm((current) => ({ ...current, document_notes: event.target.value }))}
                            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>
                      </div>

                      {userNotice ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{userNotice}</span>
                        </div>
                      ) : null}

                      {userError ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{userError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="submit"
                          disabled={userSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {userSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {editingUserId ? 'Atualizar cadastro' : 'Criar cadastro'}
                        </button>

                        <button
                          type="button"
                          onClick={resetUserForm}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-50"
                        >
                          Limpar formulario
                        </button>
                      </div>
                    </form>
                  </section>
                </div>

                <div className="min-h-0 space-y-6 xl:h-full">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)] xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:overflow-hidden">
                    <SectionTitle
                      eyebrow="Base de usuarios"
                      title="Pesquisar e editar categorias"
                      description="Filtre a base por tipo de perfil, aprove novos acessos e abra qualquer cadastro para atualizacao imediata."
                    />

                    {pendingValidationUsers.length ? (
                      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>{formatNumber(pendingValidationUsers.length)} cadastro(s) aguardando validacao para liberar login.</span>
                      </div>
                    ) : null}

                    <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_220px]">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Buscar</span>
                        <input
                          value={userSearch}
                          onChange={(event) => setUserSearch(event.target.value)}
                          placeholder="Nome, e-mail ou empresa"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Filtro por perfil</span>
                        <select
                          value={userRoleFilter}
                          onChange={(event) => setUserRoleFilter(event.target.value as UserFilter)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="todos">Todos</option>
                          <option value="novos">Novos</option>
                          {userRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-6 max-h-[930px] min-h-0 overflow-y-auto pr-2 custom-scrollbar xl:max-h-none xl:flex-1">
                      <div className="grid gap-3">
                        {visibleUsers.map((user) => (
                          <article key={user.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-lg font-black text-slate-950">{user.name}</p>
                                <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                    {roleLabels[user.type]}
                                  </span>
                                  <span
                                    className={`rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                                      user.is_validated === false ? 'text-amber-700' : 'text-sky-700'
                                    }`}
                                  >
                                    {user.is_validated === false ? 'Pendente validacao' : 'Login liberado'}
                                  </span>
                                  {user.profile_segment ? (
                                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                                      {user.profile_segment.replaceAll('_', ' ')}
                                    </span>
                                  ) : null}
                                  {user.company ? (
                                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                                      {user.company}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-3 text-sm text-slate-500">
                                  {user.is_validated === false
                                    ? 'Acesso aguardando validacao do backoffice antes do primeiro login.'
                                    : 'Acesso apto para login na plataforma.'}
                                </p>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row">
                                {user.is_validated === false ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleValidateUser(user)}
                                    disabled={userValidatingId === user.id}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {userValidatingId === user.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    Validar login
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setViewingUser(user)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-sky-700 hover:bg-sky-50"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditUser(user)}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900 hover:bg-slate-50"
                                >
                                  <Users2 className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(user)}
                                  disabled={userDeletingId === user.id || user.id === currentUser.id}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {userDeletingId === user.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                        {!visibleUsers.length ? (
                          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                            Nenhum usuario encontrado com os filtros atuais.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
              </section>
            ) : null}

            {viewingUser ? (
              <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
                <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/30">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">Visualizacao do usuario</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950">{viewingUser.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{viewingUser.email}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          {roleLabels[viewingUser.type]}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                            viewingUser.is_validated === false ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {viewingUser.is_validated === false ? 'Pendente validacao' : 'Login liberado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditUser(viewingUser)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900 hover:bg-slate-50"
                      >
                        <Users2 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingUser(null)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-white"
                      >
                        <X className="h-4 w-4" />
                        Fechar
                      </button>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {viewingUserDetails.map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</dt>
                        <dd className="mt-2 break-words text-sm font-semibold text-slate-900">{item.value}</dd>
                      </div>
                    ))}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                      <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Observacoes documentais</dt>
                      <dd className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900">
                        {viewingUser.document_notes || 'Nao informado'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}

            {activeTab === 'offers' ? (
              <section className="flex flex-col gap-4 [&_section]:rounded-xl [&_section]:border-slate-200 [&_section]:bg-white [&_section]:p-5 [&_section]:shadow-sm [&_section]:shadow-slate-200/70 [&_article]:rounded-lg [&_article]:border-slate-200 [&_article]:bg-slate-50/70 [&_article]:shadow-none">
                <div className="order-2 space-y-6">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Criacao assistida"
                      title="Cadastrar oferta ou demanda para qualquer perfil"
                      description="O backoffice pode criar oportunidades em nome de compradores, vendedores e corretores, com regras de mesa, canal direto e comissao no cadastro."
                    />

                    <form onSubmit={handleSaveOffer} className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Responsavel pelo cadastro</span>
                          <select
                            value={offerForm.userId}
                            onChange={(event) => setOfferForm((current) => ({ ...current, userId: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            <option value="">Selecionar usuario</option>
                            {offerOwnerOptions.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} · {roleLabels[user.type]} · {user.email}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Tipo</span>
                          <select
                            value={offerForm.type}
                            onChange={(event) => setOfferForm((current) => ({ ...current, type: event.target.value as Offer['type'] }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            <option value="venda">Oferta de venda</option>
                            <option value="compra">Demanda de compra</option>
                          </select>
                        </label>

                        <div className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Produto</span>
                          <select
                            value={offerForm.grain}
                            onChange={(event) => setOfferForm((current) => ({ ...current, grain: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {grainOptions.map((grain) => (
                              <option key={grain} value={grain}>
                                {grain}
                              </option>
                            ))}
                          </select>
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={offerForm.nonGmo}
                              onChange={(event) => setOfferForm((current) => ({ ...current, nonGmo: event.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Non GMO
                          </label>
                        </div>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Quantidade</span>
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={offerForm.quantity}
                            onChange={(event) => setOfferForm((current) => ({ ...current, quantity: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Unidade</span>
                          <select
                            value={offerForm.unit}
                            onChange={(event) => setOfferForm((current) => ({ ...current, unit: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {unitOptions.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Preco</span>
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={offerForm.price}
                            onChange={(event) => setOfferForm((current) => ({ ...current, price: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Localidade</span>
                          <input
                            required
                            value={offerForm.location}
                            onChange={(event) => setOfferForm((current) => ({ ...current, location: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Safra</span>
                          <input
                            required
                            value={offerForm.crop}
                            onChange={(event) => setOfferForm((current) => ({ ...current, crop: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">FOB ou CIF</span>
                          <select
                            value={offerForm.shipping}
                            onChange={(event) => setOfferForm((current) => ({ ...current, shipping: event.target.value as Offer['shipping'] }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {shippingOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Canal</span>
                          <select
                            value={offerForm.negotiationChannel}
                            onChange={(event) =>
                              setOfferForm((current) => ({
                                ...current,
                                negotiationChannel: event.target.value as Offer['negotiationChannel'],
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            {offerChannelOptions.map((option) => (
                              <option key={option} value={option}>
                                {offerChannelLabels[option]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Comissao da mesa</span>
                          <select
                            value={offerForm.mesaCommission}
                            onChange={(event) => setOfferForm((current) => ({ ...current, mesaCommission: event.target.value }))}
                            disabled={offerForm.negotiationChannel !== 'mesa'}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {mesaCommissionOptions.map((option) => (
                              <option key={option} value={option}>
                                {formatCurrency(option)} por saca
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Janela de entrega</span>
                          <input
                            value={offerForm.deliveryWindow}
                            onChange={(event) => setOfferForm((current) => ({ ...current, deliveryWindow: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Padrao de qualidade</span>
                          <input
                            value={offerForm.qualityStandard}
                            onChange={(event) => setOfferForm((current) => ({ ...current, qualityStandard: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        {offerForm.type === 'venda' ? (
                          <label className="space-y-2 sm:col-span-2">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Funrural</span>
                            <input
                              value={offerForm.funrural}
                              onChange={(event) => setOfferForm((current) => ({ ...current, funrural: event.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                            />
                          </label>
                        ) : null}

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Notas de qualidade</span>
                          <textarea
                            value={offerForm.qualityNotes}
                            onChange={(event) => setOfferForm((current) => ({ ...current, qualityNotes: event.target.value }))}
                            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Observacoes</span>
                          <textarea
                            value={offerForm.observations}
                            onChange={(event) => setOfferForm((current) => ({ ...current, observations: event.target.value }))}
                            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>

                        <label className="space-y-2 sm:col-span-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Condicoes de pagamento</span>
                          <textarea
                            required
                            value={offerForm.paymentTerms}
                            onChange={(event) => setOfferForm((current) => ({ ...current, paymentTerms: event.target.value }))}
                            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          />
                        </label>
                      </div>

                      {offerNotice ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{offerNotice}</span>
                        </div>
                      ) : null}

                      {offerError ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{offerError}</span>
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={offerSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {offerSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                        Cadastrar oportunidade
                      </button>
                    </form>
                  </section>
                </div>

                <div className="order-1 space-y-6">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Livro de oportunidades"
                      title="Pesquisar, auditar e remover ofertas"
                      description="Controle direto sobre ofertas e demandas de toda a plataforma, com recorte por status, tipo e canal."
                    />

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="space-y-2 sm:col-span-2 xl:col-span-1">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Buscar</span>
                        <input
                          value={offerSearch}
                          onChange={(event) => setOfferSearch(event.target.value)}
                          placeholder="Grao, local ou usuario"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Tipo</span>
                        <select
                          value={offerTypeFilter}
                          onChange={(event) => setOfferTypeFilter(event.target.value as 'todos' | Offer['type'])}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="todos">Todos</option>
                          <option value="venda">Venda</option>
                          <option value="compra">Compra</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status</span>
                        <select
                          value={offerStatusFilter}
                          onChange={(event) => setOfferStatusFilter(event.target.value as 'todos' | Offer['status'])}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="todos">Todos</option>
                          <option value="ativa">Ativa</option>
                          <option value="finalizada">Finalizada</option>
                          <option value="aguardando_pagamento">Aguardando PIX</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Canal</span>
                        <select
                          value={offerChannelFilter}
                          onChange={(event) => setOfferChannelFilter(event.target.value as 'todos' | Offer['negotiationChannel'])}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="todos">Todos</option>
                          <option value="mesa">Mesa</option>
                          <option value="direta">Direta</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {visibleOffers.map((offer) => {
                        const owner = findUserById(users, offer.userId);
                        return (
                          <article key={offer.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                    {offerTypeLabels[offer.type]}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                    {offerChannelLabels[offer.negotiationChannel]}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                    {offerStatusLabels[offer.status]}
                                  </span>
                                </div>

                                <p className="mt-4 text-xl font-black text-slate-950">
                                  {offer.grain} · {formatNumber(offer.quantity)} {offer.unit}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">{offer.location}</p>
                                <p className="mt-3 text-sm font-semibold text-slate-900">{formatCurrency(offer.price)}</p>
                                <p className="mt-2 text-sm text-slate-500">
                                  {owner?.name || 'Usuario nao localizado'} · {owner?.email || 'sem e-mail'}
                                </p>
                                {offer.mesaCommission ? (
                                  <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                    Comissao cadastrada: {formatCurrency(offer.mesaCommission)} por saca
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteOffer(offer)}
                                  disabled={offerDeletingId === offer.id}
                                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {offerDeletingId === offer.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  Remover
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </section>
            ) : null}

            {activeTab === 'negotiations' ? (
              <section className="space-y-4 [&_section]:rounded-xl [&_section]:border-slate-200 [&_section]:bg-white [&_section]:p-5 [&_section]:shadow-sm [&_section]:shadow-slate-200/70">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Corretagem pendente"
                    value={formatCurrency(pendingBrokerage)}
                    detail={`${formatNumber(pendingNegotiations.length)} negociacoes ainda abertas`}
                    tone="amber"
                  />
                  <SummaryCard
                    label="Corretagem aceita"
                    value={formatCurrency(acceptedBrokerage)}
                    detail={`${formatNumber(acceptedNegotiations.length)} negociacoes aceitas`}
                    tone="emerald"
                  />
                  <SummaryCard
                    label="Estimativa pendente"
                    value={formatCurrency(pendingBrokerage * 0.3)}
                    detail="Parcela estimada do corretor na regra operacional atual"
                    tone="sky"
                  />
                  <SummaryCard
                    label="Estimativa confirmada"
                    value={formatCurrency(acceptedBrokerage * 0.3)}
                    detail="Valor estimado dos corretores nas negociacoes aceitas"
                    tone="slate"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Novo match"
                      title="Casar oferta de venda com demanda de compra"
                      description="O backoffice pode abrir a negociacao direto daqui ou seguir para a mesa operacional quando precisar do fluxo completo."
                    />

                    <form onSubmit={handleCreateMatch} className="mt-6 space-y-4">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Oferta de venda</span>
                        <select
                          value={matchForm.sellOfferId}
                          onChange={(event) => setMatchForm((current) => ({ ...current, sellOfferId: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="">Selecionar oferta de venda</option>
                          {activeSellOffers.map((offer) => {
                            const owner = findUserById(users, offer.userId);
                            return (
                              <option key={offer.id} value={offer.id}>
                                #{offer.id} · {offer.grain} · {formatNumber(offer.quantity)} {offer.unit} · {owner?.name || 'Sem dono'}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Demanda de compra</span>
                        <select
                          value={matchForm.buyOfferId}
                          onChange={(event) => setMatchForm((current) => ({ ...current, buyOfferId: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="">Selecionar demanda de compra</option>
                          {activeBuyOffers.map((offer) => {
                            const owner = findUserById(users, offer.userId);
                            return (
                              <option key={offer.id} value={offer.id}>
                                #{offer.id} · {offer.grain} · {formatNumber(offer.quantity)} {offer.unit} · {owner?.name || 'Sem dono'}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Modo da corretagem</span>
                          <select
                            value={matchForm.brokerageMode}
                            onChange={(event) =>
                              setMatchForm((current) => ({
                                ...current,
                                brokerageMode: event.target.value as BrokerageMode,
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            <option value="percentage">Percentual</option>
                            <option value="fixed">Valor fixo</option>
                            <option value="per_sack">Por saca</option>
                            <option value="spread">Spread</option>
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Valor</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={matchForm.brokerageMode === 'spread'}
                            value={matchForm.brokerageValue}
                            onChange={(event) => setMatchForm((current) => ({ ...current, brokerageValue: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pagador</span>
                          <select
                            value={matchForm.brokeragePayer}
                            onChange={(event) =>
                              setMatchForm((current) => ({
                                ...current,
                                brokeragePayer: event.target.value as BrokeragePayer,
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                          >
                            <option value="seller">Vendedor</option>
                            <option value="buyer">Comprador</option>
                          </select>
                        </label>
                      </div>

                      {lockedCommissionOffer ? (
                        <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                          <p className="font-black">Comissao travada pelo cadastro.</p>
                          <p className="mt-2 leading-6">
                            A oportunidade #{lockedCommissionOffer.id} ja traz {formatCurrency(lockedCommissionOffer.mesaCommission)} por
                            saca registrada no cadastro, entao o backend vai priorizar esse valor no match.
                          </p>
                        </div>
                      ) : null}

                      {negotiationNotice ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{negotiationNotice}</span>
                        </div>
                      ) : null}

                      {negotiationError ? (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{negotiationError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="submit"
                          disabled={matchSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {matchSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                          Criar match
                        </button>

                        <Link
                          to={OPERATIONS_PATH}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-50"
                        >
                          Abrir mesa completa
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </form>
                  </section>

                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Corretagem por corretor"
                      title="Consolidado das comissoes"
                      description="Acompanhe quem esta puxando mais negociacoes e a estimativa financeira ligada a cada corretor."
                    />

                    <div className="mt-6 grid gap-3">
                      {brokerSummaries.map((summary) => (
                        <article key={summary.broker.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-lg font-black text-slate-950">{summary.broker.name}</p>
                              <p className="mt-1 text-sm text-slate-600">{summary.broker.email}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                              {formatNumber(summary.totalNegotiations)} negociacoes
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Bruta pendente</p>
                              <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(summary.grossPending)}</p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Bruta aceita</p>
                              <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(summary.grossAccepted)}</p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Estimativa pendente</p>
                              <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(summary.estimatedPending)}</p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Estimativa aceita</p>
                              <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(summary.estimatedAccepted)}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                  <SectionTitle
                    eyebrow="Livro de negociacoes"
                    title="Atualizar status e remover negociacoes"
                    description="Toda a corretagem criada pela plataforma pode ser auditada daqui, com acao direta sobre o fluxo operacional."
                  />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="space-y-2 sm:col-span-2 xl:col-span-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Buscar</span>
                      <input
                        value={negotiationSearch}
                        onChange={(event) => setNegotiationSearch(event.target.value)}
                        placeholder="Comprador, vendedor ou corretor"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Status</span>
                      <select
                        value={negotiationStatusFilter}
                        onChange={(event) => setNegotiationStatusFilter(event.target.value as 'todos' | Negotiation['status'])}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                      >
                        <option value="todos">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="aceita">Aceita</option>
                        <option value="recusada">Recusada</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {visibleNegotiations.map((negotiation) => {
                      const buyer = findUserById(users, negotiation.buyerId);
                      const seller = findUserById(users, negotiation.sellerId);
                      const broker = findUserById(users, negotiation.brokerId);

                      return (
                        <article key={negotiation.id} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                  {negotiationStatusLabels[negotiation.status]}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                  {negotiationModeLabels[negotiation.brokerageMode || 'percentage']}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                                  {brokeragePayerLabels[negotiation.brokeragePayer || 'seller']}
                                </span>
                              </div>

                              <p className="mt-4 text-lg font-black text-slate-950">Negociacao #{negotiation.id}</p>
                              <p className="mt-2 text-sm text-slate-600">
                                Comprador: {buyer?.name || 'Nao localizado'} · Vendedor: {seller?.name || 'Nao localizado'}
                              </p>
                              <p className="mt-2 text-sm text-slate-600">Corretor: {broker?.name || negotiation.brokerName || 'Nao definido'}</p>
                              <p className="mt-3 text-sm font-semibold text-slate-900">{getBrokerageRuleLabel(negotiation)}</p>
                              <p className="mt-2 text-sm text-slate-500">Corretagem bruta: {formatCurrency(negotiation.brokerageFee)}</p>
                              <p className="mt-2 text-sm text-slate-500">Criada em {formatDateTime(negotiation.createdAt)}</p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                              {(['pendente', 'aceita', 'recusada'] as Negotiation['status'][]).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => void handleUpdateNegotiationStatus(negotiation.id, status)}
                                  disabled={negotiationSavingId === negotiation.id || negotiation.status === status}
                                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {negotiationSavingId === negotiation.id && negotiation.status !== status ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    `Marcar ${negotiationStatusLabels[status].toLowerCase()}`
                                  )}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() => void handleDeleteNegotiation(negotiation.id)}
                                disabled={negotiationDeletingId === negotiation.id}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {negotiationDeletingId === negotiation.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Remover
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </section>
            ) : null}
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
