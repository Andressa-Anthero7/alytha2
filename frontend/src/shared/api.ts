import { API_BASE, apiFetch } from '../lib/api';

export { API_BASE, apiFetch };

export const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@alytha.agr.br';
export const supportWhatsAppDisplay = import.meta.env.VITE_SUPPORT_WHATSAPP || '+55 16 99337-9492';
export const supportWhatsApp = supportWhatsAppDisplay.replace(/\D/g, '');
export const supportWhatsAppHref = supportWhatsApp ? `https://wa.me/${supportWhatsApp}` : '';
export const forgotPasswordHref = supportWhatsAppHref || `mailto:${supportEmail}?subject=Recuperacao%20de%20senha`;
