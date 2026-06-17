import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import OfferForm from '../components/OfferForm';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import type { PublicBrokerProfilePayload } from '../types';

export default function BrokerExclusiveOfferPage() {
  const { token, mode } = useParams<{ token: string; mode: string }>();
  const [brokerName, setBrokerName] = useState('');
  const [brokerCompany, setBrokerCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadBroker = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch(`/broker-links/${token}/`);
        const payload = (await response.json().catch(() => null)) as PublicBrokerProfilePayload | { detail?: string } | null;

        if (!response.ok || !payload || !('broker' in payload)) {
          throw new Error((payload && 'detail' in payload && payload.detail) || 'Não foi possível localizar este link exclusivo.');
        }

        setBrokerName(payload.broker.name);
        setBrokerCompany(payload.broker.company || '');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o link do corretor.');
      } finally {
        setLoading(false);
      }
    };

    void loadBroker();
  }, [token]);

  if (!token || (mode !== 'vender' && mode !== 'comprar')) {
    return <Navigate to="/" replace />;
  }

  const offerType = mode === 'vender' ? 'venda' : 'compra';
  const brokerLabel = brokerName || 'corretor responsável';
  const brokerOfficeLabel = brokerCompany || 'Mesa Alytha';
  const pageTitle = mode === 'vender' ? 'Enviar oferta de venda' : 'Enviar demanda de compra';
  const pageIntro =
    mode === 'vender'
      ? `Este canal encaminha sua oferta diretamente para ${brokerLabel}. O cadastro fica reservado para o atendimento desse corretor dentro da Alytha.`
      : `Este canal encaminha sua demanda de compra diretamente para ${brokerLabel}. O cadastro fica reservado para o atendimento desse corretor dentro da Alytha.`;
  const formTitle = mode === 'vender' ? 'Dados da oferta' : 'Dados da demanda';
  const formSubtitle =
    mode === 'vender'
      ? 'Preencha produto, volume, praça, safra e condições comerciais para que o corretor avalie sua oportunidade com mais rapidez.'
      : 'Preencha produto, volume, local, safra e condições comerciais para que o corretor avalie sua necessidade de compra com mais rapidez.';

  return (
    <div className="broker-link-compact-page min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_44%,#f6efe4_100%)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Validando o canal exclusivo do corretor...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <section className="mb-2 rounded-lg border border-sky-100 bg-white/92 px-3 py-2 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.32)] sm:px-3.5 sm:py-2.5">
              <div className="grid gap-2 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700">Canal exclusivo com corretor</p>
                  <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{pageTitle}</h1>
                  <p className="mt-0.5 max-w-3xl text-sm leading-5 text-slate-600">{pageIntro}</p>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-3">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Corretor responsável</p>
                    <p className="mt-0.5 truncate text-sm font-bold leading-5 text-slate-900">{brokerLabel}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Empresa</p>
                    <p className="mt-0.5 truncate text-sm font-bold leading-5 text-slate-900">{brokerOfficeLabel}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Como funciona</p>
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">Base privada do corretor, sem login agora.</p>
                  </div>
                </div>
              </div>
            </section>

            <OfferForm
              offerType={offerType}
              title={formTitle}
              subtitle={formSubtitle}
              mode="broker-link"
              brokerToken={token}
              brokerName={brokerLabel}
            />
          </>
        )}
      </main>
    </div>
  );
}
