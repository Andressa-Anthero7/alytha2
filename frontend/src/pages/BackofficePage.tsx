import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FilePlus2,
  HandCoins,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PackageSearch,
  Save,
  ShieldCheck,
  Trash2,
  Users2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { clearAuth, getCurrentUser } from '../lib/auth';
import { BACKOFFICE_PATH, OPERATIONS_PATH } from '../shared/appRoutes';
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

const tabs: Array<{ id: BackofficeTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Visao geral', icon: LayoutDashboard },
  { id: 'users', label: 'Usuarios', icon: Users2 },
  { id: 'offers', label: 'Ofertas e demandas', icon: PackageSearch },
  { id: 'negotiations', label: 'Comissoes e negociacoes', icon: HandCoins },
];

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
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
  } as const;

  return (
    <article className={`rounded-[1.6rem] border px-4 py-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{detail}</p>
    </article>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export default function BackofficePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser<User>();
  const [activeTab, setActiveTab] = useState<BackofficeTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'todos' | User['type']>('todos');
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyUserForm());
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userDeletingId, setUserDeletingId] = useState<number | null>(null);
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
    if (userRoleFilter !== 'todos' && user.type !== userRoleFilter) {
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

  const handleUserRoleChange = (role: User['type']) => {
    setUserForm((current) => ({
      ...current,
      type: role,
      profile_segment: profileSegmentOptions[role].some((option) => option.value === current.profile_segment) ? current.profile_segment : '',
    }));
  };

  const handleEditUser = (user: User) => {
    setActiveTab('users');
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
      setUserNotice('Cadastro removido com sucesso.');
      await loadData();
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Erro inesperado ao remover o usuario.');
    } finally {
      setUserDeletingId(null);
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf6ee_0%,#ffffff_42%,#f1efe8_100%)] text-slate-900">
      <header className="border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-700">Backoffice Alytha</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Controle administrativo para usuarios, operacoes, comissoes e cadastro completo da plataforma.
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                Esta area concentra a visao do backoffice sobre os perfis, as ofertas e demandas, a mesa operacional e o
                acompanhamento das negociacoes conduzidas dentro da Alytha.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                to={OPERATIONS_PATH}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                <BriefcaseBusiness className="h-4 w-4" />
                Mesa operacional
              </Link>
              <Link
                to="/perfil"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900 shadow-sm hover:border-slate-300"
              >
                <ShieldCheck className="h-4 w-4" />
                Meu perfil
              </Link>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Sincronizar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-red-700 shadow-sm hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-colors ${
                    active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center gap-3 rounded-[2rem] border border-white/80 bg-white/90 px-6 py-6 shadow-[0_40px_120px_-75px_rgba(15,23,42,0.55)]">
            <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
            <span className="text-sm font-semibold text-slate-700">Carregando o backoffice...</span>
          </div>
        ) : (
          <>
            {pageError ? (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{pageError}</span>
              </div>
            ) : null}

            {activeTab === 'overview' ? (
              <section className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Usuarios ativos"
                    value={formatNumber(totalUsers)}
                    detail={`${formatNumber(sellerUsers)} vendedores, ${formatNumber(buyerUsers)} compradores e ${formatNumber(brokerUsers.length)} corretores`}
                  />
                  <SummaryCard
                    label="Ofertas em operacao"
                    value={formatNumber(activeOffers.length)}
                    detail={`${formatNumber(deskOffers.length)} na mesa e ${formatNumber(directOffers.length)} diretas`}
                    tone="sky"
                  />
                  <SummaryCard
                    label="Negociacoes pendentes"
                    value={formatNumber(pendingNegotiations.length)}
                    detail={`${formatCurrency(pendingBrokerage)} em corretagem bruta ainda em aberto`}
                    tone="amber"
                  />
                  <SummaryCard
                    label="Corretagem aceita"
                    value={formatCurrency(acceptedBrokerage)}
                    detail={`${formatNumber(acceptedNegotiations.length)} negociacoes aceitas no livro`}
                    tone="slate"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Resumo operacional"
                      title="Panorama do escritorio inteiro"
                      description="Acompanhamento rapido do volume cadastrado, da base de perfis e da pressao atual sobre a mesa comercial."
                    />

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Demandas publicadas</p>
                        <p className="mt-3 text-2xl font-black text-slate-950">
                          {formatNumber(offers.filter((offer) => offer.type === 'compra').length)}
                        </p>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ofertas publicadas</p>
                        <p className="mt-3 text-2xl font-black text-slate-950">
                          {formatNumber(offers.filter((offer) => offer.type === 'venda').length)}
                        </p>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Aguardando PIX</p>
                        <p className="mt-3 text-2xl font-black text-slate-950">{formatNumber(pendingOffers.length)}</p>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Corretagem bruta total</p>
                        <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(totalBrokerage)}</p>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Estimativa corretores</p>
                        <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(totalBrokerage * 0.3)}</p>
                        <p className="mt-2 text-xs text-slate-500">Seguindo a regra operacional atual de 30% usada na mesa.</p>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Rota principal</p>
                        <p className="mt-3 text-sm font-black text-slate-950">{BACKOFFICE_PATH}</p>
                        <p className="mt-2 text-xs text-slate-500">Fluxo proprio do perfil backoffice dentro do app.</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Acesso rapido"
                      title="Atalhos para a operacao"
                      description="Entradas diretas para os fluxos que o backoffice mais usa no dia a dia."
                    />

                    <div className="mt-6 grid gap-3">
                      <Link
                        to={OPERATIONS_PATH}
                        className="inline-flex items-center justify-between rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-900 hover:bg-white"
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
                        className="inline-flex items-center justify-between rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-900 hover:bg-white"
                      >
                        Criar novo cadastro de usuario
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('offers')}
                        className="inline-flex items-center justify-between rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-900 hover:bg-white"
                      >
                        Cadastrar oferta ou demanda
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('negotiations')}
                        className="inline-flex items-center justify-between rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-900 hover:bg-white"
                      >
                        Gerenciar comissoes e negociacoes
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Cadastros recentes"
                      title="Ultimos perfis adicionados"
                      description="Visao rapida dos usuarios mais recentes para revisar categorias, contatos e segmento."
                    />

                    <div className="mt-6 grid gap-3">
                      {recentUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="flex items-start justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-white"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-950">{user.name}</p>
                            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                              {roleLabels[user.type]}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Comissao por corretor"
                      title="Leitura consolidada da corretagem"
                      description="Resumo por corretor com valores brutos e estimativa da parcela do profissional na regra atual da mesa."
                    />

                    <div className="mt-6 grid gap-3">
                      {brokerSummaries.slice(0, 4).map((summary) => (
                        <article key={summary.broker.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950">{summary.broker.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                                {formatNumber(summary.totalNegotiations)} negociacoes
                              </p>
                            </div>
                            <p className="text-sm font-black text-emerald-700">{formatCurrency(summary.estimatedAccepted)}</p>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Bruta aceita</p>
                              <p className="mt-2 text-sm font-black text-slate-950">{formatCurrency(summary.grossAccepted)}</p>
                            </div>
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Estimativa 30%</p>
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
                    eyebrow="Livro recente"
                    title="Ultimas oportunidades cadastradas"
                    description="Acompanhamento das entradas mais recentes para responder rapido a novas demandas e revisar cadastros."
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {recentOffers.map((offer) => {
                      const owner = findUserById(users, offer.userId);
                      return (
                        <article key={offer.id} className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700">
                              {offerTypeLabels[offer.type]}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                              {offerStatusLabels[offer.status]}
                            </span>
                          </div>
                          <h3 className="mt-4 text-2xl font-black text-slate-950">
                            {offer.grain} · {formatNumber(offer.quantity)} {offer.unit}
                          </h3>
                          <p className="mt-2 text-sm text-slate-600">{offer.location}</p>
                          <p className="mt-4 text-sm font-semibold text-slate-900">{owner?.name || 'Usuario nao localizado'}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatCurrency(offer.price)}</p>
                          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
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
              <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Categorias de perfil"
                      title="Cadastro completo de compradores, vendedores, corretores e backoffice"
                      description="Use esta area para criar novos perfis, ajustar informacoes cadastrais, redefinir senha e manter a base de usuarios organizada."
                    />

                    <form onSubmit={handleSaveUser} className="mt-6 space-y-4">
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

                <div className="space-y-6">
                  <section className="rounded-[2rem] border border-white/80 bg-white/92 p-6 shadow-[0_45px_120px_-75px_rgba(15,23,42,0.55)]">
                    <SectionTitle
                      eyebrow="Base de usuarios"
                      title="Pesquisar e editar categorias"
                      description="Filtre a base por tipo de perfil e abra qualquer cadastro para atualizacao imediata."
                    />

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
                          onChange={(event) => setUserRoleFilter(event.target.value as 'todos' | User['type'])}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
                        >
                          <option value="todos">Todos</option>
                          {userRoleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-6 grid gap-3">
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
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
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
                    </div>
                  </section>
                </div>
              </section>
            ) : null}

            {activeTab === 'offers' ? (
              <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
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

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Grao</span>
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
                        </label>

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

                <div className="space-y-6">
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
              <section className="space-y-6">
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
      </main>
    </div>
  );
}
