import type { BrokerageMode, Negotiation } from '../types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export const formatCurrency = (value: number | string | null | undefined) => currencyFormatter.format(Number(value || 0));
export const formatNumber = (value: number | string | null | undefined) => numberFormatter.format(Number(value || 0));
export const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));
export const getNegotiationBrokerageMode = (neg?: Pick<Negotiation, 'brokerageMode'> | null): BrokerageMode =>
  neg?.brokerageMode === 'fixed' ? 'fixed' : neg?.brokerageMode === 'per_sack' ? 'per_sack' : 'percentage';
