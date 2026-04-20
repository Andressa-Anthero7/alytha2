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
          throw new Error((payload && 'detail' in payload && payload.detail) || 'Nao foi possivel localizar este link exclusivo.');
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
  const brokerLabel = brokerName || 'corretor responsavel';
  const brokerOfficeLabel = brokerCompany || 'Mesa Alytha';
  const pageTitle = mode === 'vender' ? 'Enviar oferta de venda' : 'Enviar demanda de compra';
  const pageIntro =
    mode === 'vender'
      ? `Este canal encaminha sua oferta diretamente para ${brokerLabel}. O cadastro fica reservado para o atendimento desse corretor dentro da Alytha.`
      : `Este canal encaminha sua demanda de compra diretamente para ${brokerLabel}. O cadastro fica reservado para o atendimento desse corretor dentro da Alytha.`;
  const formTitle = mode === 'vender' ? 'Dados da oferta' : 'Dados da demanda';
  const formSubtitle =
    mode === 'vender'
      ? 'Preencha produto, volume, praca, safra e condicoes comerciais para que o corretor avalie sua oportunidade com mais rapidez.'
      : 'Preencha produto, volume, local, safra e condicoes comerciais para que o corretor avalie sua necessidade de compra com mais rapidez.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef5ff_0%,#ffffff_44%,#f6efe4_100%)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        {loading ? (
          <div className="flex items-center gap-3 rounded-[2rem] border border-slate-200 bg-white/90 px-5 py-5 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Validando o canal exclusivo do corretor...
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-[2rem] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700 shadow-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-[2rem] border border-sky-100 bg-white/92 p-5 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.35)] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-700">Canal exclusivo com corretor</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{pageTitle}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{pageIntro}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Corretor responsavel</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{brokerLabel}</p>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Empresa</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{brokerOfficeLabel}</p>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Como funciona</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Seu cadastro entra direto na base privada do corretor, sem precisar criar login agora.</p>
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
