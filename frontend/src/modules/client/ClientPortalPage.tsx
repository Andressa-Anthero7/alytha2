import { ArrowRight, CircleDot, Compass, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ShellHeader } from '../../shared/ShellHeader';
import type { User } from '../../types';

type ClientPortalPageProps = {
  routeBase: string;
  currentUser: User;
  onLogout: () => void;
};

export function ClientPortalPage({ routeBase, currentUser, onLogout }: ClientPortalPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <ShellHeader
        eyebrow="Portal do Cliente"
        title="Módulo inicial do cliente"
        subtitle="O app enxuto já reconhece o acesso do cliente e prepara a base para os próximos módulos."
        user={currentUser}
        roleLabel="Cliente"
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Base pronta</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Seu login agora pousa em uma base menor e mais clara.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              Esta branch virou o módulo inicial da Alytha. O portal completo do cliente pode crescer depois, sem puxar
              junto transporte, armazenagem ou backoffice.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => navigate(`${routeBase}/lp/produtor`)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700"
              >
                Ver landing do produtor
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(`${routeBase}/lp/comprador`)}
                className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Ver landing do comprador
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Conta ativa</p>
            <h3 className="mt-3 text-2xl font-black">{currentUser.name}</h3>
            <p className="mt-2 text-sm text-slate-300">{currentUser.email}</p>
            <div className="mt-6 space-y-3">
              {[
                { icon: CircleDot, label: 'Autenticação compartilhada com os próximos módulos.' },
                { icon: LayoutGrid, label: 'Núcleo de navegação reduzido para facilitar o rollout.' },
                { icon: Compass, label: 'Ponto de partida consistente para novas entregas.' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <item.icon className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-slate-200">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
