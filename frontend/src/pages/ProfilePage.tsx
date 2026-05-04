import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  IdCard,
  KeyRound,
  LoaderCircle,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode, type Ref } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';
import { getCurrentUser, setCurrentUser } from '../lib/auth';
import { getPrimaryAppPath } from '../shared/appRoutes';
import { formatDateTime } from '../shared/format';
import { formatZipCode, getZipCodeDigits, getZipLookupMessage, lookupBrazilZipCode, type ZipLookupStatus } from '../shared/zipCode';
import type { User } from '../types';

type ProfileFormState = {
  name: string;
  phone: string;
  company: string;
  legal_name: string;
  state_registration: string;
  address_zip_code: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_country: string;
  document_notes: string;
};

type DetailItem = {
  label: string;
  value: ReactNode;
};

type IconComponent = ComponentType<{ className?: string }>;

const NOT_INFORMED = 'Nao informado';

const roleLabels = {
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  corretor: 'Corretor',
  backoffice: 'Backoffice',
} as const;

const documentTypeLabels: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
};

const segmentLabels: Record<string, string> = {
  industria: 'Industria',
  trading: 'Trading',
  distribuidora: 'Distribuidora',
  granja: 'Granja',
  exportadora: 'Exportadora',
  cooperativa: 'Cooperativa',
  cerealista: 'Cerealista',
  esmagadora: 'Esmagadora',
  nutricao_animal: 'Nutricao animal',
  produtor_rural: 'Produtor rural',
  fazenda: 'Fazenda',
  silos: 'Silos',
  armazens: 'Armazens',
  originador: 'Originador',
  revenda: 'Revenda',
  autonomo: 'Autonomo',
  empresa_corretora: 'Empresa corretora',
  mesa_corretora: 'Mesa corretora',
  outros: 'Outros',
};

const createProfileForm = (user?: User | null): ProfileFormState => ({
  name: user?.name || '',
  phone: user?.phone || '',
  company: user?.company || '',
  legal_name: user?.legal_name || '',
  state_registration: user?.state_registration || '',
  address_zip_code: user?.address_zip_code || '',
  address_street: user?.address_street || '',
  address_number: user?.address_number || '',
  address_complement: user?.address_complement || '',
  address_district: user?.address_district || '',
  address_city: user?.address_city || '',
  address_state: user?.address_state || '',
  address_country: user?.address_country || 'Brasil',
  document_notes: user?.document_notes || '',
});

const hasValue = (value?: string | null) => Boolean(String(value || '').trim());

const displayValue = (value?: string | number | null) => {
  const normalized = String(value ?? '').trim();
  return normalized || NOT_INFORMED;
};

const formatSegment = (value?: string | null) => {
  if (!value) return NOT_INFORMED;
  return segmentLabels[value] || value.replaceAll('_', ' ');
};

const formatLegalDate = (value?: string | null) => {
  if (!value) return 'Nao registrado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Nao registrado';
  return formatDateTime(value);
};

function StatusBadge({ tone, children }: { tone: 'emerald' | 'amber' | 'slate' | 'sky'; children: ReactNode }) {
  const classes = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
  }[tone];

  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function DataPanel({ title, icon: Icon, children }: { title: string; icon: IconComponent; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-white px-3 py-3">
          <dt className="text-[11px] font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  required,
  inputMode,
  autoComplete,
  maxLength,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconComponent;
  required?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  autoComplete?: string;
  maxLength?: number;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> : null}
        <input
          ref={inputRef}
          required={required}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
            Icon ? 'pl-10' : ''
          }`}
        />
      </div>
    </label>
  );
}

export default function ProfilePage() {
  const currentUser = getCurrentUser<User>();
  const dashboardHref = getPrimaryAppPath(currentUser);
  const [profile, setProfile] = useState<User | null>(currentUser);
  const [form, setForm] = useState<ProfileFormState>(() => createProfileForm(currentUser));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zipLookupStatus, setZipLookupStatus] = useState<ZipLookupStatus>('idle');
  const [zipLookupEnabled, setZipLookupEnabled] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const addressNumberRef = useRef<HTMLInputElement | null>(null);
  const zipCodeDigits = useMemo(() => getZipCodeDigits(form.address_zip_code), [form.address_zip_code]);
  const zipLookupMessage = getZipLookupMessage(zipLookupStatus);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch('/profile/');
        const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;

        if (!response.ok || !payload || !('email' in payload)) {
          throw new Error((payload && 'detail' in payload && payload.detail) || 'Nao foi possivel carregar o perfil.');
        }

        setProfile(payload);
        setCurrentUser(payload);
        setForm(createProfileForm(payload));
        setZipLookupEnabled(false);
        setZipLookupStatus('idle');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o perfil.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!zipLookupEnabled || !form.address_zip_code || zipCodeDigits.length !== 8) {
      setZipLookupStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const lookupTimer = window.setTimeout(async () => {
      setZipLookupStatus('loading');

      try {
        const address = await lookupBrazilZipCode(zipCodeDigits, controller.signal);
        if (!address) {
          setZipLookupStatus('not_found');
          return;
        }

        setForm((previous) => ({
          ...previous,
          address_street: address.street || previous.address_street,
          address_district: address.district || previous.address_district,
          address_city: address.city || previous.address_city,
          address_state: address.state || previous.address_state,
          address_country: address.country,
        }));
        setZipLookupStatus('filled');
        window.setTimeout(() => {
          addressNumberRef.current?.focus();
        }, 0);
      } catch (lookupError) {
        if (lookupError instanceof DOMException && lookupError.name === 'AbortError') return;
        setZipLookupStatus('error');
      }
    }, 350);

    return () => {
      window.clearTimeout(lookupTimer);
      controller.abort();
    };
  }, [form.address_zip_code, zipLookupEnabled, zipCodeDigits]);

  const handleZipCodeChange = (value: string) => {
    setZipLookupEnabled(true);
    setZipLookupStatus('idle');
    setForm((previous) => ({ ...previous, address_zip_code: formatZipCode(value) }));
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          legal_name: form.legal_name.trim(),
          state_registration: form.state_registration.trim(),
          address_zip_code: form.address_zip_code.trim(),
          address_street: form.address_street.trim(),
          address_number: form.address_number.trim(),
          address_complement: form.address_complement.trim(),
          address_district: form.address_district.trim(),
          address_city: form.address_city.trim(),
          address_state: form.address_state.trim().toUpperCase(),
          address_country: form.address_country.trim() || 'Brasil',
          document_notes: form.document_notes.trim(),
        }),
      });

      const payload = (await response.json().catch(() => null)) as User | { detail?: string } | null;
      if (!response.ok || !payload || !('email' in payload)) {
        throw new Error((payload && 'detail' in payload && payload.detail) || 'Nao foi possivel atualizar o perfil.');
      }

      setProfile(payload);
      setCurrentUser(payload);
      setForm(createProfileForm(payload));
      setMessage('Perfil atualizado com sucesso.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Erro inesperado ao atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const resolvedProfile = profile || currentUser;
  const legalAccepted = Boolean(resolvedProfile.terms_accepted_at && resolvedProfile.privacy_accepted_at);
  const loginValidated = resolvedProfile.is_validated !== false;
  const documentLabel = documentTypeLabels[resolvedProfile.document_type || ''] || displayValue(resolvedProfile.document_type).toUpperCase();
  const addressLine = [resolvedProfile.address_street, resolvedProfile.address_number, resolvedProfile.address_complement]
    .filter(hasValue)
    .join(', ');
  const localityLine = [resolvedProfile.address_district, resolvedProfile.address_city, resolvedProfile.address_state].filter(hasValue).join(' / ');
  const requiredProfileFields = [
    resolvedProfile.name,
    resolvedProfile.phone,
    resolvedProfile.company,
    resolvedProfile.legal_name,
    resolvedProfile.profile_segment,
    resolvedProfile.document_type,
    resolvedProfile.document_number,
    resolvedProfile.address_zip_code,
    resolvedProfile.address_city,
    resolvedProfile.address_state,
    resolvedProfile.terms_accepted_at || '',
    resolvedProfile.privacy_accepted_at || '',
  ];
  const completedFields = requiredProfileFields.filter(hasValue).length;
  const completionPercentage = Math.round((completedFields / requiredProfileFields.length) * 100);

  const operationalItems: DetailItem[] = [
    { label: 'ID interno', value: `#${resolvedProfile.id}` },
    { label: 'Perfil', value: roleLabels[resolvedProfile.type] },
    { label: 'Status do login', value: <StatusBadge tone={loginValidated ? 'emerald' : 'amber'}>{loginValidated ? 'Liberado' : 'Pendente validacao'}</StatusBadge> },
    { label: 'Completude cadastral', value: `${completionPercentage}% (${completedFields}/${requiredProfileFields.length})` },
  ];

  const registrationItems: DetailItem[] = [
    { label: 'Nome completo', value: displayValue(resolvedProfile.name) },
    { label: 'Razao social', value: displayValue(resolvedProfile.legal_name) },
    { label: 'Empresa / nome fantasia', value: displayValue(resolvedProfile.company) },
    { label: 'Categoria', value: formatSegment(resolvedProfile.profile_segment) },
    { label: 'E-mail de acesso', value: resolvedProfile.email },
    { label: 'WhatsApp / telefone', value: displayValue(resolvedProfile.phone) },
  ];

  const documentItems: DetailItem[] = [
    { label: 'Tipo de documento', value: documentLabel },
    { label: 'CPF/CNPJ', value: displayValue(resolvedProfile.document_number) },
    { label: 'Inscricao estadual', value: displayValue(resolvedProfile.state_registration) },
    { label: 'Observacoes documentais', value: displayValue(resolvedProfile.document_notes) },
  ];

  const addressItems: DetailItem[] = [
    { label: 'CEP', value: displayValue(resolvedProfile.address_zip_code) },
    { label: 'Endereco', value: addressLine || NOT_INFORMED },
    { label: 'Bairro / cidade / UF', value: localityLine || NOT_INFORMED },
    { label: 'Pais', value: displayValue(resolvedProfile.address_country) },
  ];

  const complianceItems: DetailItem[] = [
    { label: 'Contrato Alytha', value: formatLegalDate(resolvedProfile.terms_accepted_at) },
    { label: 'LGPD / privacidade', value: formatLegalDate(resolvedProfile.privacy_accepted_at) },
    { label: 'Versao legal', value: displayValue(resolvedProfile.legal_version) },
    { label: 'IP do aceite', value: displayValue(resolvedProfile.legal_acceptance_ip) },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>CRM Alytha</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Ficha do usuario</span>
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Perfil CRM Business</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                Dados operacionais, cadastrais e juridicos centralizados para consulta e manutencao da conta.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to={dashboardHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
              <Link
                to="/perfil/trocar-senha"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <KeyRound className="h-4 w-4" />
                Trocar senha
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando dados do perfil...
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{displayValue(resolvedProfile.name)}</h2>
                    <p className="mt-1 truncate text-sm text-slate-500">{resolvedProfile.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone="sky">{roleLabels[resolvedProfile.type]}</StatusBadge>
                      <StatusBadge tone={loginValidated ? 'emerald' : 'amber'}>{loginValidated ? 'Login liberado' : 'Validacao pendente'}</StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                    <span>Completude</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${completionPercentage}%` }} />
                  </div>
                </div>
              </section>

              <DataPanel title="Status operacional" icon={ShieldCheck}>
                <DetailGrid items={operationalItems} />
              </DataPanel>

              <DataPanel title="Conformidade" icon={ClipboardList}>
                <div className="mb-3 flex flex-wrap gap-2">
                  <StatusBadge tone={legalAccepted ? 'emerald' : 'amber'}>{legalAccepted ? 'LGPD e contrato aceitos' : 'Aceite incompleto'}</StatusBadge>
                </div>
                <DetailGrid items={complianceItems} />
              </DataPanel>
            </aside>

            <div className="space-y-4">
              <DataPanel title="Atualizacao rapida" icon={Save}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <TextInput
                      required
                      label="Nome"
                      value={form.name}
                      onChange={(value) => setForm((previous) => ({ ...previous, name: value }))}
                      icon={UserCircle2}
                    />
                    <TextInput
                      label="WhatsApp / telefone"
                      value={form.phone}
                      onChange={(value) => setForm((previous) => ({ ...previous, phone: value }))}
                      placeholder="(00) 00000-0000"
                      icon={Phone}
                    />
                    <TextInput
                      label="Empresa / nome fantasia"
                      value={form.company}
                      onChange={(value) => setForm((previous) => ({ ...previous, company: value }))}
                      icon={Building2}
                    />
                    <TextInput
                      label="Razao social"
                      value={form.legal_name}
                      onChange={(value) => setForm((previous) => ({ ...previous, legal_name: value }))}
                    />
                    <TextInput
                      label="Inscricao estadual"
                      value={form.state_registration}
                      onChange={(value) => setForm((previous) => ({ ...previous, state_registration: value }))}
                    />
                    <div className="space-y-1">
                      <TextInput
                        label="CEP"
                        value={form.address_zip_code}
                        onChange={handleZipCodeChange}
                        placeholder="00000-000"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={9}
                      />
                      {zipLookupMessage ? (
                        <p
                          className={`text-xs font-semibold leading-5 ${
                            zipLookupStatus === 'filled' ? 'text-emerald-700' : zipLookupStatus === 'not_found' || zipLookupStatus === 'error' ? 'text-amber-700' : 'text-slate-500'
                          }`}
                        >
                          {zipLookupMessage}
                        </p>
                      ) : null}
                    </div>
                    <TextInput
                      label="Endereco"
                      value={form.address_street}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_street: value }))}
                      icon={MapPin}
                    />
                    <TextInput
                      label="Numero"
                      value={form.address_number}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_number: value }))}
                      inputRef={addressNumberRef}
                    />
                    <TextInput
                      label="Complemento"
                      value={form.address_complement}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_complement: value }))}
                    />
                    <TextInput
                      label="Bairro"
                      value={form.address_district}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_district: value }))}
                    />
                    <TextInput
                      label="Cidade"
                      value={form.address_city}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_city: value }))}
                    />
                    <TextInput
                      label="UF"
                      value={form.address_state}
                      onChange={(value) => setForm((previous) => ({ ...previous, address_state: value.toUpperCase() }))}
                    />
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">Observacoes documentais</span>
                    <textarea
                      value={form.document_notes}
                      onChange={(event) => setForm((previous) => ({ ...previous, document_notes: event.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  {message ? (
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{message}</span>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar alteracoes
                    </button>
                    <Link
                      to="/perfil/trocar-senha"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <KeyRound className="h-4 w-4" />
                      Seguranca
                    </Link>
                  </div>
                </form>
              </DataPanel>

              <div className="grid gap-4 xl:grid-cols-2">
                <DataPanel title="Dados cadastrais" icon={IdCard}>
                  <DetailGrid items={registrationItems} />
                </DataPanel>

                <DataPanel title="Documento" icon={FileText}>
                  <DetailGrid items={documentItems} />
                </DataPanel>
              </div>

              <DataPanel title="Endereco fiscal e operacional" icon={MapPin}>
                <DetailGrid items={addressItems} />
              </DataPanel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
