import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { apiFetch } from '../lib/api';

type OfferType = 'venda' | 'compra';

type OfferFormProps = {
  offerType: OfferType;
  title: string;
  subtitle: string;
};

type OfferFormState = {
  grain: string;
  quantity: string;
  unit: string;
  price: string;
  location: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  deliveryWindow: string;
  qualityNotes: string;
  paymentTerms: string;
  observations: string;
};

const initialState: OfferFormState = {
  grain: 'Soja',
  quantity: '',
  unit: 'Sacas',
  price: '',
  location: '',
  crop: '',
  shipping: 'FOB',
  deliveryWindow: '',
  qualityNotes: '',
  paymentTerms: '',
  observations: '',
};

const formCopy = {
  venda: {
    priceLabel: 'Preço ou base de negociação',
    locationLabel: 'Praça / cidade',
    windowLabel: 'Disponibilidade / janela',
    qualityLabel: 'Observações de qualidade',
    paymentLabel: 'Condição comercial / pagamento',
    observationsLabel: 'Observações adicionais',
    submitLabel: 'Salvar oferta de venda',
    sideTitle: 'O que vamos registrar',
    sideItems: [
      'Produto, volume e unidade',
      'Praça, safra e condição FOB/CIF',
      'Preço ou base de negociação',
      'Qualidade e observações comerciais',
    ],
  },
  compra: {
    priceLabel: 'Faixa de preço desejada',
    locationLabel: 'Local de entrega ou retirada',
    windowLabel: 'Janela de entrega',
    qualityLabel: 'Exigência de qualidade',
    paymentLabel: 'Forma de pagamento / condição',
    observationsLabel: 'Observações da demanda',
    submitLabel: 'Salvar intenção de compra',
    sideTitle: 'O que vamos registrar',
    sideItems: [
      'Produto, volume e unidade',
      'Local, safra e condição FOB/CIF',
      'Janela de entrega e preço',
      'Padrão de qualidade e forma de pagamento',
    ],
  },
} as const;

export default function OfferForm({ offerType, title, subtitle }: OfferFormProps) {
  const [form, setForm] = useState<OfferFormState>(initialState);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = formCopy[offerType];

  const updateField = <T extends keyof OfferFormState>(name: T, value: OfferFormState[T]) => {
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/offers', {
        method: 'POST',
        body: JSON.stringify({
          type: offerType,
          grain: form.grain,
          quantity: Number(form.quantity),
          unit: form.unit,
          price: Number(form.price),
          location: form.location,
          crop: form.crop,
          shipping: form.shipping,
          quality: {
            deliveryWindow: form.deliveryWindow,
            notes: form.qualityNotes,
            observations: form.observations,
          },
          paymentTerms: form.paymentTerms,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || 'Não foi possível salvar a oferta.');
      }

      setForm(initialState);
      setMessage(offerType === 'venda' ? 'Oferta de venda cadastrada com sucesso.' : 'Intenção de compra cadastrada com sucesso.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_45px_120px_-60px_rgba(15,23,42,0.55)] backdrop-blur"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">Oferta Alytha</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">{title}</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">{subtitle}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Produto</span>
            <select
              value={form.grain}
              onChange={(event) => updateField('grain', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="Soja">Soja</option>
              <option value="Milho">Milho</option>
              <option value="Sorgo">Sorgo</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Safra</span>
            <input
              required
              value={form.crop}
              onChange={(event) => updateField('crop', event.target.value)}
              placeholder="Ex.: 24/25"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Quantidade</span>
            <input
              required
              min="1"
              step="0.01"
              type="number"
              value={form.quantity}
              onChange={(event) => updateField('quantity', event.target.value)}
              placeholder="Ex.: 1500"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Unidade</span>
            <select
              value={form.unit}
              onChange={(event) => updateField('unit', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="Sacas">Sacas</option>
              <option value="Toneladas">Toneladas</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.priceLabel}</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="Ex.: 132.50"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.locationLabel}</span>
            <input
              required
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="Ex.: Rondonópolis - MT"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Condição FOB / CIF</span>
            <select
              value={form.shipping}
              onChange={(event) => updateField('shipping', event.target.value as 'FOB' | 'CIF')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="FOB">FOB</option>
              <option value="CIF">CIF</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.windowLabel}</span>
            <input
              value={form.deliveryWindow}
              onChange={(event) => updateField('deliveryWindow', event.target.value)}
              placeholder="Ex.: abril a maio / disponível imediato"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.qualityLabel}</span>
            <textarea
              value={form.qualityNotes}
              onChange={(event) => updateField('qualityNotes', event.target.value)}
              placeholder="Descreva padrão, umidade, avariados, impurezas ou requisitos da operação."
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.paymentLabel}</span>
            <textarea
              required
              value={form.paymentTerms}
              onChange={(event) => updateField('paymentTerms', event.target.value)}
              placeholder="Ex.: pagamento à vista / 7 dias / contra entrega / análise cadastral."
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{copy.observationsLabel}</span>
            <textarea
              value={form.observations}
              onChange={(event) => updateField('observations', event.target.value)}
              placeholder="Observações extras relevantes para a intermediação comercial."
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            />
          </label>
        </div>

        {message && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {copy.submitLabel}
        </button>
      </form>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#052e2b_0%,#0f5f54_100%)] p-8 text-white shadow-[0_45px_120px_-60px_rgba(5,46,43,0.8)]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Intermediação Alytha</p>
          <h2 className="mt-4 text-3xl font-black">{copy.sideTitle}</h2>
          <div className="mt-6 space-y-3">
            {copy.sideItems.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-emerald-50">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_35px_100px_-70px_rgba(15,23,42,0.55)]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">Boas práticas</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
            <p>Preencha preço, praça e condição comercial com clareza para acelerar a triagem da equipe.</p>
            <p>Se houver observações críticas de qualidade ou janela de entrega, deixe isso explícito no cadastro.</p>
            <p>Depois do cadastro, a operação segue para acompanhamento comercial e eventual match com contraparte aderente.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
