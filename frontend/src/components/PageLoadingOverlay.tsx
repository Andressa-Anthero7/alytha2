import { BrandLogo } from '../shared/BrandLogo';

export default function PageLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-8 py-7 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.55)]">
        <BrandLogo className="h-16" width={300} height={300} />
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-alytha-loader rounded-full bg-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Carregando página...</p>
      </div>
    </div>
  );
}
