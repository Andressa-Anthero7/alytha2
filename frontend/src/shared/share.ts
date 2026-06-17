import type { PublicMarketplaceOfferListItem } from '../types';
import type { DocumentMetadata } from './metadata';

type ShareResult = 'shared' | 'copied';

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

const cleanBaseUrl = (value: string) => value.replace(/\/+$/, '');

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQuantity = (value: number, unit: string) => `${Number(value).toLocaleString('pt-BR')} ${unit}`;

const offerTypeLabel = {
  venda: 'Oferta de venda',
  compra: 'Demanda de compra',
} as const;

const defaultPublicSiteUrl = 'https://plataforma.alytha.agr.br';

export const getPublicSiteUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL || defaultPublicSiteUrl;
  if (configuredUrl) {
    return cleanBaseUrl(configuredUrl);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
};

export const buildAbsolutePublicUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getPublicSiteUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

export const buildOfferPublicPath = (offerId: number) => `/oportunidades/${offerId}`;

export const buildOfferPublicUrl = (offerId: number) => buildAbsolutePublicUrl(buildOfferPublicPath(offerId));

const getShareBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_SHARE_BASE_URL || defaultPublicSiteUrl;
  if (configuredUrl) {
    return cleanBaseUrl(configuredUrl);
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';
  if (apiBaseUrl.endsWith('/api')) {
    return cleanBaseUrl(apiBaseUrl.slice(0, -4));
  }

  return '';
};

export const buildOfferFacebookShareUrl = (offerId: number) => {
  const baseUrl = getShareBaseUrl();
  const path = `/share/oportunidades/${offerId}`;
  return baseUrl ? `${baseUrl}${path}` : path;
};

export const buildOfferShareTitle = (offer: PublicMarketplaceOfferListItem) => `${offerTypeLabel[offer.type]} de ${offer.grain} | Alytha`;

export const buildOfferShareDescription = (offer: PublicMarketplaceOfferListItem) =>
  `${offerTypeLabel[offer.type]} em ${offer.location}: ${formatQuantity(offer.quantity, offer.unit)}, ${formatCurrency(offer.price)}, safra ${offer.crop}, frete ${offer.shipping}.`;

export const buildOfferShareText = (offer: PublicMarketplaceOfferListItem) =>
  `${buildOfferShareTitle(offer)}\n${buildOfferShareDescription(offer)}`;

export const buildOfferDocumentMetadata = (offer: PublicMarketplaceOfferListItem): DocumentMetadata => ({
  title: buildOfferShareTitle(offer),
  description: buildOfferShareDescription(offer),
  canonicalUrl: buildOfferPublicUrl(offer.id),
  imageUrl: buildAbsolutePublicUrl('/logo.png'),
  type: 'article',
});

export const buildMarketplaceDocumentMetadata = (): DocumentMetadata => ({
  title: 'Alytha | Marketplace de grãos',
  description: 'Marketplace Alytha para consultar ofertas de venda e demandas de compra de grãos com praça, volume, frete, safra e valor.',
  canonicalUrl: buildAbsolutePublicUrl('/'),
  imageUrl: buildAbsolutePublicUrl('/logo.png'),
  type: 'website',
  robots: 'index, follow',
});

export const buildOfferSocialLinks = (offer: PublicMarketplaceOfferListItem) => {
  const url = buildOfferPublicUrl(offer.id);
  const title = buildOfferShareTitle(offer);
  const text = buildOfferShareText(offer);
  const encodedFacebookUrl = encodeURIComponent(buildOfferFacebookShareUrl(offer.id));
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${text}\n${url}`);

  return {
    url,
    title,
    text,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}`,
    instagram: 'https://www.instagram.com/',
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
  };
};

export const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

export const copyOfferLink = async (offer: PublicMarketplaceOfferListItem) => {
  await copyTextToClipboard(buildOfferPublicUrl(offer.id));
};

export const shareOffer = async (offer: PublicMarketplaceOfferListItem): Promise<ShareResult> => {
  const links = buildOfferSocialLinks(offer);
  const shareData: ShareData = {
    title: links.title,
    text: links.text,
    url: links.url,
  };
  const currentNavigator = typeof navigator !== 'undefined' ? (navigator as NavigatorWithShare) : null;

  if (currentNavigator?.share && (!currentNavigator.canShare || currentNavigator.canShare(shareData))) {
    await currentNavigator.share(shareData);
    return 'shared';
  }

  await copyTextToClipboard(links.url);
  return 'copied';
};
