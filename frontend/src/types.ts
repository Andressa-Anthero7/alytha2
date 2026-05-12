export interface User {
  id: number;
  name: string;
  email: string;
  type: 'vendedor' | 'comprador' | 'corretor' | 'backoffice';
  is_validated?: boolean;
  phone?: string;
  company?: string;
  legal_name?: string;
  profile_segment?: string;
  document_type?: string;
  document_number?: string;
  state_registration?: string;
  address_zip_code?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  document_notes?: string;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  legal_version?: string;
  legal_acceptance_ip?: string | null;
}

export interface QualityParams {
  moisture?: number;
  impurity?: number;
  broken?: number;
  damaged?: number;
  ardidos?: number;
  ph?: number;
  protein?: number;
  standard?: string;
  nonGmo?: boolean;
  deliveryWindow?: string;
  funrural?: string;
  notes?: string;
  observations?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface Offer {
  id: number;
  userId: number;
  type: 'venda' | 'compra';
  grain: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  negotiationChannel: 'mesa' | 'direta';
  mesaCommission?: number | null;
  directFee: number;
  directPaymentStatus: 'free' | 'pending' | 'paid';
  exclusiveBrokerId?: number | null;
  exclusiveBrokerName?: string | null;
  quality: QualityParams;
  paymentTerms: string;
  status: 'ativa' | 'finalizada' | 'aguardando_pagamento';
  createdAt: string;
  registration?: OfferRegistration | null;
}

export type BrokerageMode = 'percentage' | 'fixed' | 'per_sack' | 'spread';
export type BrokeragePayer = 'seller' | 'buyer';
export type NegotiationAudience = 'buyer' | 'seller';

export interface Negotiation {
  id: number;
  offerId: number;
  buyOfferId: number;
  buyerId: number;
  sellerId: number;
  brokerId: number;
  proposedPrice: number;
  proposedQuantity: number;
  brokerageMode?: BrokerageMode | null;
  brokeragePercentage?: number | null;
  brokerageValue?: number | null;
  brokeragePayer?: BrokeragePayer | null;
  brokerageFee: number;
  brokerName?: string | null;
  status: 'pendente' | 'aceita' | 'recusada';
  createdAt: string;
}

export interface NegotiationMessage {
  id: number;
  negotiationId: number;
  audience: NegotiationAudience;
  senderId: number | null;
  senderName: string;
  deliveryChannel?: 'app' | 'whatsapp';
  deliveryStatus?: string;
  externalId?: string;
  body: string;
  createdAt: string;
}

export interface OfferPixData {
  requiresPix: boolean;
  amount: number;
  formattedAmount: string;
  beneficiary: string;
  pixKeyType: 'cnpj';
  pixKey: string;
  pixKeyDigits: string;
  reference: string;
  copyMessage: string;
}

export interface OfferRegistration {
  channel: 'mesa' | 'direta';
  exclusiveBrokerId?: number | null;
  exclusiveBrokerName?: string | null;
  mesaCommission?: number | null;
  directOffersUsedThisMonth?: number | null;
  freeDirectOffersRemaining?: number | null;
  pix?: OfferPixData | null;
}

export interface MarketplacePayload {
  stats: {
    sellOffers: number;
    buyOffers: number;
    locations: number;
  };
  latest: MarketplaceCardOffer[];
  sellOffers: MarketplaceCardOffer[];
  buyOffers: MarketplaceCardOffer[];
}

export interface MarketplaceCardOffer {
  id: number;
  type: 'venda' | 'compra';
  grain: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  negotiationChannel: 'mesa' | 'direta';
  mesaCommission?: number | null;
  createdAt: string;
}

export interface PublicMarketplaceOfferListItem {
  id: number;
  type: 'venda' | 'compra';
  grain: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  crop: string;
  shipping: 'FOB' | 'CIF';
  negotiationChannel: 'mesa' | 'direta';
  mesaCommission?: number | null;
  paymentTerms: string;
  createdAt: string;
}

export interface PublicMarketplaceOfferContact {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  locked: boolean;
}

export interface PublicMarketplaceOffersListPayload {
  count: number;
  limit: number;
  offset: number;
  items: PublicMarketplaceOfferListItem[];
}

export interface PublicMarketplaceOfferDetailPayload extends PublicMarketplaceOfferListItem {
  directFee: number;
  directPaymentStatus: 'free' | 'pending' | 'paid';
  quality: QualityParams;
  paymentTerms: string;
  status: 'ativa' | 'finalizada' | 'aguardando_pagamento';
  contact: PublicMarketplaceOfferContact;
}

export interface BrokerLinkPayload {
  token: string;
  sellPath: string;
  buyPath: string;
}

export interface PublicBrokerProfilePayload {
  broker: {
    id: number;
    name: string;
    company?: string;
  };
}

export type DashboardTone = 'slate' | 'emerald' | 'amber' | 'orange';

export interface ClientDashboardAction {
  href: string;
  label: string;
  summary: string;
}

export interface ClientDashboardBadge {
  id: string;
  label: string;
  value: number;
  tone: DashboardTone;
}

export interface ClientDashboardSummaryCard {
  id: string;
  label: string;
  value: number;
  description: string;
  tone: DashboardTone;
}

export interface ClientDashboardHeader {
  title: string;
  subtitle: string;
  userName: string;
  userCompany: string;
  tickerItems: string[];
}

export interface ClientDashboardHero {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: ClientDashboardAction;
  secondaryAction: ClientDashboardAction;
  badges: ClientDashboardBadge[];
}

export interface ClientDashboardAccountIndicator {
  id: string;
  label: string;
  value: number;
}

export interface ClientDashboardAccount {
  eyebrow: string;
  profileLabel: string;
  profileValue: string;
  companyLabel: string;
  companyValue: string;
  focusTitle: string;
  focusDescription: string;
  marketIndicators: ClientDashboardAccountIndicator[];
}

export interface ClientDashboardOfferSection {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  badges: ClientDashboardBadge[];
  items: Offer[];
}

export interface ClientDashboardMarketSection {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  badges: ClientDashboardBadge[];
  items: MarketplaceCardOffer[];
}

export interface ClientDashboardPayload {
  roleLabel: string;
  header: ClientDashboardHeader;
  hero: ClientDashboardHero;
  account: ClientDashboardAccount;
  summaryCards: ClientDashboardSummaryCard[];
  ownOffersSection: ClientDashboardOfferSection;
  marketSection: ClientDashboardMarketSection;
}
