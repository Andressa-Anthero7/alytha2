import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LegalAgreementCheckbox from '../../components/LegalAgreementCheckbox';
import { apiFetch } from '../../shared/api';
import { LEGAL_DOCUMENT_VERSION } from '../../shared/legal';
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

const publicRoleCards = roleCards.filter((item) => item.slug !== 'corretor');

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
const brazilMobileAreaCodes = new Set([
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '24',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '51',
  '53',
  '54',
  '55',
  '61',
  '62',
  '63',
  '64',
  '65',
  '66',
  '67',
  '68',
  '69',
  '71',
  '73',
  '74',
  '75',
  '77',
  '79',
  '81',
  '82',
  '83',
  '84',
  '85',
  '86',
  '87',
  '88',
  '89',
  '91',
  '92',
  '93',
  '94',
  '95',
  '96',
  '97',
  '98',
  '99',
]);

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

const getWhatsAppLocalDigits = (value: string) => {
  const rawValue = String(value || '');
  const digits = rawValue.replace(/\D/g, '');
  const trimmedValue = rawValue.trim();
  const hasCountryCode =
    trimmedValue.startsWith('+55')
    || (digits.startsWith('55') && digits.length > 11);
  const localDigits = hasCountryCode ? digits.slice(2) : digits;
  return localDigits.slice(0, 11);
};

const formatWhatsApp = (value: string) => {
  const localDigits = getWhatsAppLocalDigits(value);
  if (!localDigits) return '';

  const areaCode = localDigits.slice(0, 2);
  const firstPart = localDigits.slice(2, 7);
  const secondPart = localDigits.slice(7, 11);

  if (localDigits.length <= 2) return `+55 (${areaCode}`;
  if (localDigits.length <= 7) return `+55 (${areaCode}) ${firstPart}`;
  return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
};

const validateWhatsApp = (value: string) => {
  const localDigits = getWhatsAppLocalDigits(value);
  const areaCode = localDigits.slice(0, 2);
  const repeatedDigits = /^(\d)\1+$/.test(localDigits);

  return {
    formatted: formatWhatsApp(localDigits),
    isValid: localDigits.length === 11 && brazilMobileAreaCodes.has(areaCode) && localDigits[2] === '9' && !repeatedDigits,
  };
};

const getDocumentDigits = (value: string) => value.replace(/\D/g, '');

const formatDocumentNumber = (documentType: RegisterFormState['documentType'], value: string) => {
  const digits = getDocumentDigits(value);

  if (documentType === 'cpf') {
    const cpf = digits.slice(0, 11);
    if (cpf.length <= 3) return cpf;
    if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
    if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }

  if (documentType === 'cnpj') {
    const cnpj = digits.slice(0, 14);
    if (cnpj.length <= 2) return cnpj;
    if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  }

  return digits.slice(0, 14);
};

const hasRepeatedDigits = (value: string) => Boolean(value) && new Set(value).size === 1;

const isValidCpf = (value: string) => {
  const digits = getDocumentDigits(value);
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false;

  for (const digitPosition of [9, 10]) {
    let total = 0;
    for (let index = 0; index < digitPosition; index += 1) {
      total += Number(digits[index]) * (digitPosition + 1 - index);
    }
    let checkDigit = (total * 10) % 11;
    if (checkDigit === 10) checkDigit = 0;
    if (checkDigit !== Number(digits[digitPosition])) return false;
  }

  return true;
};

const isValidCnpj = (value: string) => {
  const digits = getDocumentDigits(value);
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false;

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];
  const calculateDigit = (weights: number[]) => {
    const total = weights.reduce((sum, weight, index) => sum + Number(digits[index]) * weight, 0);
    const checkDigit = 11 - (total % 11);
    return checkDigit >= 10 ? 0 : checkDigit;
  };

  return calculateDigit(firstWeights) === Number(digits[12]) && calculateDigit(secondWeights) === Number(digits[13]);
};

const validateDocument = (documentType: RegisterFormState['documentType'], documentNumber: string) => {
  if (!documentType) return 'Selecione CPF ou CNPJ.';
  if (documentType === 'cpf' && !isValidCpf(documentNumber)) return 'Informe um CPF valido.';
  if (documentType === 'cnpj' && !isValidCnpj(documentNumber)) return 'Informe um CNPJ valido.';
  return '';
};

export function RegisterPage({ routeBase }: RegisterPageProps) {
  const navigate = useNavigate();
  const { roleSlug } = useParams();
  const normalizedRoleSlug = normalizeRoleSlug(roleSlug);

  const [form, setForm] = useState<RegisterFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const selectedSegments = useMemo(() => segmentOptions[normalizedRoleSlug], [normalizedRoleSlug]);
  const selectedRoleLabel = useMemo(
    () => roleCards.find((item) => item.slug === normalizedRoleSlug)?.label || 'Comprador',
    [normalizedRoleSlug],
  );
  const selectedRoleText = selectedRoleLabel.toLowerCase();

  useEffect(() => {
    if (!error) return undefined;

    const focusTimer = window.setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current?.focus({ preventScroll: true });
    }, 50);

    return () => window.clearTimeout(focusTimer);
  }, [error]);

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

    if (!legalAccepted) {
      setSubmitting(false);
      setError('Para concluir o cadastro, confirme a leitura e aceite do contrato Alytha e da politica de LGPD.');
      return;
    }

    const whatsapp = validateWhatsApp(form.phone);
    if (!whatsapp.isValid) {
      setSubmitting(false);
      setError('Informe um WhatsApp valido com DDD e 9 digitos. Ex.: +55 (16) 99999-9999.');
      return;
    }

    const documentError = validateDocument(form.documentType, form.documentNumber);
    if (documentError) {
      setSubmitting(false);
      setError(documentError);
      return;
    }

    try {
      const response = await apiFetch(`/register/${normalizedRoleSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: whatsapp.formatted,
          company: form.company.trim(),
          legal_name: form.legalName.trim(),
          profile_segment: form.profileSegment,
          document_type: form.documentType,
          document_number: formatDocumentNumber(form.documentType, form.documentNumber),
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
          accept_terms: true,
          accept_privacy: true,
          legal_version: LEGAL_DOCUMENT_VERSION,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detailMessage =
          payload?.detail
          || payload?.email?.[0]
          || payload?.phone?.[0]
          || payload?.document_type?.[0]
          || payload?.document_number?.[0]
          || payload?.profile_segment?.[0]
          || 'Não foi possível concluir o cadastro.';
        setError(detailMessage);
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          prefillEmail: form.email.trim(),
          notice: 'Cadastro enviado com sucesso. Aguarde a validacao do backoffice para liberar seu primeiro login.',
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
      <ShellHeader eyebrow="Cadastro" title={roleTitle[normalizedRoleSlug]} subtitle={roleSubtitle[normalizedRoleSlug]} />

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </button>
      </div>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-7 shadow-xl shadow-emerald-100/50 sm:rounded-[2.4rem] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Perfil de cadastro</p>
          <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">Escolha o tipo de conta e preencha os dados comerciais.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            O cadastro agora diferencia comprador e vendedor, com endereço e documentação para cada perfil.
          </p>

          <div className="mt-8 grid gap-3">
            {publicRoleCards.map((item) => {
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
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Cadastro de {selectedRoleLabel}</p>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Preencha os dados para conta de {selectedRoleText}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Você está preenchendo a categoria {selectedRoleText}. Informe os dados do responsável, perfil, documentação e endereço.
              </p>
            </div>

            {error && (
              <div
                ref={errorRef}
                role="alert"
                tabIndex={-1}
                className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 outline-none ring-red-200 focus:ring-4"
              >
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
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">WhatsApp</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="+55 (16) 99999-9999"
                  value={form.phone}
                  onChange={(event) => updateField('phone', formatWhatsApp(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-xs leading-5 text-slate-500">Use um WhatsApp brasileiro com DDD. O numero deve ser celular e comecar com 9.</p>
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
                  onChange={(event) => {
                    const nextDocumentType = event.target.value as RegisterFormState['documentType'];
                    setForm((previous) => ({
                      ...previous,
                      documentType: nextDocumentType,
                      documentNumber: formatDocumentNumber(nextDocumentType, previous.documentNumber),
                    }));
                  }}
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
                  onChange={(event) => updateField('documentNumber', formatDocumentNumber(form.documentType, event.target.value))}
                  placeholder={form.documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-xs leading-5 text-slate-500">Somente um cadastro e permitido por CPF/CNPJ.</p>
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

            <LegalAgreementCheckbox checked={legalAccepted} onChange={setLegalAccepted} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Cadastrando...' : `Cadastrar ${selectedRoleText}`}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
