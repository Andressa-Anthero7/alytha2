export interface User {
  id: number;
  name: string;
  email: string;
  type: 'vendedor' | 'comprador' | 'corretor' | 'backoffice';
  phone?: string;
  company?: string;
}

export interface QualityParams {
  moisture?: number;
  impurity?: number;
  broken?: number;
  damaged?: number;
  deliveryWindow?: string;
  notes?: string;
  observations?: string;
  [key: string]: string | number | undefined;
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
  quality: QualityParams;
  paymentTerms: string;
  status: 'ativa' | 'finalizada';
  createdAt: string;
}

export type BrokerageMode = 'percentage' | 'fixed' | 'per_sack';
export type BrokeragePayer = 'seller' | 'buyer';

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
  status: 'pendente' | 'aceita' | 'recusada';
  createdAt: string;
}
