import { type FormEvent, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../shared/api';
import { ShellHeader } from '../../shared/ShellHeader';

type RegisterPageProps = {
  routeBase: string;
};

type RoleSlug = 'comprador' | 'vendedor' | 'corretor';

type RegisterFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  legalName: string;
  profileSegment: string;
  documentType: 'cpf' | 'cnpj' | '';
  documentNumber: string;
  stateRegistration: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  country: string;
  documentNotes: string;
  password: string;
  confirmPassword: string;
};

const roleCards: Array<{ slug: RoleSlug; label: string; summary: string }> = [
  { slug: 'comprador', label: 'Comprador', summary: 'Indústria, trading, distribuidora, granja, exportadora e perfis compradores.' },
  { slug: 'vendedor', label: 'Vendedor', summary: 'Produtor rural, fazenda, silos, armazéns e perfis vendedores.' },
  { slug: 'corretor', label: 'Corretor', summary: 'Pessoa física ou jurídica para atuação comercial com CPF ou CNPJ.' },
];

const segmentOptions: Record<RoleSlug, Array<{ value: string; label: string }>> = {
  comprador: [
    { value: 'industria', label: 'Indústria' },
    { value: 'trading', label: 'Trading' },
    { value: 'distribuidora', label: 'Distribuidora' },
    { value: 'granja', label: 'Granja' },
    { value: 'exportadora', label: 'Exportadora' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'cerealista', label: 'Cerealista' },
    { value: 'esmagadora', label: 'Esmagadora' },
    { value: 'nutricao_animal', label: 'Nutrição animal' },
    { value: 'outros', label: 'Outros' },
  ],
  vendedor: [
    { value: 'produtor_rural', label: 'Produtor rural' },
    { value: 'fazenda', label: 'Fazenda' },
    { value: 'silos', label: 'Silos' },
    { value: 'armazens', label: 'Armazéns' },
    { value: 'cooperativa', label: 'Cooperativa' },
    { value: 'originador', label: 'Originador' },
    { value: 'revenda', label: 'Revenda' },
    { value: 'trading', label: 'Trading' },
    { value: 'outros', label: 'Outros' },
  ],
  corretor: [
    { value: 'autonomo', label: 'Autônomo' },
    { value: 'empresa_corretora', label: 'Empresa corretora' },
    { value: 'mesa_corretora', label: 'Mesa de corretagem' },
  ],
};

const roleTitle: Record<RoleSlug, string> = {
  comprador: 'Criar conta de comprador',
  vendedor: 'Criar conta de vendedor',
  corretor: 'Criar conta de corretor',
};

const roleSubtitle: Record<RoleSlug, string> = {
  comprador: 'Cadastre seu perfil comprador com dados comerciais, endereço e documentação.',
  vendedor: 'Cadastre seu perfil vendedor com dados completos para operar na Alytha.',
  corretor: 'Cadastre seu perfil de corretagem com CPF ou CNPJ e base documental.',
};

const brazilStates = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'] as const;

const emptyForm = (): RegisterFormState => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  legalName: '',
  profileSegment: '',
  documentType: '',
  documentNumber: '',
  stateRegistration: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  country: 'Brasil',
  documentNotes: '',
  password: '',
  confirmPassword: '',
});

const normalizeRoleSlug = (roleSlug?: string): RoleSlug => {
  if (roleSlug === 'vendedor') return 'vendedor';
  if (roleSlug === 'corretor') return 'corretor';
  return 'comprador';
};

export function RegisterPage({ routeBase }: RegisterPageProps) {
  const navigate = useNavigate();
  const { roleSlug } = useParams();
  const normalizedRoleSlug = normalizeRoleSlug(roleSlug);

  const [form, setForm] = useState<RegisterFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSegments = useMemo(() => segmentOptions[normalizedRoleSlug], [normalizedRoleSlug]);

  const updateField = <K extends keyof RegisterFormState>(field: K, value: RegisterFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleRoleChange = (nextRole: RoleSlug) => {
    navigate(`${routeBase}/app/cadastro/${nextRole}`);
    setForm((previous) => ({
      ...previous,
      profileSegment: '',
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setSubmitting(false);
      setError('As senhas não coincidem.');
      return;
    }

    try {
      const response = await apiFetch(`/register/${normalizedRoleSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          legal_name: form.legalName.trim(),
          profile_segment: form.profileSegment,
          document_type: form.documentType,
          document_number: form.documentNumber.trim(),
          state_registration: form.stateRegistration.trim(),
          address_zip_code: form.zipCode.trim(),
          address_street: form.street.trim(),
          address_number: form.number.trim(),
          address_complement: form.complement.trim(),
          address_district: form.district.trim(),
          address_city: form.city.trim(),
          address_state: form.state.trim(),
          address_country: form.country.trim(),
          document_notes: form.documentNotes.trim(),
          password: form.password,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detailMessage =
          payload?.detail
          || payload?.email?.[0]
          || payload?.document_type?.[0]
          || payload?.profile_segment?.[0]
          || 'Não foi possível concluir o cadastro.';
        setError(detailMessage);
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          prefillEmail: form.email.trim(),
          notice: 'Conta criada com sucesso. Faça login para continuar.',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <ShellHeader eyebrow="Cadastro" title={roleTitle[normalizedRoleSlug]} subtitle={roleSubtitle[normalizedRoleSlug]} />

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-7 shadow-xl shadow-emerald-100/50 sm:rounded-[2.4rem] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Perfil de cadastro</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">Escolha o tipo de conta e preencha os dados comerciais.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            O cadastro agora diferencia comprador, vendedor e corretor, com endereço e documentação para cada perfil.
          </p>

          <div className="mt-8 grid gap-3">
            {roleCards.map((item) => {
              const active = item.slug === normalizedRoleSlug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => handleRoleChange(item.slug)}
                  className={`rounded-[1.7rem] border px-4 py-4 text-left transition-colors ${
                    active ? 'border-emerald-300 bg-white text-slate-950 shadow-sm' : 'border-emerald-100 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-black uppercase tracking-[0.18em]">{item.label}</p>
                  <p className="mt-2 text-sm leading-6">{item.summary}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:rounded-[2.4rem] sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Criar acesso</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Abra sua conta com dados completos</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Preencha os dados do responsável, categoria do perfil, documentação e endereço para entrar na plataforma.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Nome do responsável</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">E-mail</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Telefone</span>
                <input
                  required
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Empresa / nome fantasia</span>
                <input
                  value={form.company}
                  onChange={(event) => updateField('company', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Razão social / nome completo</span>
                <input
                  required
                  value={form.legalName}
                  onChange={(event) => updateField('legalName', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Categoria do perfil</span>
                <select
                  required
                  value={form.profileSegment}
                  onChange={(event) => updateField('profileSegment', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">Selecione</option>
                  {selectedSegments.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Documento</span>
                <select
                  required
                  value={form.documentType}
                  onChange={(event) => updateField('documentType', event.target.value as RegisterFormState['documentType'])}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">Selecione</option>
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Número do documento</span>
                <input
                  required
                  value={form.documentNumber}
                  onChange={(event) => updateField('documentNumber', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Inscrição estadual</span>
                <input
                  value={form.stateRegistration}
                  onChange={(event) => updateField('stateRegistration', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">CEP</span>
                <input
                  required
                  value={form.zipCode}
                  onChange={(event) => updateField('zipCode', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Endereço</span>
                <input
                  required
                  value={form.street}
                  onChange={(event) => updateField('street', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Número</span>
                <input
                  required
                  value={form.number}
                  onChange={(event) => updateField('number', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Complemento</span>
                <input
                  value={form.complement}
                  onChange={(event) => updateField('complement', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Bairro</span>
                <input
                  required
                  value={form.district}
                  onChange={(event) => updateField('district', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Cidade</span>
                <input
                  required
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Estado</span>
                <select
                  required
                  value={form.state}
                  onChange={(event) => updateField('state', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">Selecione</option>
                  {brazilStates.map((stateOption) => (
                    <option key={stateOption} value={stateOption}>
                      {stateOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">País</span>
                <input
                  required
                  value={form.country}
                  onChange={(event) => updateField('country', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Documentação adicional</span>
                <textarea
                  rows={4}
                  value={form.documentNotes}
                  onChange={(event) => updateField('documentNotes', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                  placeholder="Ex.: dados complementares de cadastro, observações documentais ou informações de habilitação."
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Senha</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition-colors hover:text-emerald-600"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Confirmar senha</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((currentValue) => !currentValue)}
                    className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 transition-colors hover:text-emerald-600"
                    aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Cadastrando...' : 'Cadastrar'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Já tenho conta
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
