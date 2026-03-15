import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  MapPin, 
  Truck, 
  ShieldCheck,
  Wheat,
  User,
  X,
  CheckCircle2,
  Handshake,
  FileText,
  DollarSign,
  ChevronRight,
  LayoutGrid,
  Users,
  Settings,
  ArrowLeftRight,
  GanttChartSquare,
  AlertCircle,
  LogOut,
  HelpCircle,
  Bell,
  ChevronDown,
  Headset,
  TrendingDown,
  Eye,
  EyeOff,
  Receipt,
  ArrowRight,
  Warehouse,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Offer, Negotiation, User as UserType } from './types';

type Role = 'CLIENTE' | 'CORRETOR' | 'BACKOFFICE';
type View = 'LANDING_PRODUCER' | 'LANDING_BUYER' | 'APP';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const priceData = [
  { date: '01/03', soja: 132, milho: 58, sorgo: 42, trigo: 75 },
  { date: '04/03', soja: 134, milho: 59, sorgo: 43, trigo: 74 },
  { date: '07/03', soja: 133, milho: 61, sorgo: 44, trigo: 76 },
  { date: '10/03', soja: 135, milho: 60, sorgo: 43.5, trigo: 75.5 },
  { date: '13/03', soja: 135.5, milho: 62, sorgo: 45, trigo: 77 },
];

export default function App() {
  const [role, setRole] = useState<Role>('CLIENTE');
  const [currentView, setCurrentView] = useState<View>('APP');
  const [backofficeTab, setBackofficeTab] = useState<'DASHBOARD' | 'USERS' | 'OFFERS' | 'CONTRACTS' | 'SETTINGS' | 'CARRIER'>('DASHBOARD');
  const [brokerTab, setBrokerTab] = useState<'MESA' | 'MARKET_INFO'>('MESA');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [newOffer, setNewOffer] = useState<Partial<Offer>>({
    type: 'venda',
    grain: 'Soja',
    quantity: 0,
    unit: 'Sacas',
    price: 0,
    location: '',
    crop: '24/25',
    shipping: 'FOB',
    quality: { moisture: 14, impurity: 1, broken: 2, damaged: 2 },
    paymentTerms: 'À vista'
  });

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newOffer, userId: 101 }) // Mocking user ID
    });
    setShowNewOfferModal(false);
    loadData();
  };

  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showOfferDetailsModal, setShowOfferDetailsModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const marketData = [
    { type: 'quote', label: 'SOJA (Paranaguá)', value: 'R$ 135,50', trend: 'up', change: '+1.2%' },
    { type: 'quote', label: 'MILHO (B3)', value: 'R$ 64,20', trend: 'down', change: '-0.5%' },
    { type: 'quote', label: 'DÓLAR', value: 'R$ 5,12', trend: 'up', change: '+0.3%' },
    { type: 'news', text: 'Exportações de soja do Brasil devem atingir recorde este mês.' },
    { type: 'news', text: 'Clima seco no Sul preocupa produtores de milho safrinha.' },
    { type: 'quote', label: 'SOJA (Chicago)', value: 'US$ 12,40/bu', trend: 'up', change: '+0.8%' },
    { type: 'news', text: 'Demanda chinesa por grãos brasileiros continua aquecida.' },
  ];
  const tickerItems = [...marketData, ...marketData, ...marketData];

  const mockNotifications = [
    { id: 1, title: 'Nova Oferta de Soja', message: 'Fazenda Esperança publicou 5.000 sacas a R$ 135,00.', time: 'Há 5 min', unread: true },
    { id: 2, title: 'Negociação Atualizada', message: 'O cliente aceitou sua contraproposta na ordem #8492.', time: 'Há 2 horas', unread: true },
    { id: 3, title: 'Alerta de Mercado', message: 'Preço do milho subiu 2% na última hora.', time: 'Há 1 dia', unread: false },
  ];

  const renderCommissionModal = () => {
    if (!showCommissionModal) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">Extrato de Comissões</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Março 2026</p>
              </div>
            </div>
            <button onClick={() => setShowCommissionModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Recebido</p>
              <p className="text-xl font-black text-emerald-600">R$ 8.200,00</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">A Receber</p>
              <p className="text-xl font-black text-orange-500">R$ 4.250,00</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total do Mês</p>
              <p className="text-xl font-black text-gray-900">R$ 12.450,00</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Lançamentos Recentes</h4>
            {[
              { id: '1', date: '15 Mar 2026', client: 'Fazenda Esperança', type: 'Venda de Soja', value: 1250.00, status: 'pago' },
              { id: '2', date: '14 Mar 2026', client: 'AgroSul', type: 'Compra de Milho', value: 850.00, status: 'pendente' },
              { id: '3', date: '12 Mar 2026', client: 'Sementes Brasil', type: 'Venda de Soja', value: 3400.00, status: 'pago' },
              { id: '4', date: '10 Mar 2026', client: 'Fazenda São João', type: 'Venda de Milho', value: 900.00, status: 'pago' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'pago' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{item.client}</p>
                    <p className="text-xs text-gray-500">{item.type} • {item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">R$ {item.value.toFixed(2)}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${item.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  const renderOfferDetailsModal = () => {
    if (!selectedOffer) return null;
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xl p-10 shadow-2xl">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedOffer.type === 'venda' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                <Wheat className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">{selectedOffer.grain}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedOffer.type} • {selectedOffer.location}</p>
              </div>
            </div>
            <button onClick={() => setShowOfferDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Volume</p>
              <p className="text-lg font-bold">{selectedOffer.quantity.toLocaleString()} {selectedOffer.unit}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Preço</p>
              <p className="text-lg font-black text-emerald-700">R$ {selectedOffer.price.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-6 mb-10">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Safra</span>
                <span className="font-bold">{selectedOffer.crop}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Frete</span>
                <span className="font-bold">{selectedOffer.shipping}</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4">Especificações Técnicas</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-xs">
                <div className="flex justify-between"><span className="text-emerald-700/60">Umidade</span> <span className="font-bold text-emerald-900">{selectedOffer.quality.moisture}%</span></div>
                <div className="flex justify-between"><span className="text-emerald-700/60">Impureza</span> <span className="font-bold text-emerald-900">{selectedOffer.quality.impurity}%</span></div>
                <div className="flex justify-between"><span className="text-emerald-700/60">Avariados</span> <span className="font-bold text-emerald-900">{selectedOffer.quality.damaged}%</span></div>
                <div className="flex justify-between"><span className="text-emerald-700/60">Quebrados</span> <span className="font-bold text-emerald-900">{selectedOffer.quality.broken}%</span></div>
              </div>
            </div>
          </div>

          <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
            Tenho Interesse
          </button>
        </motion.div>
      </div>
    );
  };
  const [showContractModal, setShowContractModal] = useState(false);

  const renderContractModal = () => {
    if (!selectedNeg) return null;
    const buyer = users.find(u => u.id === selectedNeg.buyerId);
    const seller = users.find(u => u.id === selectedNeg.sellerId);
    const offer = allOffers.find(o => o.id === selectedNeg.offerId);

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] w-full max-w-3xl p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Contrato de Intermediação</h2>
              <p className="text-gray-400 font-mono text-xs">REF: #AGRO-{selectedNeg.id}-{new Date().getFullYear()}</p>
            </div>
            <button onClick={() => setShowContractModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Vendedor (Outorgante)</p>
              <p className="font-bold text-lg">{seller?.name}</p>
              <p className="text-sm text-gray-500">{seller?.email}</p>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Comprador (Outorgado)</p>
              <p className="font-bold text-lg">{buyer?.name}</p>
              <p className="text-sm text-gray-500">{buyer?.email}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12 space-y-6 border border-gray-100">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Produto</p>
                <p className="font-bold">{offer?.grain}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Quantidade</p>
                <p className="font-bold">{selectedNeg.proposedQuantity.toLocaleString()} {offer?.unit}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Preço Acordado</p>
                <p className="font-black text-emerald-700">R$ {selectedNeg.proposedPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Cláusula de Corretagem</p>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                Fica acordado o pagamento de comissão de corretagem no valor de 1% sobre o montante total da operação, 
                totalizando <span className="font-bold text-emerald-700">R$ {selectedNeg.brokerageFee.toLocaleString()}</span>, 
                a ser pago pelo vendedor à Nix Corretora após a liquidação financeira.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all">
              <FileText className="w-5 h-5" /> Baixar PDF
            </button>
            <button className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
              <ShieldCheck className="w-5 h-5" /> Assinar Digitalmente
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Broker Mesa State
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, any[]>>({});
  const [isDraggingOverSell, setIsDraggingOverSell] = useState(false);
  const [isDraggingOverBuy, setIsDraggingOverBuy] = useState(false);
  const [selectedGrain, setSelectedGrain] = useState<string>('Todos');

  const sendMessage = (negId: number, text: string, sender: string) => {
    const newMsg = { id: Date.now(), text, sender, time: new Date().toLocaleTimeString() };
    setMessages(prev => ({
      ...prev,
      [negId]: [...(prev[negId] || []), newMsg]
    }));
  };

  const renderChat = (negId: number) => {
    const neg = negotiations.find(n => n.id === negId);
    if (!neg) return null;
    const buyer = users.find(u => u.id === neg.buyerId);
    const seller = users.find(u => u.id === neg.sellerId);

    return (
      <div className="bg-white border border-gray-100 rounded-2xl flex flex-col h-[400px] shadow-sm">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Intermediação #{negId}</p>
            <p className="text-xs font-bold text-gray-700">Broker Hub: {buyer?.name} ↔ {seller?.name}</p>
          </div>
          <button onClick={() => setActiveChat(null)}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(messages[negId] || []).map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === 'Corretor' ? 'items-end' : 'items-start'}`}>
              <span className="text-[9px] font-bold text-gray-400 mb-1">{msg.sender} • {msg.time}</span>
              <div className={`px-3 py-2 rounded-xl text-xs max-w-[80%] ${msg.sender === 'Corretor' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {(messages[negId] || []).length === 0 && (
            <p className="text-center text-[10px] text-gray-400 mt-20">Inicie o diálogo com as partes para alinhar o contrato.</p>
          )}
        </div>
        <div className="p-4 border-t border-gray-50 flex gap-2">
          <input 
            type="text" 
            placeholder="Mensagem para as partes..."
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage(negId, (e.target as HTMLInputElement).value, 'Corretor');
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>
    );
  };
  const [selectedBuy, setSelectedBuy] = useState<Offer | null>(null);
  const [selectedSell, setSelectedSell] = useState<Offer | null>(null);

  useEffect(() => {
    loadData();
  }, [role]);

  const loadData = async () => {
    setLoading(true);
    const [offersRes, allOffersRes, negsRes, usersRes] = await Promise.all([
      fetch('/api/offers'),
      fetch('/api/offers?all=true'),
      fetch('/api/negotiations'),
      fetch('/api/users')
    ]);
    setOffers(await offersRes.json());
    setAllOffers(await allOffersRes.json());
    setNegotiations(await negsRes.json());
    setUsers(await usersRes.json());
    setLoading(false);
  };

  const handleMatch = async () => {
    if (!selectedBuy || !selectedSell) return;
    await fetch('/api/negotiations/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyOfferId: selectedBuy.id,
        sellOfferId: selectedSell.id
      })
    });
    setSelectedBuy(null);
    setSelectedSell(null);
    loadData();
    alert("Match realizado! Negociação iniciada na mesa.");
  };

  const removeOffer = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta oferta?")) return;
    await fetch(`/api/offers/${id}`, { method: 'DELETE' });
    loadData();
  };

  const removeUser = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este usuário?")) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    loadData();
  };

  const updateNegStatus = async (id: number, status: string) => {
    await fetch(`/api/negotiations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    loadData();
  };

  // --- RENDER HELPERS ---

  const renderLandingProducer = () => (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl"><Leaf className="text-white w-6 h-6" /></div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-emerald-950 leading-none">Alytha</h1>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-1">Agro Marketing</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('LANDING_BUYER')} className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors">Sou Comprador</button>
          <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">Entrar</button>
          <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="px-6 py-3 bg-emerald-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
            Cadastrar Safra
          </button>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Para Produtores Rurais
            </div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-8 text-slate-900">
              Venda sua safra com <span className="text-emerald-600">segurança</span> e as melhores taxas.
            </h2>
            <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
              Conectamos você diretamente aos maiores compradores do mercado. Negociação transparente, pagamento garantido e suporte especializado de nossos corretores.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="px-8 py-4 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-3">
                Começar a Vender <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 text-sm font-black uppercase tracking-widest rounded-xl hover:border-slate-300 transition-colors flex items-center justify-center gap-3">
                Falar com Consultor
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-600 rounded-[3rem] rotate-3 opacity-10"></div>
            <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1000&auto=format&fit=crop" alt="Plantação" className="rounded-[3rem] shadow-2xl relative z-10 object-cover aspect-[4/3]" referrerPolicy="no-referrer" />
            <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl z-20 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Garantia</p>
                <p className="text-sm font-bold text-slate-900">Pagamento Seguro</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-24 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-black tracking-tight text-slate-900 mb-4">Por que vender na Alytha?</h3>
              <p className="text-slate-500">Simplificamos a comercialização da sua safra do início ao fim.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: TrendingUp, title: 'Melhores Preços', desc: 'Acesso a cotações em tempo real e lances competitivos de múltiplos compradores.' },
                { icon: Handshake, title: 'Contratos Seguros', desc: 'Emissão automática de contratos digitais com validade jurídica e garantia de liquidação.' },
                { icon: Headset, title: 'Mesa de Operações', desc: 'Corretores especialistas acompanhando sua negociação do início ao fim.' }
              ].map((b, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                    <b.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-3">{b.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );

  const renderLandingBuyer = () => (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl"><Leaf className="text-white w-6 h-6" /></div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-white leading-none">Alytha</h1>
            <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest leading-none mt-1">Agro Marketing</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('LANDING_PRODUCER')} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Sou Produtor</button>
          <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="text-sm font-bold text-white hover:text-orange-400 transition-colors">Entrar</button>
          <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="px-6 py-3 bg-orange-500 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
            Encontrar Grãos
          </button>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-6 border border-orange-500/20">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              Para Indústrias e Tradings
            </div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-8 text-white">
              Compre grãos direto da fonte com <span className="text-orange-500">origem garantida</span>.
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              Acesso direto a milhares de produtores verificados. Garanta o volume necessário para sua operação com rastreabilidade e contratos digitais seguros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => { setRole('CLIENTE'); setCurrentView('APP'); }} className="px-8 py-4 bg-orange-500 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-3">
                Ver Ofertas Ativas <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-8 py-4 bg-transparent border-2 border-white/20 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:border-white/40 transition-colors flex items-center justify-center gap-3">
                Falar com a Mesa
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 rounded-[3rem] -rotate-3 opacity-20"></div>
            <img src="https://images.unsplash.com/photo-1586771107445-d3afcb0de51f?q=80&w=1000&auto=format&fit=crop" alt="Armazém de Grãos" className="rounded-[3rem] shadow-2xl relative z-10 object-cover aspect-[4/3]" referrerPolicy="no-referrer" />
            <div className="absolute -top-8 -right-8 bg-slate-900 p-6 rounded-2xl shadow-xl z-20 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logística</p>
                <p className="text-sm font-bold text-white">Volume Garantido</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-24 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-black tracking-tight text-white mb-4">Vantagens para Compradores</h3>
              <p className="text-slate-400">Eficiência e segurança na originação de grãos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: LayoutGrid, title: 'Originação Direta', desc: 'Reduza custos intermediários negociando diretamente com produtores validados.' },
                { icon: FileText, title: 'Compliance e ESG', desc: 'Rastreabilidade completa da origem do grão e documentação socioambiental em dia.' },
                { icon: ArrowLeftRight, title: 'Liquidez Imediata', desc: 'Mesa de operações ativa para garantir o fechamento rápido dos seus lotes.' }
              ].map((b, i) => (
                <div key={i} className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 text-orange-500">
                    <b.icon className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-3">{b.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );

  const renderMarketInfoSection = () => (
    <div className="space-y-8 pb-8">
      {/* Cotações por Praça e Bolsa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 lg:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <MapPin className="text-emerald-600" /> Cotações por Praça (Físico)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { city: 'Sorriso', state: 'MT', soja: 135.50, milho: 62.00, sorgo: 45.00 },
              { city: 'Rio Verde', state: 'GO', soja: 138.00, milho: 65.50, sorgo: 48.00 },
              { city: 'Cascavel', state: 'PR', soja: 142.00, milho: 68.00, sorgo: 50.00 },
              { city: 'Paranaguá', state: 'PR', soja: 145.50, milho: 70.00, sorgo: 52.00 },
            ].map(praca => (
              <div key={praca.city} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{praca.city}</h3>
                  <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md">{praca.state}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Soja</span>
                    <span className="text-sm font-mono font-black text-emerald-700">R$ {praca.soja.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Milho</span>
                    <span className="text-sm font-mono font-black text-blue-700">R$ {praca.milho.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <TrendingUp className="text-emerald-600" /> Bolsas (Futuro)
          </h2>
          <div className="space-y-4">
            {[
              { name: 'CBOT (Soja)', price: 12.45, unit: 'USD/bu', trend: 'up' },
              { name: 'CBOT (Milho)', price: 4.50, unit: 'USD/bu', trend: 'down' },
              { name: 'B3 (Soja)', price: 148.20, unit: 'R$/sc', trend: 'stable' },
            ].map((bolsa, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-900">{bolsa.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-black text-emerald-700">{bolsa.price} {bolsa.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logística e Armazenagem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transportes */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Truck className="text-blue-600" /> Fretes e Transportes
          </h2>
          <div className="space-y-4">
            {[
              { route: 'Sorriso/MT → Paranaguá/PR', price: 380, trend: 'up' },
              { route: 'Rio Verde/GO → Santos/SP', price: 250, trend: 'down' },
            ].map((freight, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-gray-900">{freight.route}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-black text-blue-700">R$ {freight.price}/t</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Armazenagem */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:p-8">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Warehouse className="text-orange-600" /> Silos e Armazenagem
          </h2>
          <div className="space-y-4">
            {[
              { region: 'Mato Grosso (Médio Norte)', capacity: '85%', cost: 12.50 },
              { region: 'Goiás (Sudoeste)', capacity: '70%', cost: 10.00 },
            ].map((silo, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-gray-900">{silo.region}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-black text-orange-700">R$ {silo.cost.toFixed(2)}/t</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Cotação Soja</h3>
          <p className="text-xl lg:text-2xl font-black text-emerald-700">R$ 135,50</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Cotação Milho</h3>
          <p className="text-xl lg:text-2xl font-black text-blue-700">R$ 62,00</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Cotação Sorgo</h3>
          <p className="text-xl lg:text-2xl font-black text-orange-700">R$ 45,00</p>
        </div>
        
        {/* Última Negociação Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full opacity-50"></div>
          <div className="flex items-center gap-2 mb-1.5 relative z-10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <h3 className="text-emerald-600 text-[9px] font-bold uppercase tracking-widest">Último Negócio</h3>
          </div>
          <p className="text-sm font-black text-gray-900 relative z-10">Soja • 10.000 sc</p>
          <p className="text-[10px] text-gray-500 mt-0.5 relative z-10">Corretor: <span className="font-bold text-emerald-700">Carlos Silva</span></p>
        </div>

        <button onClick={() => setShowNewOfferModal(true)} className="bg-emerald-900 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between group">
          <div className="text-left">
            <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest">Ação Rápida</p>
            <p className="text-sm lg:text-base font-bold mt-1">Criar Oferta</p>
          </div>
          <PlusCircle className="w-6 h-6 lg:w-8 lg:h-8 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="text-emerald-600" /> Tendência de Preços
            </h2>
            <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-emerald-600"><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></div> Soja</span>
              <span className="flex items-center gap-1.5 text-blue-600"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div> Milho</span>
              <span className="flex items-center gap-1.5 text-orange-600"><div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> Sorgo</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Gráfico Menor */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceData}>
                  <defs>
                    <linearGradient id="colorSoja" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMilho" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSorgo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} width={30} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="soja" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorSoja)" />
                  <Area type="monotone" dataKey="milho" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorMilho)" />
                  <Area type="monotone" dataKey="sorgo" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorSorgo)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela de Valores do Mercado */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Físico (R$)</th>
                    <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Futuro (US$)</th>
                    <th className="pb-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Var.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-3 text-xs font-bold text-gray-900">Soja</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">135,50</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">11.85</td>
                    <td className="py-3 text-xs font-mono font-bold text-emerald-600 text-right">+1.2%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-xs font-bold text-gray-900">Milho</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">62,00</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">4.30</td>
                    <td className="py-3 text-xs font-mono font-bold text-emerald-600 text-right">+0.8%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-xs font-bold text-gray-900">Sorgo</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">45,00</td>
                    <td className="py-3 text-xs font-mono text-gray-400 text-right">--</td>
                    <td className="py-3 text-xs font-mono font-bold text-red-500 text-right">-0.5%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-xs font-bold text-gray-900">Trigo</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">77,00</td>
                    <td className="py-3 text-xs font-mono text-gray-600 text-right">5.60</td>
                    <td className="py-3 text-xs font-mono font-bold text-emerald-600 text-right">+2.1%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-emerald-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
          <h3 className="text-lg font-bold mb-2">Relatório Semanal</h3>
          <p className="text-emerald-200 text-sm mb-6 leading-relaxed">O mercado de soja apresentou alta de 2.4% no Mato Grosso devido à demanda chinesa aquecida.</p>
          <div className="space-y-4 relative z-10">
            <div className="bg-white/10 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-300 uppercase mb-1">Destaque</p>
              <p className="text-sm font-bold">Milho Safrinha com liquidez recorde em Goiás.</p>
            </div>
            <button className="w-full py-3 bg-white text-emerald-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
              Ver Relatório Completo
            </button>
          </div>
          <Wheat className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 rotate-12" />
        </div>
      </div>

      {renderMarketInfoSection()}

      <div className="bg-white rounded-3xl border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-emerald-600" /> Mercado Ativo
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar grão ou local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-emerald-500 w-64"
              />
            </div>
            <button className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {offers
            .filter(o => 
              o.grain.toLowerCase().includes(searchTerm.toLowerCase()) || 
              o.location.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(offer => (
            <div 
              key={offer.id} 
              onClick={() => {
                setSelectedOffer(offer);
                setShowOfferDetailsModal(true);
              }}
              className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${offer.type === 'venda' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Wheat />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{offer.type}</p>
                  <h4 className="font-bold">{offer.grain} - {offer.location}</h4>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-emerald-700">R$ {offer.price.toFixed(2)}</p>
                <p className="text-xs text-gray-400">{offer.quantity} {offer.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {renderMarketInfoSection()}
    </div>
  );

  const renderBrokerMesa = () => {
    const handleDragStart = (e: React.DragEvent, offer: Offer) => {
      e.dataTransfer.setData('offerId', offer.id.toString());
      e.dataTransfer.setData('offerType', offer.type);
    };

    const handleDrop = (e: React.DragEvent, targetType: 'venda' | 'compra') => {
      e.preventDefault();
      setIsDraggingOverSell(false);
      setIsDraggingOverBuy(false);
      
      const offerId = e.dataTransfer.getData('offerId');
      const offerType = e.dataTransfer.getData('offerType');
      
      if (offerType === targetType) {
        const offer = offers.find(o => o.id === Number(offerId));
        if (offer) {
          if (targetType === 'venda') setSelectedSell(offer);
          else setSelectedBuy(offer);
        }
      }
    };

    const sellOffers = offers.filter(o => o.type === 'venda' && (selectedGrain === 'Todos' || o.grain === selectedGrain));
    const buyOffers = offers.filter(o => o.type === 'compra' && (selectedGrain === 'Todos' || o.grain === selectedGrain));
    
    const pendingNegotiations = negotiations.filter(n => n.status === 'pendente').length;
    const finishedNegotiations = negotiations.filter(n => n.status === 'aceita' || n.status === 'recusada').length;

    let marketTrend = 'Neutro';
    let trendColor = 'text-slate-500';
    let trendBg = 'bg-slate-100';
    let TrendIcon = ArrowRight;

    if (buyOffers.length > sellOffers.length * 1.2) {
      marketTrend = 'Mais Comprador';
      trendColor = 'text-blue-600';
      trendBg = 'bg-blue-50';
      TrendIcon = TrendingUp;
    } else if (sellOffers.length > buyOffers.length * 1.2) {
      marketTrend = 'Mais Vendedor';
      trendColor = 'text-orange-600';
      trendBg = 'bg-orange-50';
      TrendIcon = TrendingDown;
    }

    return (
      <div className="h-[calc(100vh-120px)] flex flex-col gap-3 overflow-hidden">
        {/* Header Compact */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mesa de Operações</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trading Desk • Live Market</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Volume 24h</p>
                  <p className="text-[11px] font-mono font-black text-slate-700 leading-none">12.450<span className="text-[8px] ml-0.5 text-slate-400">t</span></p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Matches Hoje</p>
                  <p className="text-[11px] font-mono font-black text-emerald-600 leading-none">42</p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Aguardando</p>
                  <p className="text-[11px] font-mono font-black text-orange-600 leading-none">{pendingNegotiations}</p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Finalizadas</p>
                  <p className="text-[11px] font-mono font-black text-blue-600 leading-none">{finishedNegotiations}</p>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
              <Headset className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Suporte Técnico</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 shrink-0">
          {[
            { id: 'MESA', label: 'Mesa de Operações', icon: LayoutGrid },
            { id: 'MARKET_INFO', label: 'Cotações & Logística', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setBrokerTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
                brokerTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Dashboard Grid */}
        {brokerTab === 'MESA' ? (
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          
          {/* Left Column: Sell Orders */}
          <div className="col-span-3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-[9px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Venda (Ofertas)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500">{sellOffers.length} ofertas</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${trendBg} ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{marketTrend}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-slate-400 border-b border-slate-50">
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter">Produto</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter text-right">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {offers
                    .filter(o => o.type === 'venda' && (selectedGrain === 'Todos' || o.grain === selectedGrain))
                    .map(o => (
                    <tr 
                      key={o.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, o)}
                      onClick={() => setSelectedSell(o)}
                      onDoubleClick={() => setSelectedSell(o)}
                      className={`cursor-grab active:cursor-grabbing transition-all group select-none ${selectedSell?.id === o.id ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-4 bg-orange-500/20 rounded-full group-hover:bg-orange-500 transition-colors"></div>
                          <div>
                            <p className="font-bold text-slate-700 leading-tight">{o.grain}</p>
                            <p className="text-[7px] text-slate-400 truncate uppercase tracking-tighter">{o.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className={`w-1 h-1 rounded-full ${o.price > 160 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <p className="font-mono font-black text-orange-600 leading-tight">R$ {o.price.toFixed(2)}</p>
                        </div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase">{o.quantity} {o.unit}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Center Column: Match Maker & Monitor */}
          <div className="col-span-6 flex flex-col gap-4 min-h-0">
            
            {/* Match Maker Zone */}
            <div className="bg-slate-900 rounded-xl p-3 text-white shadow-2xl border border-slate-800 relative overflow-hidden shrink-0">
              {/* Background Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/10 blur-[60px] pointer-events-none"></div>
              
              <div className="relative z-10 flex items-center gap-3">
                {/* Sell Drop Zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOverSell(true); }}
                  onDragLeave={() => setIsDraggingOverSell(false)}
                  onDrop={(e) => handleDrop(e, 'venda')}
                  className={`flex-1 p-2.5 rounded-lg border-2 border-dashed transition-all duration-300 ${isDraggingOverSell ? 'border-orange-500 bg-orange-500/20 scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.3)]' : selectedSell ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-700 bg-slate-800/40 hover:border-orange-500/30'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Vendedor</p>
                    <div className="flex items-center gap-2">
                      {selectedSell && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedSell(null); }}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {selectedSell && <span className="text-[7px] font-black bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">SELL</span>}
                    </div>
                  </div>
                  {selectedSell ? (
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[11px] font-black text-white leading-none mb-0.5">{selectedSell.grain}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-tighter truncate max-w-[100px]">{selectedSell.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-mono font-black text-orange-400 leading-none">R$ {selectedSell.price.toFixed(2)}</p>
                        <p className="text-[7px] text-slate-500 font-bold uppercase">{selectedSell.quantity} {selectedSell.unit}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1.5 flex flex-col items-center justify-center border border-slate-800/50 rounded bg-slate-900/50">
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Aguardando Oferta</p>
                    </div>
                  )}
                </div>

                {/* Match Action */}
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="relative">
                    {selectedBuy && selectedSell && (
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md animate-pulse opacity-50"></div>
                    )}
                    <button 
                      disabled={!selectedBuy || !selectedSell}
                      onClick={handleMatch}
                      className="relative z-10 flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-full hover:bg-emerald-500 transition-all disabled:opacity-10 disabled:grayscale shadow-xl shadow-emerald-900/40 active:scale-95"
                    >
                      <ArrowLeftRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Executar</p>
                    {selectedBuy && selectedSell && (
                      <div className="flex flex-col items-center">
                        <p className={`text-[9px] font-mono font-black ${selectedSell.price <= selectedBuy.price ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedSell.price <= selectedBuy.price ? '+' : ''}{(selectedBuy.price - selectedSell.price).toFixed(2)}
                        </p>
                        <p className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Spread</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buy Drop Zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingOverBuy(true); }}
                  onDragLeave={() => setIsDraggingOverBuy(false)}
                  onDrop={(e) => handleDrop(e, 'compra')}
                  className={`flex-1 p-2.5 rounded-lg border-2 border-dashed transition-all duration-300 ${isDraggingOverBuy ? 'border-blue-500 bg-blue-500/20 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)]' : selectedBuy ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-700 bg-slate-800/40 hover:border-blue-500/30'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Comprador</p>
                    <div className="flex items-center gap-2">
                      {selectedBuy && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedBuy(null); }}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {selectedBuy && <span className="text-[7px] font-black bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">BUY</span>}
                    </div>
                  </div>
                  {selectedBuy ? (
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[11px] font-black text-white leading-none mb-0.5">{selectedBuy.grain}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-tighter truncate max-w-[100px]">{selectedBuy.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-mono font-black text-blue-400 leading-none">R$ {selectedBuy.price.toFixed(2)}</p>
                        <p className="text-[7px] text-slate-500 font-bold uppercase">{selectedBuy.quantity} {selectedBuy.unit}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1.5 flex flex-col items-center justify-center border border-slate-800/50 rounded bg-slate-900/50">
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Aguardando Demanda</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monitor Zone */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <GanttChartSquare className="w-3 h-3" />
                  Monitor de Negociações
                </h3>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Aguardando</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Finalizadas</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                {negotiations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                    <GanttChartSquare className="w-8 h-8 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma negociação ativa</p>
                  </div>
                ) : negotiations.map(neg => {
                  const buyer = users.find(u => u.id === neg.buyerId);
                  const seller = users.find(u => u.id === neg.sellerId);
                  return (
                    <div key={neg.id} className="group flex items-center hover:bg-slate-50 transition-colors px-3 py-1.5">
                      <div className="w-12 shrink-0">
                        <p className="text-[7px] font-mono font-bold text-slate-400 leading-none mb-1">#{neg.id}</p>
                        <div className={`w-fit px-1 py-0.5 rounded-[2px] border ${
                          neg.status === 'aceita' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          <p className="text-[6px] font-black uppercase tracking-tighter leading-none">{neg.status}</p>
                        </div>
                      </div>

                      <div className="flex-1 flex items-center justify-between px-4 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black text-slate-700 truncate uppercase leading-tight">{seller?.name}</p>
                          <p className="text-[6px] text-slate-400 font-bold uppercase tracking-tighter">Vendedor</p>
                        </div>
                        <div className="flex flex-col items-center opacity-20 group-hover:opacity-100 transition-opacity">
                          <ArrowLeftRight className="w-2 h-2 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-[8px] font-black text-slate-700 truncate uppercase leading-tight">{buyer?.name}</p>
                          <p className="text-[6px] text-slate-400 font-bold uppercase tracking-tighter">Comprador</p>
                        </div>
                      </div>

                      <div className="w-24 shrink-0 text-right px-3 border-l border-slate-50">
                        <p className="text-[9px] font-mono font-black text-emerald-600 leading-none">R$ {neg.brokerageFee.toLocaleString()}</p>
                        <p className="text-[6px] text-slate-400 font-bold uppercase tracking-widest">Comissão</p>
                      </div>

                      <div className="flex gap-1 shrink-0 ml-2">
                        <button 
                          onClick={() => setActiveChat(neg.id)} 
                          title="Abrir Chat"
                          className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                        >
                          <Handshake className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedNeg(neg);
                            setShowContractModal(true);
                            if (neg.status !== 'aceita') updateNegStatus(neg.id, 'aceita');
                          }}
                          title="Contrato"
                          className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Market Info Zone */}
            <div className="flex gap-3 shrink-0">
              {[
                { name: 'Soja', key: 'soja', color: 'bg-emerald-500' },
                { name: 'Milho', key: 'milho', color: 'bg-blue-500' },
                { name: 'Sorgo', key: 'sorgo', color: 'bg-orange-500' },
                { name: 'Trigo', key: 'trigo', color: 'bg-amber-500' }
              ].map(grain => {
                const latest = priceData[priceData.length - 1][grain.key as keyof typeof priceData[0]] as number;
                const previous = priceData[priceData.length - 2][grain.key as keyof typeof priceData[0]] as number;
                const diff = latest - previous;
                const isUp = diff >= 0;
                return (
                  <div key={grain.name} className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${grain.color}`}></div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{grain.name}</p>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="font-mono font-black text-slate-800 text-sm leading-none">R$ {latest.toFixed(2)}</p>
                      <div className={`flex items-center gap-0.5 text-[9px] font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>{Math.abs(diff).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Buy Orders */}
          <div className="col-span-3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Compra (Demanda)
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500">{buyOffers.length} demandas</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${trendBg} ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">{marketTrend}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-slate-400 border-b border-slate-50">
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter">Produto</th>
                    <th className="px-3 py-2 font-bold uppercase tracking-tighter text-right">Preço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {offers
                    .filter(o => o.type === 'compra' && (selectedGrain === 'Todos' || o.grain === selectedGrain))
                    .map(o => (
                    <tr 
                      key={o.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, o)}
                      onClick={() => setSelectedBuy(o)}
                      onDoubleClick={() => setSelectedBuy(o)}
                      className={`cursor-grab active:cursor-grabbing transition-all group select-none ${selectedBuy?.id === o.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-4 bg-blue-500/20 rounded-full group-hover:bg-blue-500 transition-colors"></div>
                          <div>
                            <p className="font-bold text-slate-700 leading-tight">{o.grain}</p>
                            <p className="text-[7px] text-slate-400 truncate uppercase tracking-tighter">{o.location}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className={`w-1 h-1 rounded-full ${o.price < 165 ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <p className="font-mono font-black text-blue-600 leading-tight">R$ {o.price.toFixed(2)}</p>
                        </div>
                        <p className="text-[7px] text-slate-500 font-bold uppercase">{o.quantity} {o.unit}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {renderMarketInfoSection()}
          </div>
        )}

        {activeChat && (
          <div className="fixed bottom-8 right-8 w-96 z-50 shadow-2xl">
            {renderChat(activeChat)}
          </div>
        )}
      </div>
    );
  };

  const renderBackofficeDashboard = () => {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col gap-3 overflow-hidden">
        {/* Header Compact */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Administração</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Backoffice • Gestão Global</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Usuários</p>
                  <p className="text-[11px] font-mono font-black text-slate-700 leading-none">{users.length}</p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Ofertas Ativas</p>
                  <p className="text-[11px] font-mono font-black text-emerald-600 leading-none">{offers.length}</p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Negócios (Mês)</p>
                  <p className="text-[11px] font-mono font-black text-blue-600 leading-none">{negotiations.filter(n => n.status === 'aceita').length}</p>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div>
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Volume (T)</p>
                  <p className="text-[11px] font-mono font-black text-orange-600 leading-none">45.2k</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 shrink-0">
          {[
            { id: 'DASHBOARD', label: 'Visão Geral', icon: LayoutGrid },
            { id: 'USERS', label: 'Usuários', icon: Users },
            { id: 'OFFERS', label: 'Ofertas & Demandas', icon: Wheat },
            { id: 'CONTRACTS', label: 'Contratos', icon: FileText },
            { id: 'CARRIER', label: 'Transportadores', icon: Truck },
            { id: 'SETTINGS', label: 'Configurações', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setBackofficeTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
                backofficeTab === tab.id 
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
          {backofficeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-12 gap-4">
              {/* Logs */}
              <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Logs Recentes do Sistema
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Novo Contrato Gerado</p>
                        <p className="text-[10px] text-slate-500">Contrato #42 - 5000 sacas de Soja</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Há 5 min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Nova Oferta de Venda</p>
                        <p className="text-[10px] text-slate-500">João Fazendeiro - Sorriso/MT</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Há 12 min</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Novo Usuário Cadastrado</p>
                        <p className="text-[10px] text-slate-500">Agro Indústria S.A. (Comprador)</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Há 1 hora</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Settings className="w-3 h-3" /> Ações Rápidas
                </h3>
                <div className="space-y-2">
                  <button onClick={() => setBackofficeTab('USERS')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-left">
                    <span className="text-xs font-bold text-slate-700">Aprovar Novos Cadastros</span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded-full">3 Pendentes</span>
                  </button>
                  <button onClick={() => setBackofficeTab('CONTRACTS')} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-left">
                    <span className="text-xs font-bold text-slate-700">Revisar Contratos</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full">1 Aguardando</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-left">
                    <span className="text-xs font-bold text-slate-700">Gerar Relatório Mensal</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {backofficeTab === 'USERS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> Gestão de Usuários
                </h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-[10px] font-bold uppercase tracking-widest">
                    <PlusCircle className="w-3 h-3" /> Novo Usuário
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome / Empresa</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-xs">{u.name[0]}</div>
                            <span className="text-xs font-bold text-slate-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-500">{u.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            u.type === 'produtor' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {u.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-widest">Ativo</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {backofficeTab === 'OFFERS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Wheat className="w-3 h-3" /> Todas as Ofertas
                </h3>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Grão / Local</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allOffers.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            o.type === 'venda' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {o.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="text-xs font-bold text-slate-900">{o.grain}</p>
                          <p className="text-[10px] text-slate-500">{o.location}</p>
                        </td>
                        <td className="p-3 text-xs font-mono text-slate-700">{o.quantity} {o.unit}</td>
                        <td className="p-3 text-xs font-mono font-bold text-emerald-700">R$ {o.price.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            o.status === 'ativa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeOffer(o.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {backofficeTab === 'CONTRACTS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Contratos e Negociações
                </h3>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-8 text-center text-slate-500 text-sm">
                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-700">Módulo de Contratos</p>
                <p className="text-xs mt-1">Gestão de assinaturas digitais, minutas e liquidações financeiras.</p>
              </div>
            </div>
          )}

          {backofficeTab === 'CARRIER' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-3 h-3" /> Gestão de Transportadores
                </h3>
                <div className="relative">
                  <Search className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-8 text-center text-slate-500 text-sm">
                <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="font-bold text-slate-700">Módulo de Transportadores</p>
                <p className="text-xs mt-1">Gestão de frota, rotas, fretes e oportunidades de carga.</p>
              </div>
            </div>
          )}

          {backofficeTab === 'SETTINGS' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-3 h-3" /> Configurações do Sistema
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest">
                  Salvar Alterações
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-100 pb-2">Taxas e Comissões</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Comissão Padrão (Venda)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={1.5} className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-500" />
                        <span className="text-slate-500 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Comissão Padrão (Compra)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={0.5} className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-500" />
                        <span className="text-slate-500 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest border-b border-slate-100 pb-2">Integrações</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Assinatura Digital (DocuSign)</p>
                        <p className="text-[10px] text-slate-500">Ativar envio automático de minutas.</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">Bacen / PIX</p>
                        <p className="text-[10px] text-slate-500">Liquidação financeira via escrow.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Role Switcher (Demo Only) */}
      <div className="bg-emerald-900 text-white px-6 py-2 flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="text-emerald-400">Páginas:</span>
          <button onClick={() => setCurrentView('LANDING_PRODUCER')} className={`hover:text-emerald-300 transition-colors ${currentView === 'LANDING_PRODUCER' ? 'text-white border-b border-white' : 'text-emerald-200'}`}>Produtor</button>
          <button onClick={() => setCurrentView('LANDING_BUYER')} className={`hover:text-emerald-300 transition-colors ${currentView === 'LANDING_BUYER' ? 'text-white border-b border-white' : 'text-emerald-200'}`}>Comprador</button>
        </div>
        <div className="w-px h-4 bg-emerald-700"></div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400">App (Logado):</span>
          {(['CLIENTE', 'CORRETOR', 'BACKOFFICE'] as Role[]).map(r => (
            <button 
              key={r} 
              onClick={() => { setRole(r); setCurrentView('APP'); }}
              className={`hover:text-emerald-300 transition-colors ${role === r && currentView === 'APP' ? 'text-white border-b border-white' : 'text-emerald-200'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {currentView === 'LANDING_PRODUCER' && renderLandingProducer()}
      {currentView === 'LANDING_BUYER' && renderLandingBuyer()}

      {currentView === 'APP' && (
        <>
          {/* Navigation & Ticker */}
          <div className="sticky top-0 z-50">
        {/* Ticker Bar */}
        <div className="bg-emerald-950 text-white text-xs py-2 overflow-hidden flex whitespace-nowrap relative border-b border-emerald-900">
          <div className="flex animate-marquee w-max">
            {tickerItems.map((item, idx) => (
              <div key={idx} className="flex items-center mx-6">
                {item.type === 'quote' ? (
                  <>
                    <span className="font-bold mr-2 text-emerald-100">{item.label}</span>
                    <span className="mr-2 font-mono">{item.value}</span>
                    <span className={`flex items-center font-bold ${item.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {item.change}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                    <span className="text-emerald-50">{item.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg"><Leaf className="text-white w-6 h-6" /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-emerald-950 leading-none">Alytha</h1>
              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-0.5">Agro Marketing</span>
            </div>
          </div>

          {/* Grain Filter (Global Header) */}
          {role === 'CORRETOR' && (
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
              {['Todos', ...new Set(offers.map(o => o.grain))].map(grain => (
                <button
                  key={grain}
                  onClick={() => setSelectedGrain(grain)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    selectedGrain === grain 
                      ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {grain}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right mr-2 border-r border-gray-100 pr-6">
              <p className="text-xs font-bold text-gray-900 capitalize">{currentDate.split(',')[0]}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{currentDate.split(',')[1]?.trim()}</p>
            </div>

            <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  ></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 origin-top-right"
                  >
                    <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-900">Notificações</h3>
                      <button className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">Marcar lidas</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {mockNotifications.map(notif => (
                        <div key={notif.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${notif.unread ? 'bg-emerald-50/30' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <p className={`text-sm font-bold ${notif.unread ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</p>
                            {notif.unread && <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></span>}
                          </div>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{notif.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pt-3 mt-1">
                      <button className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors text-center">
                        Ver todas as notificações
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center border border-emerald-200 shadow-sm">
                <User className="text-emerald-700 w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-gray-900 leading-tight">Nix System</p>
                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">{role}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  ></div>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 origin-top-right"
                  >
                    <div className="px-4 py-2 mb-2 border-b border-gray-50">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Conta Profissional</p>
                      <p className="text-sm font-bold text-gray-900">nix.dev.web@gmail.com</p>
                    </div>

                    {role === 'CORRETOR' && (
                      <div className="px-4 py-3 mb-2 bg-emerald-50/50 border-b border-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Comissões (Mês)</span>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            setShowCommission(!showCommission);
                          }} className="text-gray-400 hover:text-gray-600 transition-colors">
                            {showCommission ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-700 text-lg">
                            {showCommission ? 'R$ 12.450,00' : 'R$ •••••••'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="px-2 space-y-1">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group">
                        <div className="p-1.5 bg-gray-50 group-hover:bg-white rounded-lg transition-colors">
                          <User className="w-4 h-4" />
                        </div>
                        Meu Perfil
                      </button>
                      {role === 'CORRETOR' && (
                        <button 
                          onClick={() => {
                            setShowUserMenu(false);
                            setShowCommissionModal(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group"
                        >
                          <div className="p-1.5 bg-gray-50 group-hover:bg-white rounded-lg transition-colors">
                            <Receipt className="w-4 h-4" />
                          </div>
                          Extrato de Comissões
                        </button>
                      )}
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group">
                        <div className="p-1.5 bg-gray-50 group-hover:bg-white rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                        </div>
                        Configurações
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group">
                        <div className="p-1.5 bg-gray-50 group-hover:bg-white rounded-lg transition-colors">
                          <HelpCircle className="w-4 h-4" />
                        </div>
                        Central de Ajuda
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all group">
                        <div className="p-1.5 bg-gray-50 group-hover:bg-white rounded-lg transition-colors">
                          <Headset className="w-4 h-4" />
                        </div>
                        Suporte Técnico
                      </button>
                    </div>

                    <div className="mt-3 pt-3 px-2 border-t border-gray-50">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all group">
                        <div className="p-1.5 bg-red-50 group-hover:bg-white rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" />
                        </div>
                        Sair da Conta
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-2 pb-8">
        {loading ? (
          <div className="py-40 text-center text-gray-400">Sincronizando dados da plataforma...</div>
        ) : (
          <>
            {role === 'CLIENTE' && renderClientDashboard()}
            {role === 'CORRETOR' && renderBrokerMesa()}
            {role === 'BACKOFFICE' && renderBackofficeDashboard()}
          </>
        )}
      </main>

      {renderContractModal()}
      {renderOfferDetailsModal()}
      {renderCommissionModal()}

      {/* New Offer Modal */}
      <AnimatePresence>
        {showNewOfferModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl my-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-emerald-900">Nova Oferta de Mercado</h3>
                  <p className="text-sm text-gray-500">Preencha os detalhes técnicos da sua oferta.</p>
                </div>
                <button 
                  onClick={() => setShowNewOfferModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateOffer} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo de Oferta</label>
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => setNewOffer({...newOffer, type: 'venda'})}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newOffer.type === 'venda' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        Venda
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewOffer({...newOffer, type: 'compra'})}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${newOffer.type === 'compra' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                      >
                        Compra
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produto</label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newOffer.grain}
                      onChange={e => setNewOffer({...newOffer, grain: e.target.value})}
                    >
                      <option>Soja</option>
                      <option>Milho</option>
                      <option>Sorgo</option>
                      <option>Trigo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantidade</label>
                    <input 
                      type="number"
                      placeholder="0"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={e => setNewOffer({...newOffer, quantity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unidade</label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newOffer.unit}
                      onChange={e => setNewOffer({...newOffer, unit: e.target.value})}
                    >
                      <option>Sacas</option>
                      <option>Toneladas</option>
                      <option>Kg</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preço (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={e => setNewOffer({...newOffer, price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localização</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Cidade - UF"
                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        onChange={e => setNewOffer({...newOffer, location: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Safra</label>
                    <input 
                      type="text"
                      placeholder="24/25"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      onChange={e => setNewOffer({...newOffer, crop: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Parâmetros de Qualidade</p>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Umidade', key: 'moisture' },
                      { label: 'Impureza', key: 'impurity' },
                      { label: 'Avariados', key: 'damaged' },
                      { label: 'Quebrados', key: 'broken' }
                    ].map(param => (
                      <div key={param.key} className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-500">{param.label} (%)</label>
                        <input 
                          type="number"
                          defaultValue={newOffer.quality?.[param.key as keyof typeof newOffer.quality]}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                          onChange={e => setNewOffer({
                            ...newOffer, 
                            quality: { ...newOffer.quality!, [param.key]: parseFloat(e.target.value) }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewOfferModal(false)}
                    className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                  >
                    Publicar Oferta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
