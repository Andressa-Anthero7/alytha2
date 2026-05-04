export type ZipLookupStatus = 'idle' | 'loading' | 'filled' | 'not_found' | 'error';

export type ZipCodeAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
  country: string;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export const getZipCodeDigits = (value: string) => value.replace(/\D/g, '').slice(0, 8);

export const formatZipCode = (value: string) => {
  const digits = getZipCodeDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const getZipLookupMessage = (status: ZipLookupStatus) => {
  if (status === 'loading') return 'Buscando endereço pelo CEP...';
  if (status === 'filled') return 'Endereço preenchido automaticamente. Confira número e complemento.';
  if (status === 'not_found') return 'CEP não encontrado. Preencha o endereço manualmente.';
  if (status === 'error') return 'Não foi possível buscar o CEP agora. Preencha o endereço manualmente.';
  return '';
};

export async function lookupBrazilZipCode(zipCode: string, signal?: AbortSignal): Promise<ZipCodeAddress | null> {
  const digits = getZipCodeDigits(zipCode);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
  if (!response.ok) throw new Error('CEP lookup failed');

  const payload = (await response.json()) as ViaCepResponse;
  if (payload.erro) return null;

  return {
    street: payload.logradouro?.trim() || '',
    district: payload.bairro?.trim() || '',
    city: payload.localidade?.trim() || '',
    state: payload.uf?.trim().toUpperCase() || '',
    country: 'Brasil',
  };
}
