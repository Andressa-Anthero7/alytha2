import { useEffect, useState, type ComponentType, type DragEvent } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  GanttChartSquare,
  Handshake,
  Headset,
  HelpCircle,
  LayoutGrid,
  Leaf,
  LogOut,
  MapPin,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Warehouse,
  Wheat,
  X,
} from 'lucide-react';
import { apiFetch, supportEmail, supportWhatsAppHref } from '../../shared/api';
import type { BrokeragePayer, Negotiation, Offer, User as UserType } from '../../types';

type TradingDeskPageProps = {
  currentUser: UserType;
  onLogout: () => void;
};

type BrokerTab = 'MESA' | 'MARKET_INFO';

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

type MatchBrokerageMode = 'percentage' | 'per_sack';

const priceData = [
  { date: '01/03', soja: 132, milho: 58, sorgo: 42 },
  { date: '04/03', soja: 134, milho: 59, sorgo: 43 },
  { date: '07/03', soja: 133, milho: 61, sorgo: 44 },
  { date: '10/03', soja: 135, milho: 60, sorgo: 43.5 },
  { date: '13/03', soja: 135.5, milho: 62, sorgo: 45 },
];

const marketData: MarketTickerItem[] = [
  { type: 'quote', label: 'SOJA (Paranagua)', value: 'R$ 135,50', trend: 'up', change: '+1.2%' },
  { type: 'quote', label: 'MILHO (B3)', value: 'R$ 64,20', trend: 'down', change: '-0.5%' },
  { type: 'quote', label: 'DOLAR', value: 'R$ 5,12', trend: 'up', change: '+0.3%' },
  { type: 'news', text: 'Exportacoes de soja do Brasil devem atingir recorde este mes.' },
  { type: 'news', text: 'Clima seco no Sul preocupa produtores de milho safrinha.' },
  { type: 'quote', label: 'SOJA (Chicago)', value: 'US$ 12,40/bu', trend: 'up', change: '+0.8%' },
  { type: 'news', text: 'Demanda chinesa por graos brasileiros continua aquecida.' },
];

const perSackCommissionOptions = Array.from({ length: 10 }, (_, index) => ((index + 1) * 0.5).toFixed(2).replace('.', ','));

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: 'Nova Oferta de Soja',
    message: 'Fazenda Esperanca publicou 5.000 sacas a R$ 135,00.',
    time: 'Ha 5 min',
    unread: true,
  },
  {
    id: 2,
    title: 'Negociacao Atualizada',
    message: 'O cliente aceitou sua contraproposta na ordem #8492.',
    time: 'Ha 2 horas',
    unread: true,
  },
  {
    id: 3,
    title: 'Alerta de Mercado',
    message: 'Preco do milho subiu 2% na ultima hora.',
    time: 'Ha 1 dia',
    unread: false,
  },
];

const brokerTabs: Array<{ id: BrokerTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'MESA', label: 'Mesa de Operacoes', icon: LayoutGrid },
  { id: 'MARKET_INFO', label: 'Cotacoes & Logistica', icon: TrendingUp },
];

export function TradingDeskPage({ currentUser, onLogout }: TradingDeskPageProps) {
  const [brokerTab, setBrokerTab] = useState<BrokerTab>('MESA');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, ChatMessage[]>>({});
  const [isDraggingOverSell, setIsDraggingOverSell] = useState(false);
  const [isDraggingOverBuy, setIsDraggingOverBuy] = useState(false);
  const [selectedGrain, setSelectedGrain] = useState<string>('Todos');
  const [selectedBuy, setSelectedBuy] = useState<Offer | null>(null);
  const [selectedSell, setSelectedSell] = useState<Offer | null>(null);
  const [matchBrokerageMode, setMatchBrokerageMode] = useState<MatchBrokerageMode>('per_sack');
  const [matchBrokerageValue, setMatchBrokerageValue] = useState('0,50');
  const [matchBrokeragePayer, setMatchBrokeragePayer] = useState<BrokeragePayer>('seller');
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const tickerItems = [...marketData, ...marketData, ...marketData];

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
        throw new Error('Nao foi possivel sincronizar os dados da mesa.');
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

  const getBrokerageRuleLabel = (neg: Negotiation) => {
    if (neg.brokerageMode === 'fixed') {
      return `em valor fixo de R$ ${Number(neg.brokerageValue ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (neg.brokerageMode === 'per_sack') {
      return `de R$ ${Number(neg.brokerageValue ?? 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} por saca`;
    }

    return `no valor de ${Number(neg.brokeragePercentage ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}% sobre o montante total da operacao`;
  };

  const handleMatch = async () => {
    if (!selectedBuy || !selectedSell) return;

    const normalizedCommissionValue = matchBrokerageValue.replace(',', '.').trim();
    if (!normalizedCommissionValue) {
      setError('Informe o valor da comissao para executar o match.');
      return;
    }

    const parsedCommissionValue = Number(normalizedCommissionValue);
    if (!Number.isFinite(parsedCommissionValue)) {
      setError('Informe um valor numerico valido para a comissao.');
      return;
    }

    if (matchBrokerageMode === 'percentage' && (parsedCommissionValue < 0 || parsedCommissionValue > 100)) {
      setError('A comissao em porcentagem deve estar entre 0 e 100.');
      return;
    }

    if (matchBrokerageMode === 'per_sack' && parsedCommissionValue < 0.5) {
      setError('A comissao em reais por saca deve ser maior ou igual a 0,50.');
      return;
    }

    if (matchBrokerageMode === 'per_sack') {
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

    const payload: Record<string, number | string> = {
      buyOfferId: selectedBuy.id,
      sellOfferId: selectedSell.id,
      brokerageMode: matchBrokerageMode,
      brokeragePayer: matchBrokeragePayer,
    };

    if (matchBrokerageMode === 'percentage') {
      payload.brokeragePercentage = parsedCommissionValue;
    } else {
      payload.brokerageValue = parsedCommissionValue;
    }

    setError(null);
    const response = await apiFetch('/negotiations/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.detail || 'Nao foi possivel executar o match.');
      return;
    }

    setSelectedBuy(null);
    setSelectedSell(null);
    setMatchBrokerageMode('per_sack');
    setMatchBrokerageValue('0,50');
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
      setError(payload?.detail || 'Nao foi possivel atualizar a negociacao.');
      return;
    }

    await loadData();
  };

  const renderCommissionModal = () => {
    if (!showCommissionModal) return null;

    const entries = [
      { id: '1', date: '15 Mar 2026', client: 'Fazenda Esperanca', type: 'Venda de Soja', value: 1250.0, status: 'pago' },
      { id: '2', date: '14 Mar 2026', client: 'AgroSul', type: 'Compra de Milho', value: 850.0, status: 'pendente' },
      { id: '3', date: '12 Mar 2026', client: 'Sementes Brasil', type: 'Venda de Soja', value: 3400.0, status: 'pago' },
      { id: '4', date: '10 Mar 2026', client: 'Fazenda Sao Joao', type: 'Venda de Milho', value: 900.0, status: 'pago' },
    ] as const;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] bg-white p-10 shadow-2xl">
          <div className="mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Receipt className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Extrato de Comissoes</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Marco 2026</p>
              </div>
            </div>
            <button onClick={() => setShowCommissionModal(false)} className="rounded-full p-2 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Recebido</p>
              <p className="text-xl font-black text-emerald-600">R$ 8.200,00</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">A Receber</p>
              <p className="text-xl font-black text-orange-500">R$ 4.250,00</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total do Mes</p>
              <p className="text-xl font-black text-gray-900">R$ 12.450,00</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-900">Lancamentos Recentes</h4>
            {entries.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{item.client}</p>
                    <p className="text-xs text-gray-500">
                      {item.type} - {item.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">R$ {item.value.toFixed(2)}</p>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${item.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContractModal = () => {
    if (!selectedNeg || !showContractModal) return null;
    const buyer = users.find((user) => user.id === selectedNeg.buyerId);
    const seller = users.find((user) => user.id === selectedNeg.sellerId);
    const offer = allOffers.find((item) => item.id === selectedNeg.offerId);
    const brokerageRuleLabel = getBrokerageRuleLabel(selectedNeg);
    const brokeragePayerLabel = getBrokeragePayerLabel(selectedNeg.brokeragePayer);

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white p-12 shadow-2xl">
          <div className="absolute left-0 top-0 h-2 w-full bg-emerald-600" />
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-black text-gray-900">Contrato de Intermediacao</h2>
              <p className="font-mono text-xs text-gray-400">
                REF: #AGRO-{selectedNeg.id}-{new Date().getFullYear()}
              </p>
            </div>
            <button
              onClick={() => setShowContractModal(false)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X />
            </button>
          </div>

          <div className="mb-12 grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Vendedor (Outorgante)</p>
              <p className="text-lg font-bold">{seller?.name || '-'}</p>
              <p className="text-sm text-gray-500">{seller?.email || '-'}</p>
            </div>
            <div className="space-y-4">
              <p className="border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Comprador (Outorgado)</p>
              <p className="text-lg font-bold">{buyer?.name || '-'}</p>
              <p className="text-sm text-gray-500">{buyer?.email || '-'}</p>
            </div>
          </div>

          <div className="mb-12 space-y-6 rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">Produto</p>
                <p className="font-bold">{offer?.grain || '-'}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">Quantidade</p>
                <p className="font-bold">
                  {Number(selectedNeg.proposedQuantity).toLocaleString('pt-BR')} {offer?.unit || ''}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-gray-400">Preco Acordado</p>
                <p className="font-black text-emerald-700">R$ {Number(selectedNeg.proposedPrice).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase text-gray-400">Clausula de Corretagem</p>
              <p className="text-xs italic leading-relaxed text-gray-600">
                Fica acordado o pagamento de comissao de corretagem {brokerageRuleLabel},
                totalizando <span className="font-bold text-emerald-700">R$ {Number(selectedNeg.brokerageFee).toLocaleString('pt-BR')}</span>,
                a ser pago pelo {brokeragePayerLabel} apos a liquidacao financeira.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-bold text-white transition-all hover:bg-gray-800">
              <FileText className="h-5 w-5" /> Baixar PDF
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700">
              <ShieldCheck className="h-5 w-5" /> Assinar Digitalmente
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChat = (negId: number) => {
    const neg = negotiations.find((item) => item.id === negId);
    if (!neg) return null;

    const buyer = users.find((user) => user.id === neg.buyerId);
    const seller = users.find((user) => user.id === neg.sellerId);

    return (
      <div className="flex h-[400px] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-50 bg-gray-50/50 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400">Intermediacao #{negId}</p>
            <p className="text-xs font-bold text-gray-700">
              Broker Hub: {buyer?.name || '-'} ↔ {seller?.name || '-'}
            </p>
          </div>
          <button onClick={() => setActiveChat(null)}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {(messages[negId] || []).map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'Corretor' ? 'items-end' : 'items-start'}`}>
              <span className="mb-1 text-[9px] font-bold text-gray-400">
                {msg.sender} • {msg.time}
              </span>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${msg.sender === 'Corretor' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {(messages[negId] || []).length === 0 && (
            <p className="mt-20 text-center text-[10px] text-gray-400">Inicie o dialogo com as partes para alinhar o contrato.</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-50 p-4">
          <input
            type="text"
            placeholder="Mensagem para as partes..."
            className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-xs outline-none focus:border-emerald-500"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage(negId, (event.target as HTMLInputElement).value, 'Corretor');
                (event.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderMarketInfoSection = () => (
    <div className="space-y-8 pb-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 lg:col-span-2 lg:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <MapPin className="text-emerald-600" /> Cotacoes por Praca (Fisico)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { city: 'Sorriso', state: 'MT', soja: 135.5, milho: 62.0, sorgo: 45.0 },
              { city: 'Rio Verde', state: 'GO', soja: 138.0, milho: 65.5, sorgo: 48.0 },
              { city: 'Cascavel', state: 'PR', soja: 142.0, milho: 68.0, sorgo: 50.0 },
              { city: 'Paranagua', state: 'PR', soja: 145.5, milho: 70.0, sorgo: 52.0 },
            ].map((praca) => (
              <div key={praca.city} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:bg-white hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{praca.city}</h3>
                  <span className="rounded-md bg-gray-200 px-2 py-0.5 text-[10px] font-black text-gray-600">{praca.state}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Soja</span>
                    <span className="font-mono text-sm font-black text-emerald-700">R$ {praca.soja.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Milho</span>
                    <span className="font-mono text-sm font-black text-blue-700">R$ {praca.milho.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 lg:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <TrendingUp className="text-emerald-600" /> Bolsas (Futuro)
          </h2>
          <div className="space-y-4">
            {[
              { name: 'CBOT (Soja)', price: 12.45, unit: 'USD/bu' },
              { name: 'CBOT (Milho)', price: 4.5, unit: 'USD/bu' },
              { name: 'B3 (Soja)', price: 148.2, unit: 'R$/sc' },
            ].map((bolsa, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-bold text-gray-900">{bolsa.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-emerald-700">
                    {bolsa.price} {bolsa.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 lg:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Truck className="text-blue-600" /> Fretes e Transportes
          </h2>
          <div className="space-y-4">
            {[
              { route: 'Sorriso/MT -> Paranagua/PR', price: 380 },
              { route: 'Rio Verde/GO -> Santos/SP', price: 250 },
            ].map((freight, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-900">{freight.route}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-blue-700">R$ {freight.price}/t</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 lg:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
            <Warehouse className="text-orange-600" /> Silos e Armazenagem
          </h2>
          <div className="space-y-4">
            {[
              { region: 'Mato Grosso (Medio Norte)', capacity: '85%', cost: 12.5 },
              { region: 'Goias (Sudoeste)', capacity: '70%', cost: 10.0 },
            ].map((silo, index) => (
              <div key={index} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-900">{silo.region}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-orange-700">R$ {silo.cost.toFixed(2)}/t</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrokerMesa = () => {
    const handleDragStart = (event: DragEvent, offer: Offer) => {
      event.dataTransfer.setData('offerId', offer.id.toString());
      event.dataTransfer.setData('offerType', offer.type);
    };

    const handleDrop = (event: DragEvent, targetType: 'venda' | 'compra') => {
      event.preventDefault();
      setIsDraggingOverSell(false);
      setIsDraggingOverBuy(false);

      const offerId = event.dataTransfer.getData('offerId');
      const offerType = event.dataTransfer.getData('offerType');
      if (offerType === targetType) {
        const offer = offers.find((item) => item.id === Number(offerId));
        if (offer) {
          if (targetType === 'venda') setSelectedSell(offer);
          else setSelectedBuy(offer);
        }
      }
    };

    const sellOffers = offers.filter((offer) => offer.type === 'venda' && (selectedGrain === 'Todos' || offer.grain === selectedGrain));
    const buyOffers = offers.filter((offer) => offer.type === 'compra' && (selectedGrain === 'Todos' || offer.grain === selectedGrain));
    const pendingNegotiations = negotiations.filter((item) => item.status === 'pendente').length;
    const finishedNegotiations = negotiations.filter((item) => item.status === 'aceita' || item.status === 'recusada').length;

    let marketTrend = 'Neutro';
    let trendColor = 'text-slate-500';
    let trendBackground = 'bg-slate-100';
    let TrendIcon: ComponentType<{ className?: string }> = ArrowRight;

    if (buyOffers.length > sellOffers.length * 1.2) {
      marketTrend = 'Mais Comprador';
      trendColor = 'text-blue-600';
      trendBackground = 'bg-blue-50';
      TrendIcon = TrendingUp;
    } else if (sellOffers.length > buyOffers.length * 1.2) {
      marketTrend = 'Mais Vendedor';
      trendColor = 'text-orange-600';
      trendBackground = 'bg-orange-50';
      TrendIcon = TrendingDown;
    }

    return (
      <div className="flex min-h-[calc(100vh-120px)] flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Mesa de Operacoes</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trading Desk - Live Market</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div>
                  <p className="mb-1 text-[7px] font-black uppercase leading-none tracking-widest text-slate-400">Volume 24h</p>
                  <p className="font-mono text-[11px] leading-none font-black text-slate-700">
                    12.450<span className="ml-0.5 text-[8px] text-slate-400">t</span>
                  </p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="mb-1 text-[7px] font-black uppercase leading-none tracking-widest text-slate-400">Matches Hoje</p>
                  <p className="font-mono text-[11px] leading-none font-black text-emerald-600">42</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="mb-1 text-[7px] font-black uppercase leading-none tracking-widest text-slate-400">Aguardando</p>
                  <p className="font-mono text-[11px] leading-none font-black text-orange-600">{pendingNegotiations}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <p className="mb-1 text-[7px] font-black uppercase leading-none tracking-widest text-slate-400">Finalizadas</p>
                  <p className="font-mono text-[11px] leading-none font-black text-blue-600">{finishedNegotiations}</p>
                </div>
              </div>
            </div>
            <a
              href={supportWhatsAppHref || `mailto:${supportEmail}`}
              target={supportWhatsAppHref ? '_blank' : undefined}
              rel={supportWhatsAppHref ? 'noreferrer' : undefined}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              <Headset className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Suporte Tecnico</span>
            </a>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200">
          {brokerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setBrokerTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                brokerTab === tab.id
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {brokerTab === 'MESA' ? (
          <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
            <div className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-2">
                <h3 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Venda (Ofertas)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500">{sellOffers.length} ofertas</span>
                  <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${trendBackground} ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{marketTrend}</span>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="border-b border-slate-50 text-slate-400">
                      <th className="px-3 py-2 font-bold uppercase tracking-tighter">Produto</th>
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-tighter">Preco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sellOffers.map((offer) => (
                      <tr
                        key={offer.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, offer)}
                        onClick={() => setSelectedSell(offer)}
                        onDoubleClick={() => setSelectedSell(offer)}
                        className={`group cursor-grab select-none transition-all active:cursor-grabbing ${
                          selectedSell?.id === offer.id ? 'bg-orange-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-1 rounded-full bg-orange-500/20 transition-colors group-hover:bg-orange-500" />
                            <div>
                              <p className="leading-tight font-bold text-slate-700">{offer.grain}</p>
                              <p className="truncate text-[7px] uppercase tracking-tighter text-slate-400">{offer.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <div className={`h-1 w-1 rounded-full ${Number(offer.price) > 160 ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
                            <p className="font-mono leading-tight font-black text-orange-600">R$ {Number(offer.price).toFixed(2)}</p>
                          </div>
                          <p className="text-[7px] font-bold uppercase text-slate-500">
                            {Number(offer.quantity)} {offer.unit}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-6 flex min-h-0 flex-col gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 text-white shadow-2xl">
                <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 bg-emerald-500/10 blur-[60px]" />

                <div className="relative z-10 flex items-center gap-3">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingOverSell(true);
                    }}
                    onDragLeave={() => setIsDraggingOverSell(false)}
                    onDrop={(event) => handleDrop(event, 'venda')}
                    className={`flex-1 rounded-lg border-2 border-dashed p-2.5 transition-all duration-300 ${
                      isDraggingOverSell
                        ? 'scale-[1.02] border-orange-500 bg-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                        : selectedSell
                          ? 'border-orange-500/40 bg-orange-500/5'
                          : 'border-slate-700 bg-slate-800/40 hover:border-orange-500/30'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500">Vendedor</p>
                      <div className="flex items-center gap-2">
                        {selectedSell && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedSell(null);
                            }}
                            className="text-slate-500 transition-colors hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {selectedSell && (
                          <span className="rounded border border-orange-500/20 bg-orange-500/20 px-1.5 py-0.5 text-[7px] font-black text-orange-400">
                            SELL
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedSell ? (
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="mb-0.5 text-[11px] leading-none font-black text-white">{selectedSell.grain}</p>
                          <p className="max-w-[100px] truncate text-[8px] uppercase tracking-tighter text-slate-500">{selectedSell.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[11px] leading-none font-black text-orange-400">R$ {Number(selectedSell.price).toFixed(2)}</p>
                          <p className="text-[7px] font-bold uppercase text-slate-500">
                            {Number(selectedSell.quantity)} {selectedSell.unit}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded border border-slate-800/50 bg-slate-900/50 py-1.5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Aguardando Oferta</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="relative">
                      {selectedBuy && selectedSell && <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500 opacity-50 blur-md" />}
                      <button
                        disabled={!selectedBuy || !selectedSell}
                        onClick={() => void handleMatch()}
                        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 shadow-xl shadow-emerald-900/40 transition-all active:scale-95 hover:bg-emerald-500 disabled:opacity-10 disabled:grayscale"
                      >
                        <ArrowLeftRight className="h-5 w-5 text-white" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Executar</p>
                      {selectedBuy && selectedSell && (
                        <div className="flex flex-col items-center">
                          <p className={`font-mono text-[9px] font-black ${Number(selectedSell.price) <= Number(selectedBuy.price) ? 'text-emerald-400' : 'text-red-400'}`}>
                            {Number(selectedSell.price) <= Number(selectedBuy.price) ? '+' : ''}
                            {(Number(selectedBuy.price) - Number(selectedSell.price)).toFixed(2)}
                          </p>
                          <p className="text-[6px] font-black uppercase tracking-tighter text-slate-500">Spread</p>
                        </div>
                      )}
                    </div>
                    <div className="w-44 rounded-lg border border-slate-700 bg-slate-800/80 p-2">
                      <p className="mb-1 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">Comissao</p>
                      <div className="mb-1 flex gap-1">
                        <label className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          matchBrokerageMode === 'per_sack'
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}>
                          <input
                            type="radio"
                            name="brokerageMode"
                            value="per_sack"
                            checked={matchBrokerageMode === 'per_sack'}
                            onChange={() => {
                              setMatchBrokerageMode('per_sack');
                              if (!perSackCommissionOptions.includes(matchBrokerageValue)) {
                                setMatchBrokerageValue('0,50');
                              }
                            }}
                            className="h-2.5 w-2.5 accent-emerald-500"
                          />
                          R$
                        </label>
                        <label className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider ${
                          matchBrokerageMode === 'percentage'
                            ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}>
                          <input
                            type="radio"
                            name="brokerageMode"
                            value="percentage"
                            checked={matchBrokerageMode === 'percentage'}
                            onChange={() => setMatchBrokerageMode('percentage')}
                            className="h-2.5 w-2.5 accent-emerald-500"
                          />
                          %
                        </label>
                      </div>
                      {matchBrokerageMode === 'per_sack' ? (
                        <div className="mb-1 flex items-center gap-1 rounded border border-slate-700 bg-slate-900/70 px-1.5 py-1">
                          <span className="text-[8px] font-black text-slate-400">R$</span>
                          <select
                            value={matchBrokerageValue}
                            onChange={(event) => setMatchBrokerageValue(event.target.value)}
                            className="w-full border-none bg-transparent text-[9px] font-bold text-white outline-none"
                          >
                            {perSackCommissionOptions.map((value) => (
                              <option key={value} value={value} className="bg-slate-900 text-white">
                                R$ {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="mb-1 flex items-center gap-1 rounded border border-slate-700 bg-slate-900/70 px-1.5 py-1">
                          <span className="text-[8px] font-black text-slate-400">%</span>
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
                            className="w-full border-none bg-transparent text-[9px] font-bold text-white outline-none placeholder:text-slate-500"
                            placeholder="1,00"
                          />
                        </div>
                      )}
                      <select
                        value={matchBrokeragePayer}
                        onChange={(event) => setMatchBrokeragePayer(event.target.value as BrokeragePayer)}
                        className="w-full rounded border border-slate-700 bg-slate-900/80 px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider text-slate-200 outline-none transition-colors focus:border-emerald-500"
                      >
                        <option value="seller">Paga: Vendedor</option>
                        <option value="buyer">Paga: Comprador</option>
                      </select>
                    </div>
                  </div>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingOverBuy(true);
                    }}
                    onDragLeave={() => setIsDraggingOverBuy(false)}
                    onDrop={(event) => handleDrop(event, 'compra')}
                    className={`flex-1 rounded-lg border-2 border-dashed p-2.5 transition-all duration-300 ${
                      isDraggingOverBuy
                        ? 'scale-[1.02] border-blue-500 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                        : selectedBuy
                          ? 'border-blue-500/40 bg-blue-500/5'
                          : 'border-slate-700 bg-slate-800/40 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500">Comprador</p>
                      <div className="flex items-center gap-2">
                        {selectedBuy && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedBuy(null);
                            }}
                            className="text-slate-500 transition-colors hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        {selectedBuy && (
                          <span className="rounded border border-blue-500/20 bg-blue-500/20 px-1.5 py-0.5 text-[7px] font-black text-blue-400">
                            BUY
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedBuy ? (
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="mb-0.5 text-[11px] leading-none font-black text-white">{selectedBuy.grain}</p>
                          <p className="max-w-[100px] truncate text-[8px] uppercase tracking-tighter text-slate-500">{selectedBuy.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[11px] leading-none font-black text-blue-400">R$ {Number(selectedBuy.price).toFixed(2)}</p>
                          <p className="text-[7px] font-bold uppercase text-slate-500">
                            {Number(selectedBuy.quantity)} {selectedBuy.unit}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded border border-slate-800/50 bg-slate-900/50 py-1.5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Aguardando Demanda</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <h3 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-700">
                    <GanttChartSquare className="h-3 w-3" />
                    Monitor de Negociacoes
                  </h3>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                      <span className="text-[8px] font-bold uppercase text-slate-400">Aguardando</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[8px] font-bold uppercase text-slate-400">Finalizadas</span>
                    </div>
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 divide-y divide-slate-50 overflow-y-auto">
                  {negotiations.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 opacity-20">
                      <GanttChartSquare className="mb-2 h-8 w-8" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma negociacao ativa</p>
                    </div>
                  ) : (
                    negotiations.map((neg) => {
                      const buyer = users.find((user) => user.id === neg.buyerId);
                      const seller = users.find((user) => user.id === neg.sellerId);
                      return (
                        <div key={neg.id} className="group flex items-center px-3 py-1.5 transition-colors hover:bg-slate-50">
                          <div className="w-12 shrink-0">
                            <p className="mb-1 text-[7px] leading-none font-bold text-slate-400">#{neg.id}</p>
                            <div
                              className={`w-fit rounded-[2px] border px-1 py-0.5 ${
                                neg.status === 'aceita'
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                  : 'border-orange-100 bg-orange-50 text-orange-600'
                              }`}
                            >
                              <p className="text-[6px] leading-none font-black uppercase tracking-tighter">{neg.status}</p>
                            </div>
                          </div>

                          <div className="flex flex-1 items-center justify-between gap-2 px-4">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[8px] leading-tight font-black uppercase text-slate-700">{seller?.name || '-'}</p>
                              <p className="text-[6px] font-bold uppercase tracking-tighter text-slate-400">Vendedor</p>
                            </div>
                            <div className="flex flex-col items-center opacity-20 transition-opacity group-hover:opacity-100">
                              <ArrowLeftRight className="h-2 w-2 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1 text-right">
                              <p className="truncate text-[8px] leading-tight font-black uppercase text-slate-700">{buyer?.name || '-'}</p>
                              <p className="text-[6px] font-bold uppercase tracking-tighter text-slate-400">Comprador</p>
                            </div>
                          </div>

                          <div className="w-24 shrink-0 border-l border-slate-50 px-3 text-right">
                            <p className="font-mono text-[9px] leading-none font-black text-emerald-600">R$ {Number(neg.brokerageFee).toLocaleString('pt-BR')}</p>
                            <p className="text-[6px] font-bold uppercase tracking-widest text-slate-400">
                              {neg.brokeragePayer === 'buyer' ? 'Comprador paga' : 'Vendedor paga'}
                            </p>
                          </div>

                          <div className="ml-2 flex shrink-0 gap-1">
                            <button
                              onClick={() => setActiveChat(neg.id)}
                              title="Abrir Chat"
                              className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-600"
                            >
                              <Handshake className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedNeg(neg);
                                setShowContractModal(true);
                                if (neg.status !== 'aceita') {
                                  void updateNegStatus(neg.id, 'aceita');
                                }
                              }}
                              title="Contrato"
                              className="rounded border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-all hover:border-slate-300 hover:text-slate-900"
                            >
                              <FileText className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-3">
                {[
                  { name: 'Soja', key: 'soja', color: 'bg-emerald-500' },
                  { name: 'Milho', key: 'milho', color: 'bg-blue-500' },
                  { name: 'Sorgo', key: 'sorgo', color: 'bg-orange-500' },
                ].map((grain) => {
                  const latest = priceData[priceData.length - 1][grain.key as 'soja' | 'milho' | 'sorgo'] as number;
                  const previous = priceData[priceData.length - 2][grain.key as 'soja' | 'milho' | 'sorgo'] as number;
                  const diff = latest - previous;
                  const isUp = diff >= 0;
                  return (
                    <div key={grain.name} className="flex flex-1 flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${grain.color}`} />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{grain.name}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="font-mono text-sm leading-none font-black text-slate-800">R$ {latest.toFixed(2)}</p>
                        <div className={`flex items-center gap-0.5 text-[9px] font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          <span>{Math.abs(diff).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-2">
                <h3 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Compra (Demanda)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500">{buyOffers.length} demandas</span>
                  <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${trendBackground} ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{marketTrend}</span>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto">
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="border-b border-slate-50 text-slate-400">
                      <th className="px-3 py-2 font-bold uppercase tracking-tighter">Produto</th>
                      <th className="px-3 py-2 text-right font-bold uppercase tracking-tighter">Preco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {buyOffers.map((offer) => (
                      <tr
                        key={offer.id}
                        draggable
                        onDragStart={(event) => handleDragStart(event, offer)}
                        onClick={() => setSelectedBuy(offer)}
                        onDoubleClick={() => setSelectedBuy(offer)}
                        className={`group cursor-grab select-none transition-all active:cursor-grabbing ${
                          selectedBuy?.id === offer.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-4 w-1 rounded-full bg-blue-500/20 transition-colors group-hover:bg-blue-500" />
                            <div>
                              <p className="leading-tight font-bold text-slate-700">{offer.grain}</p>
                              <p className="truncate text-[7px] uppercase tracking-tighter text-slate-400">{offer.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <div className={`h-1 w-1 rounded-full ${Number(offer.price) < 165 ? 'animate-pulse bg-red-500' : 'bg-slate-300'}`} />
                            <p className="font-mono leading-tight font-black text-blue-600">R$ {Number(offer.price).toFixed(2)}</p>
                          </div>
                          <p className="text-[7px] font-bold uppercase text-slate-500">
                            {Number(offer.quantity)} {offer.unit}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">{renderMarketInfoSection()}</div>
        )}

        {activeChat && <div className="fixed bottom-8 right-8 z-50 w-96 shadow-2xl">{renderChat(activeChat)}</div>}
      </div>
    );
  };
  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1A1A1A]">
      <div className="sticky top-0 z-50">
        <div className="relative flex overflow-hidden whitespace-nowrap border-b border-emerald-900 bg-emerald-950 py-2 text-xs text-white">
          <div className="flex w-max animate-marquee">
            {tickerItems.map((item, idx) => (
              <div key={idx} className="mx-6 flex items-center">
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

        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-600 p-2">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="leading-none text-xl font-black tracking-tight text-emerald-950">Alytha</h1>
              <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-600">Agro Marketing</span>
            </div>
          </div>

          <div className="flex items-center rounded-xl border border-gray-100 bg-gray-50 p-1">
            {['Todos', ...new Set(offers.map((offer) => offer.grain))].map((grain) => (
              <button
                key={grain}
                onClick={() => setSelectedGrain(grain)}
                className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedGrain === grain ? 'border border-gray-100 bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {grain}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="mr-2 hidden border-r border-gray-100 pr-6 text-right md:block">
              <p className="text-xs font-bold capitalize text-gray-900">{currentDate.split(',')[0]}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{currentDate.split(',')[1]?.trim()}</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl p-2 text-gray-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange-500" />
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-2xl border border-gray-100 bg-white py-3 shadow-2xl">
                    <div className="mb-2 flex items-center justify-between border-b border-gray-50 px-4 py-2">
                      <h3 className="font-bold text-gray-900">Notificacoes</h3>
                      <button className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700">
                        Marcar lidas
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {mockNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 ${
                            notif.unread ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <div className="mb-1 flex items-start justify-between">
                            <p className={`text-sm font-bold ${notif.unread ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                            {notif.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          </div>
                          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{notif.message}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{notif.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 px-4 pt-3">
                      <button className="w-full rounded-xl py-2.5 text-center text-xs font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900">
                        Ver todas as notificacoes
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex max-w-[11.5rem] items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition-all hover:border-gray-100 hover:bg-gray-50 sm:max-w-[13rem]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 shadow-sm">
                  <User className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="hidden min-w-0 flex-1 text-left sm:block">
                  <p className="truncate text-[11px] leading-tight font-bold text-gray-900">{currentUser.name || 'Nix System'}</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-600">CORRETOR</p>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 z-50 mt-2 max-h-[calc(100vh-5rem)] w-56 origin-top-right overflow-y-auto rounded-xl border border-gray-100 bg-white py-2 shadow-2xl sm:w-60">
                    <div className="mb-1.5 border-b border-gray-50 px-3 py-2">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Conta Profissional</p>
                      <p className="truncate text-xs font-bold text-gray-900">{currentUser.email}</p>
                    </div>

                    <div className="mb-1.5 border-b border-gray-50 bg-emerald-50/50 px-3 py-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Comissoes (Mes)</span>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowCommission(!showCommission);
                          }}
                          className="text-gray-400 transition-colors hover:text-gray-600"
                        >
                          {showCommission ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-base font-bold text-emerald-700">{showCommission ? 'R$ 12.450,00' : 'R$ •••••••'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 px-2">
                      <button className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600">
                        <div className="rounded-lg bg-gray-50 p-1.5 transition-colors group-hover:bg-white">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowCommissionModal(true);
                        }}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <div className="rounded-lg bg-gray-50 p-1.5 transition-colors group-hover:bg-white">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        Extrato de Comissoes
                      </button>
                      <button className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600">
                        <div className="rounded-lg bg-gray-50 p-1.5 transition-colors group-hover:bg-white">
                          <Settings className="h-3.5 w-3.5" />
                        </div>
                        Configuracoes
                      </button>
                      <button className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600">
                        <div className="rounded-lg bg-gray-50 p-1.5 transition-colors group-hover:bg-white">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </div>
                        Central de Ajuda
                      </button>
                      <button className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 transition-all hover:bg-emerald-50 hover:text-emerald-600">
                        <div className="rounded-lg bg-gray-50 p-1.5 transition-colors group-hover:bg-white">
                          <Headset className="h-3.5 w-3.5" />
                        </div>
                        Suporte Tecnico
                      </button>
                    </div>

                    <div className="sticky bottom-0 mt-2 border-t border-gray-50 bg-white px-2 pt-2">
                      <button
                        onClick={onLogout}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold text-red-500 transition-all hover:bg-red-50"
                      >
                        <div className="rounded-lg bg-red-50 p-1.5 transition-colors group-hover:bg-white">
                          <LogOut className="h-3.5 w-3.5" />
                        </div>
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      {error && (
        <div className="mx-auto mt-4 flex max-w-7xl items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 pb-8 pt-2">
        {loading ? (
          <div className="py-40 text-center text-gray-400">Sincronizando dados da plataforma...</div>
        ) : (
          renderBrokerMesa()
        )}
      </main>

      {renderContractModal()}
      {renderCommissionModal()}
    </div>
  );
}
