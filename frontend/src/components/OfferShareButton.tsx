import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Mail,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PublicMarketplaceOfferListItem } from '../types';
import { buildOfferSocialLinks, copyOfferLink, shareOffer } from '../shared/share';

interface OfferShareButtonProps {
  offer: PublicMarketplaceOfferListItem;
}

interface SocialAction {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon | typeof WhatsAppIcon;
  external?: boolean;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.86 9.86 0 0 0-8.45 14.93L2.5 22l5.2-1.04A9.87 9.87 0 1 0 12.04 2Zm0 1.8a8.07 8.07 0 1 1-3.86 15.16l-.29-.16-3.07.61.64-2.99-.18-.3A8.07 8.07 0 0 1 12.04 3.8Zm-3.5 4.34c-.19 0-.49.07-.75.36-.26.29-.99.97-.99 2.36s1.02 2.74 1.16 2.93c.14.19 1.97 3.15 4.87 4.29 2.41.95 2.9.76 3.42.71.52-.05 1.68-.69 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.12-.26-.19-.55-.34-.29-.14-1.68-.83-1.94-.92-.26-.1-.45-.14-.64.14-.19.29-.73.92-.9 1.11-.17.19-.33.22-.62.07-.29-.14-1.2-.44-2.28-1.41-.84-.75-1.41-1.68-1.58-1.96-.17-.29-.02-.44.12-.59.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.47-.64-.48h-.55Z" />
    </svg>
  );
}

export function OfferShareButton({ offer }: OfferShareButtonProps) {
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [menuAlignment, setMenuAlignment] = useState<'left' | 'right'>('right');
  const [menuVerticalAlignment, setMenuVerticalAlignment] = useState<'up' | 'down'>('up');

  const links = useMemo(() => buildOfferSocialLinks(offer), [offer]);
  const socialActions = useMemo<SocialAction[]>(
    () => [
      { key: 'whatsapp', label: 'WhatsApp', href: links.whatsapp, icon: WhatsAppIcon, external: true },
      { key: 'facebook', label: 'Facebook', href: links.facebook, icon: Facebook, external: true },
      { key: 'instagram', label: 'Instagram', href: links.instagram, icon: Instagram, external: true },
      { key: 'email', label: 'E-mail', href: links.email, icon: Mail },
    ],
    [links],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const updateMenuAlignment = () => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') {
      return;
    }

    const rect = container.getBoundingClientRect();
    const menuWidth = 256;
    const menuHeight = 250;
    const viewportPadding = 16;
    const clipsLeft = rect.right - menuWidth < viewportPadding;
    const clipsTop = rect.top - menuHeight < viewportPadding;
    setMenuAlignment(clipsLeft ? 'left' : 'right');
    setMenuVerticalAlignment(clipsTop ? 'down' : 'up');
  };

  const toggleMenu = () => {
    if (!open) {
      updateMenuAlignment();
    }
    setOpen((currentValue) => !currentValue);
  };

  const handleNativeShare = async () => {
    try {
      const result = await shareOffer(offer);
      setFeedback(result === 'copied' ? 'Link copiado' : 'Compartilhado');
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setFeedback('Nao foi possivel compartilhar');
    }
  };

  const handleCopy = async () => {
    try {
      await copyOfferLink(offer);
      setFeedback('Link copiado');
      setOpen(false);
    } catch {
      setFeedback('Nao foi possivel copiar');
    }
  };

  const handleInstagramClick = async () => {
    try {
      await copyOfferLink(offer);
      setFeedback('Link copiado');
    } catch {
      setFeedback('Copie o link manualmente');
    } finally {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        aria-controls={menuId}
        title="Compartilhar oportunidade"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      >
        <Share2 className="h-4 w-4" />
        <span>Compartilhar</span>
      </button>

      {feedback ? (
        <span className="absolute -top-9 right-0 z-40 whitespace-nowrap rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-lg">
          {feedback}
        </span>
      ) : null}

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute z-50 w-64 max-w-[calc(100vw-2rem)] rounded-[1rem] border border-slate-200 bg-white p-2 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.55)] ${
            menuVerticalAlignment === 'up' ? 'bottom-12' : 'top-12'
          } ${
            menuAlignment === 'left'
              ? menuVerticalAlignment === 'up'
                ? 'left-0 origin-bottom-left'
                : 'left-0 origin-top-left'
              : menuVerticalAlignment === 'up'
                ? 'right-0 origin-bottom-right'
                : 'right-0 origin-top-right'
          }`}
        >
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex h-10 w-full items-center gap-3 rounded-[0.8rem] px-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-50"
            role="menuitem"
            title="Abrir compartilhamento do dispositivo"
          >
            <Share2 className="h-4 w-4 text-emerald-700" />
            Compartilhar
          </button>

          <div className="my-1 h-px bg-slate-100" />

          {socialActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.key}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
                className="flex h-10 items-center gap-3 rounded-[0.8rem] px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
                role="menuitem"
                title={`Compartilhar no ${action.label}`}
                onClick={action.key === 'instagram' ? handleInstagramClick : () => setOpen(false)}
              >
                <Icon className="h-4 w-4 text-slate-500" />
                {action.label}
              </a>
            );
          })}

          <button
            type="button"
            onClick={handleCopy}
            className="flex h-10 w-full items-center gap-3 rounded-[0.8rem] px-3 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
            role="menuitem"
            title="Copiar link da oportunidade"
          >
            {feedback === 'Link copiado' ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4 text-slate-500" />}
            Copiar link
          </button>
        </div>
      ) : null}
    </div>
  );
}
