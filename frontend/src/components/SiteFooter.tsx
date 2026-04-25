import { Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supportEmail, supportWhatsAppDisplay, supportWhatsAppHref } from '../shared/api';
import { BrandLogo } from '../shared/BrandLogo';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-slate-200 bg-white text-slate-700">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <BrandLogo className="h-10" width={220} height={220} />
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Plataforma Alytha para cadastro, organização e intermediação comercial de ofertas e demandas de grãos.
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-500">© {year} Alytha. Todos os direitos reservados.</p>
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">Sobre a página</p>
          <div className="mt-3 grid gap-2 text-sm">
            <Link to="/quemsomos" className="font-semibold text-slate-600 hover:text-emerald-700">
              Quem somos
            </Link>
            <Link to="/termos-de-servico" className="font-semibold text-slate-600 hover:text-emerald-700">
              Termos de serviço
            </Link>
            <Link to="/lgpd" className="font-semibold text-slate-600 hover:text-emerald-700">
              LGPD e privacidade
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-black text-slate-950">Fale conosco</p>
          <div className="mt-3 grid gap-2 text-sm">
            <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-emerald-700">
              <Mail className="h-4 w-4" />
              {supportEmail}
            </a>
            {supportWhatsAppHref ? (
              <a
                href={supportWhatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp {supportWhatsAppDisplay}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
