import { ArrowRight, CheckCircle2, MapPinned, Search, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { isAuthenticated } from '../lib/auth';

export type SeoKeywordLandingSlug =
  | 'vender-soja'
  | 'comprar-soja'
  | 'vender-milho'
  | 'comprar-milho'
  | 'vender-sorgo'
  | 'comprar-sorgo'
  | 'corretora-de-graos'
  | 'marketplace-de-graos';

type SeoKeywordLandingContent = {
  slug: SeoKeywordLandingSlug;
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  body: string[];
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  tone: 'emerald' | 'amber' | 'sky' | 'slate';
  highlights: string[];
  relatedLinks: Array<{ label: string; to: string }>;
};

const sellerBaseLinks = [
  { label: 'Vender soja', to: '/vender-soja' },
  { label: 'Vender milho', to: '/vender-milho' },
  { label: 'Vender sorgo', to: '/vender-sorgo' },
  { label: 'Vender graos', to: '/vendedorgraos' },
];

const buyerBaseLinks = [
  { label: 'Comprar soja', to: '/comprar-soja' },
  { label: 'Comprar milho', to: '/comprar-milho' },
  { label: 'Comprar sorgo', to: '/comprar-sorgo' },
  { label: 'Comprar graos', to: '/compradorgraos' },
];

export const seoKeywordLandingPages: SeoKeywordLandingContent[] = [
  {
    slug: 'vender-soja',
    path: '/vender-soja',
    title: 'Vender soja | Alytha',
    description: 'Publique ofertas de soja com praca, volume, safra, frete e valor. A Alytha conecta vendedores a compradores e corretores de graos.',
    eyebrow: 'Vender soja',
    heading: 'Vender soja com apoio comercial e compradores qualificados.',
    intro: 'A Alytha ajuda produtores, silos e originadores a organizar ofertas de soja para negociacao com dados claros de praca, volume, safra, frete e pagamento.',
    body: [
      'A oferta de soja fica pronta para consulta no marketplace e pode seguir com apoio da mesa Alytha quando houver oportunidade comercial aderente.',
      'O cadastro da oferta registra informacoes essenciais para o comprador avaliar o lote com mais agilidade: quantidade, unidade, localidade, modalidade FOB ou CIF, safra e valor pretendido.',
    ],
    primaryCta: 'Cadastrar oferta de soja',
    primaryHref: '/login',
    secondaryCta: 'Ver marketplace',
    secondaryHref: '/',
    tone: 'emerald',
    highlights: ['Oferta de soja com praca e safra', 'FOB ou CIF', 'Apoio comercial da mesa'],
    relatedLinks: [{ label: 'Comprar soja', to: '/comprar-soja' }, ...sellerBaseLinks.filter((link) => link.to !== '/vender-soja')],
  },
  {
    slug: 'comprar-soja',
    path: '/comprar-soja',
    title: 'Comprar soja | Alytha',
    description: 'Encontre ofertas e demandas de soja com praca, volume, safra, frete e valor. A Alytha aproxima compradores, vendedores e corretores.',
    eyebrow: 'Comprar soja',
    heading: 'Comprar soja com oportunidades qualificadas no marketplace.',
    intro: 'Compradores encontram oportunidades de soja com informacoes comerciais organizadas para avaliar volume, localidade, safra, frete e condicoes de pagamento.',
    body: [
      'A Alytha facilita a leitura das ofertas e demandas disponiveis, reduzindo a friccao entre comprador, vendedor e corretor.',
      'Quando nao houver uma oferta aderente, o comprador pode registrar a demanda para que a operacao comercial seja acompanhada com mais contexto.',
    ],
    primaryCta: 'Cadastrar demanda de soja',
    primaryHref: '/login',
    secondaryCta: 'Consultar ofertas',
    secondaryHref: '/',
    tone: 'amber',
    highlights: ['Consulta por praca', 'Volume e valor organizados', 'Demandas de compra registradas'],
    relatedLinks: [{ label: 'Vender soja', to: '/vender-soja' }, ...buyerBaseLinks.filter((link) => link.to !== '/comprar-soja')],
  },
  {
    slug: 'vender-milho',
    path: '/vender-milho',
    title: 'Vender milho | Alytha',
    description: 'Cadastre ofertas de milho com volume, praca, safra, frete e valor para conectar sua producao a compradores de graos.',
    eyebrow: 'Vender milho',
    heading: 'Vender milho com informacoes comerciais claras.',
    intro: 'A Alytha organiza ofertas de milho para que compradores avaliem a oportunidade com dados objetivos de localidade, quantidade, safra, frete e pagamento.',
    body: [
      'A publicacao da oferta ajuda a dar visibilidade ao lote e permite que a mesa acompanhe oportunidades com criterio comercial.',
      'O vendedor pode indicar modalidade FOB ou CIF, valor pretendido e condicoes de pagamento para deixar a negociacao mais objetiva desde o inicio.',
    ],
    primaryCta: 'Cadastrar oferta de milho',
    primaryHref: '/login',
    secondaryCta: 'Ver marketplace',
    secondaryHref: '/',
    tone: 'emerald',
    highlights: ['Oferta de milho ativa', 'Safra e frete informados', 'Contato comercial organizado'],
    relatedLinks: [{ label: 'Comprar milho', to: '/comprar-milho' }, ...sellerBaseLinks.filter((link) => link.to !== '/vender-milho')],
  },
  {
    slug: 'comprar-milho',
    path: '/comprar-milho',
    title: 'Comprar milho | Alytha',
    description: 'Consulte oportunidades para comprar milho com informacoes de praca, volume, safra, frete, pagamento e valor.',
    eyebrow: 'Comprar milho',
    heading: 'Comprar milho com oportunidades organizadas por praca e volume.',
    intro: 'A Alytha aproxima compradores de milho de ofertas e demandas com leitura comercial, dados de safra e informacoes de frete.',
    body: [
      'O marketplace permite comparar oportunidades de milho e abrir conversas comerciais com mais contexto.',
      'A demanda de compra tambem pode ser cadastrada para que vendedores e corretores encontrem uma oportunidade aderente.',
    ],
    primaryCta: 'Cadastrar demanda de milho',
    primaryHref: '/login',
    secondaryCta: 'Consultar oportunidades',
    secondaryHref: '/',
    tone: 'amber',
    highlights: ['Compra por regiao', 'Frete FOB ou CIF', 'Demanda qualificada'],
    relatedLinks: [{ label: 'Vender milho', to: '/vender-milho' }, ...buyerBaseLinks.filter((link) => link.to !== '/comprar-milho')],
  },
  {
    slug: 'vender-sorgo',
    path: '/vender-sorgo',
    title: 'Vender sorgo | Alytha',
    description: 'Publique ofertas de sorgo com praca, volume, safra, frete e valor para encontrar compradores e corretores de graos.',
    eyebrow: 'Vender sorgo',
    heading: 'Vender sorgo com oferta organizada para o mercado de graos.',
    intro: 'A Alytha ajuda o vendedor a apresentar ofertas de sorgo com informacoes comerciais suficientes para avaliacao rapida de compradores.',
    body: [
      'A oferta pode indicar quantidade, unidade, praca, safra, frete e condicoes de pagamento.',
      'Com dados organizados, a oportunidade fica mais facil de ser encontrada no marketplace e acompanhada pela operacao comercial.',
    ],
    primaryCta: 'Cadastrar oferta de sorgo',
    primaryHref: '/login',
    secondaryCta: 'Ver marketplace',
    secondaryHref: '/',
    tone: 'emerald',
    highlights: ['Oferta de sorgo', 'Praca e volume claros', 'Apoio para negociacao'],
    relatedLinks: [{ label: 'Comprar sorgo', to: '/comprar-sorgo' }, ...sellerBaseLinks.filter((link) => link.to !== '/vender-sorgo')],
  },
  {
    slug: 'comprar-sorgo',
    path: '/comprar-sorgo',
    title: 'Comprar sorgo | Alytha',
    description: 'Encontre oportunidades para comprar sorgo com praca, volume, safra, frete, pagamento e valor na plataforma Alytha.',
    eyebrow: 'Comprar sorgo',
    heading: 'Comprar sorgo com oportunidades comerciais qualificadas.',
    intro: 'Compradores podem consultar ofertas de sorgo ou registrar demandas para aproximar a necessidade de compra de vendedores e corretores.',
    body: [
      'O marketplace organiza informacoes que ajudam na avaliacao de disponibilidade, frete, safra e valor.',
      'A Alytha apoia a conexao comercial para que a conversa comece com dados mais completos e menos ruido operacional.',
    ],
    primaryCta: 'Cadastrar demanda de sorgo',
    primaryHref: '/login',
    secondaryCta: 'Consultar oportunidades',
    secondaryHref: '/',
    tone: 'amber',
    highlights: ['Demanda de sorgo', 'Consulta por localidade', 'Dados comerciais estruturados'],
    relatedLinks: [{ label: 'Vender sorgo', to: '/vender-sorgo' }, ...buyerBaseLinks.filter((link) => link.to !== '/comprar-sorgo')],
  },
  {
    slug: 'corretora-de-graos',
    path: '/corretora-de-graos',
    title: 'Corretora de graos | Alytha',
    description: 'Alytha atua como corretora e intermediadora de graos, conectando compradores, vendedores e corretores de soja, milho e sorgo.',
    eyebrow: 'Corretora de graos',
    heading: 'Corretora de graos para conectar oferta, demanda e mesa comercial.',
    intro: 'A Alytha combina marketplace, cadastro de oportunidades e rotina de corretagem para aproximar vendedores, compradores e corretores.',
    body: [
      'A operacao cobre soja, milho e sorgo, com foco em praca, volume, safra, frete, valor e condicoes de pagamento.',
      'Corretores podem acompanhar oportunidades e organizar negociacoes com informacoes comerciais padronizadas.',
    ],
    primaryCta: 'Conhecer corretores',
    primaryHref: '/corretores',
    secondaryCta: 'Ver marketplace',
    secondaryHref: '/',
    tone: 'sky',
    highlights: ['Intermediacao de graos', 'Mesa comercial', 'Soja, milho e sorgo'],
    relatedLinks: [
      { label: 'Marketplace de graos', to: '/marketplace-de-graos' },
      { label: 'Vender graos', to: '/vendedorgraos' },
      { label: 'Comprar graos', to: '/compradorgraos' },
    ],
  },
  {
    slug: 'marketplace-de-graos',
    path: '/marketplace-de-graos',
    title: 'Marketplace de graos | Alytha',
    description: 'Marketplace de graos para consultar ofertas de venda e demandas de compra de soja, milho e sorgo com praca, volume, frete e valor.',
    eyebrow: 'Marketplace de graos',
    heading: 'Marketplace de graos para ofertas e demandas de soja, milho e sorgo.',
    intro: 'A Alytha centraliza oportunidades do mercado fisico de graos para que compradores, vendedores e corretores encontrem informacoes comerciais em um so lugar.',
    body: [
      'Cada oportunidade pode reunir produto, quantidade, unidade, localidade, safra, frete, pagamento e valor.',
      'A plataforma facilita a descoberta de oportunidades e cria uma base mais organizada para conversas comerciais.',
    ],
    primaryCta: 'Abrir marketplace',
    primaryHref: '/',
    secondaryCta: 'Conhecer Alytha',
    secondaryHref: '/quemsomos',
    tone: 'slate',
    highlights: ['Ofertas de venda', 'Demandas de compra', 'Busca por grao e praca'],
    relatedLinks: [
      { label: 'Vender soja', to: '/vender-soja' },
      { label: 'Comprar soja', to: '/comprar-soja' },
      { label: 'Corretora de graos', to: '/corretora-de-graos' },
    ],
  },
];

const toneClasses = {
  emerald: {
    page: 'bg-[radial-gradient(circle_at_top,#e4f5ea_0%,#ffffff_38%,#f8fafc_100%)]',
    eyebrow: 'text-emerald-700',
    button: 'bg-emerald-600 text-white shadow-emerald-600/25 hover:bg-emerald-700',
    panel: 'from-[#052e2b] to-[#0f5f54]',
    icon: 'text-emerald-300',
  },
  amber: {
    page: 'bg-[radial-gradient(circle_at_top,#fff0db_0%,#ffffff_40%,#f8fafc_100%)]',
    eyebrow: 'text-amber-700',
    button: 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800',
    panel: 'from-[#111827] to-[#1f2937]',
    icon: 'text-amber-300',
  },
  sky: {
    page: 'bg-[radial-gradient(circle_at_top,#eef3ff_0%,#ffffff_40%,#f5efe3_100%)]',
    eyebrow: 'text-sky-700',
    button: 'bg-sky-700 text-white shadow-sky-700/20 hover:bg-sky-800',
    panel: 'from-[#0f172a] to-[#1e293b]',
    icon: 'text-sky-300',
  },
  slate: {
    page: 'bg-[radial-gradient(circle_at_top,#eef6ef_0%,#ffffff_34%,#f6efe4_100%)]',
    eyebrow: 'text-slate-700',
    button: 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800',
    panel: 'from-[#052e2b] to-[#1f2937]',
    icon: 'text-emerald-300',
  },
} as const;

const contentBySlug = Object.fromEntries(seoKeywordLandingPages.map((page) => [page.slug, page])) as Record<SeoKeywordLandingSlug, SeoKeywordLandingContent>;

export function getSeoKeywordLandingPage(slug: SeoKeywordLandingSlug) {
  return contentBySlug[slug];
}

export default function SeoKeywordLandingPage({ slug }: { slug: SeoKeywordLandingSlug }) {
  const content = getSeoKeywordLandingPage(slug);
  const tone = toneClasses[content.tone];
  const primaryHref = isAuthenticated() && content.primaryHref === '/login' ? (slug.startsWith('comprar') ? '/ofertas/compra/nova' : '/ofertas/venda/nova') : content.primaryHref;

  return (
    <div className={`min-h-screen ${tone.page} text-slate-900`}>
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-3xl">
            <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${tone.eyebrow}`}>{content.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-4xl lg:text-6xl">{content.heading}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{content.intro}</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={primaryHref}
                className={`inline-flex items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-black uppercase tracking-[0.18em] shadow-lg ${tone.button}`}
              >
                {content.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={content.secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 hover:border-slate-400"
              >
                {content.secondaryCta}
              </Link>
            </div>
          </div>

          <aside className={`rounded-[2rem] bg-gradient-to-b ${tone.panel} p-6 text-white shadow-[0_55px_140px_-75px_rgba(15,23,42,0.85)] sm:rounded-[2.5rem] sm:p-8`}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Wheat className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">Operacao Alytha</p>
                <p className="mt-1 text-lg font-black">Dados comerciais para negociar melhor.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {content.highlights.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <MapPinned className="h-5 w-5 text-white/80" />
                <p className="mt-3 text-sm font-black">Praca, safra e frete</p>
                <p className="mt-1 text-sm leading-6 text-white/70">Oportunidades organizadas para leitura rapida do mercado fisico.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                <Search className="h-5 w-5 text-white/80" />
                <p className="mt-3 text-sm font-black">Busca por oferta ou demanda</p>
                <p className="mt-1 text-sm leading-6 text-white/70">Soja, milho e sorgo com informacoes comerciais no mesmo ambiente.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-[0_35px_100px_-80px_rgba(15,23,42,0.55)] sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Paginas relacionadas</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.relatedLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 hover:border-slate-300 hover:bg-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
