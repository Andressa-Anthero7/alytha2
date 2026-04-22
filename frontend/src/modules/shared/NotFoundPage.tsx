import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../../shared/BrandLogo';

type NotFoundPageProps = {
  routeBase: string;
};

export function NotFoundPage({ routeBase }: NotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] px-6 py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-white/60 bg-white/80 px-8 py-16 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
        <BrandLogo className="mb-8 h-20" width={420} height={420} />
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-600">Alytha</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight text-slate-950">404</h1>
        <p className="mt-4 max-w-md text-base text-slate-500">
          A rota que você tentou abrir não faz parte deste módulo inicial.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate(`${routeBase}/lp/produtor`)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700"
          >
            Voltar ao início
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(`${routeBase}/app/login/cliente`)}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
}
