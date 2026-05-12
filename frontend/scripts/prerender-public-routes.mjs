import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = dirname(scriptDir);
const distDir = join(frontendDir, 'dist');
const baseHtmlPath = join(distDir, 'index.html');

const readEnvFile = (filename) => {
  const envPath = join(frontendDir, filename);
  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, 'utf-8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        return [key.trim(), value];
      }),
  );
};

const env = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...readEnvFile('.env.production'),
  ...readEnvFile('.env.production.local'),
  ...process.env,
};
const publicSiteUrl = (env.VITE_PUBLIC_SITE_URL || env.VITE_SITE_URL || 'https://plataforma.alytha.agr.br').replace(/\/+$/, '');
const defaultImageUrl = `${publicSiteUrl}/logo.png`;

const baseHtml = readFileSync(baseHtmlPath, 'utf-8');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeAttribute = (value) =>
  escapeHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const absoluteUrl = (path) => `${publicSiteUrl}${path}`;

const routeJsonLd = (route) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${publicSiteUrl}/#organization`,
      name: 'Alytha',
      url: `${publicSiteUrl}/`,
      logo: defaultImageUrl,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'suporte@alytha.agr.br',
          telephone: '+55 16 99337-9492',
          areaServed: 'BR',
          availableLanguage: 'pt-BR',
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${publicSiteUrl}/#website`,
      url: `${publicSiteUrl}/`,
      name: 'Alytha',
      description: 'Marketplace Alytha para consultar ofertas de venda e demandas de compra de graos.',
      publisher: {
        '@id': `${publicSiteUrl}/#organization`,
      },
      inLanguage: 'pt-BR',
    },
    {
      '@type': 'WebPage',
      '@id': `${route.canonicalUrl}#webpage`,
      url: route.canonicalUrl,
      name: route.title,
      description: route.description,
      isPartOf: {
        '@id': `${publicSiteUrl}/#website`,
      },
      inLanguage: 'pt-BR',
    },
  ],
});

const renderRootContent = ({ eyebrow, heading, paragraphs = [], sections = [], links = [] }) => `
      <main class="seo-prerender mx-auto max-w-5xl px-6 py-10 text-slate-900">
        <p>${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(heading)}</h1>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n        ')}
        ${
          links.length
            ? `<nav aria-label="Links principais">${links
                .map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a>`)
                .join(' ')}</nav>`
            : ''
        }
        ${
          sections.length
            ? `<section>${sections
                .map(
                  (section) => `<article>
            <h2>${escapeHtml(section.title)}</h2>
            ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n            ')}
          </article>`,
                )
                .join('\n          ')}</section>`
            : ''
        }
      </main>`;

const routes = [
  {
    path: '/',
    outputPath: 'index.html',
    title: 'Alytha | Marketplace de graos',
    description: 'Consulte ofertas de venda e demandas de compra de graos com praca, volume, frete, safra e valor na plataforma Alytha.',
    canonicalPath: '/',
    rootContent: renderRootContent({
      eyebrow: 'Marketplace de graos',
      heading: 'Alytha conecta ofertas de venda e demandas de compra de soja, milho e sorgo.',
      paragraphs: [
        'Consulte oportunidades do mercado fisico de graos com praca, volume, frete, safra, condicoes de pagamento e valor.',
        'A plataforma organiza a conexao entre produtores, compradores e corretores com apoio comercial da mesa Alytha.',
      ],
      links: [
        { href: '/vendedorgraos', label: 'Vender graos' },
        { href: '/compradorgraos', label: 'Comprar graos' },
        { href: '/corretores', label: 'Corretores' },
      ],
    }),
  },
  {
    path: '/home',
    outputPath: 'home/index.html',
    title: 'Alytha | Marketplace de graos',
    description: 'Consulte ofertas de venda e demandas de compra de graos com praca, volume, frete, safra e valor na plataforma Alytha.',
    canonicalPath: '/',
    rootContent: renderRootContent({
      eyebrow: 'Marketplace de graos',
      heading: 'Alytha conecta ofertas de venda e demandas de compra de soja, milho e sorgo.',
      paragraphs: [
        'Consulte oportunidades do mercado fisico de graos com praca, volume, frete, safra, condicoes de pagamento e valor.',
        'A plataforma organiza a conexao entre produtores, compradores e corretores com apoio comercial da mesa Alytha.',
      ],
      links: [
        { href: '/vendedorgraos', label: 'Vender graos' },
        { href: '/compradorgraos', label: 'Comprar graos' },
        { href: '/corretores', label: 'Corretores' },
      ],
    }),
  },
  {
    path: '/vendedorgraos',
    outputPath: 'vendedorgraos/index.html',
    title: 'Venda graos com apoio comercial | Alytha',
    description: 'Cadastre ofertas de soja, milho e sorgo e conecte sua producao a compradores e corretores dentro da Alytha.',
    canonicalPath: '/vendedorgraos',
    rootContent: renderRootContent({
      eyebrow: 'Vender graos',
      heading: 'Publique ofertas de soja, milho e sorgo com mais clareza comercial.',
      paragraphs: [
        'Cadastre produto, volume, praca, frete, safra, valor e condicoes de pagamento.',
        'Escolha operar com a mesa Alytha ou deixar sua oferta direta pronta para consulta no marketplace.',
      ],
      links: [
        { href: '/login', label: 'Cadastrar oferta' },
        { href: '/', label: 'Ver marketplace' },
      ],
    }),
  },
  {
    path: '/compradorgraos',
    outputPath: 'compradorgraos/index.html',
    title: 'Compre graos com ofertas qualificadas | Alytha',
    description: 'Encontre demandas e oportunidades de compra de graos com informacoes de praca, volume, safra, frete e valor.',
    canonicalPath: '/compradorgraos',
    rootContent: renderRootContent({
      eyebrow: 'Comprar graos',
      heading: 'Encontre oportunidades de soja, milho e sorgo com mais rapidez.',
      paragraphs: [
        'Consulte o marketplace, publique sua demanda e acompanhe oportunidades com apoio comercial da Alytha.',
        'A plataforma organiza produto, volume, localidade, safra, frete e condicoes de pagamento para facilitar a negociacao.',
      ],
      links: [
        { href: '/login', label: 'Cadastrar demanda' },
        { href: '/', label: 'Ver marketplace' },
      ],
    }),
  },
  {
    path: '/corretores',
    outputPath: 'corretores/index.html',
    title: 'Mesa e corretagem de graos | Alytha',
    description: 'Alytha apoia corretores na captacao, leitura de mercado e conexao entre compradores e vendedores de graos.',
    canonicalPath: '/corretores',
    rootContent: renderRootContent({
      eyebrow: 'Para corretores',
      heading: 'Plataforma para negociar ofertas e demandas de graos com ritmo de mesa.',
      paragraphs: [
        'A Alytha disponibiliza oportunidades de soja, milho e sorgo para serem negociadas com leitura comercial e processo.',
        'Corretores acompanham oportunidades, organizam conversas e conduzem negociacoes dentro da plataforma.',
      ],
      links: [
        { href: '/app/cadastro/corretor', label: 'Quero me inscrever' },
        { href: '/login', label: 'Ja sou corretor' },
      ],
    }),
  },
  {
    path: '/quemsomos',
    outputPath: 'quemsomos/index.html',
    title: 'Quem somos | Alytha',
    description: 'Conheca a Alytha, plataforma para conectar produtores, compradores e corretores no mercado de graos.',
    canonicalPath: '/quemsomos',
    rootContent: renderRootContent({
      eyebrow: 'Quem somos',
      heading: 'Alytha, corretora e intermediadora de graos nas principais regioes agricolas do pais.',
      paragraphs: [
        'Nosso trabalho e aproximar oferta e demanda com leitura de praca, relacionamento comercial e apoio para cada negociacao seguir com clareza.',
        'A Alytha conecta produtores, silos, armazens, compradores e corretores com foco em soja, milho e sorgo.',
      ],
      sections: [
        {
          title: 'Intermediacao comercial',
          body: ['Conectamos vendedores, compradores e oportunidades com criterio comercial e leitura de mercado.'],
        },
        {
          title: 'Cobertura regional',
          body: ['Atuacao em pracas agricolas de MT, MS, GO, TO, MG, SP, PR e RS.'],
        },
      ],
    }),
  },
  {
    path: '/lgpd',
    outputPath: 'lgpd/index.html',
    title: 'LGPD e privacidade | Alytha',
    description: 'Veja as diretrizes de privacidade, LGPD e tratamento de dados aplicadas aos usuarios da Alytha.',
    canonicalPath: '/lgpd',
    rootContent: renderRootContent({
      eyebrow: 'LGPD',
      heading: 'Termo LGPD, Privacidade e Tratamento de Dados.',
      paragraphs: [
        'Documento de transparencia sobre tratamento de dados pessoais, bases legais, compartilhamento, retencao, seguranca e direitos dos titulares.',
        'A Alytha Intermediacoes de Negocios Ltda atua como controladora dos dados pessoais tratados na plataforma quando define finalidades e meios de tratamento.',
      ],
      sections: [
        {
          title: 'Dados tratados',
          body: ['Podemos tratar dados cadastrais, dados de contato, historico de ofertas, demandas e informacoes necessarias para verificacao cadastral.'],
        },
        {
          title: 'Direitos do titular',
          body: ['Solicitacoes sobre dados pessoais podem ser enviadas para contato@alytha.agr.br.'],
        },
      ],
    }),
  },
  {
    path: '/termos-de-servico',
    outputPath: 'termos-de-servico/index.html',
    title: 'Termos de servico | Alytha',
    description: 'Consulte os termos de uso e prestacao de servicos da plataforma Alytha.',
    canonicalPath: '/termos-de-servico',
    rootContent: renderRootContent({
      eyebrow: 'Contrato Alytha',
      heading: 'Contrato de Prestacao de Servicos Alytha.',
      paragraphs: [
        'Documento contratual para uso da plataforma, cadastro, publicacao de oportunidades, intermediacao comercial, regras de pagamento, confidencialidade e LGPD.',
        'A Alytha disponibiliza tecnologia, cadastro, organizacao de informacoes, publicacao de oportunidades, apoio operacional e intermediacao comercial para o mercado de graos.',
      ],
      sections: [
        {
          title: 'Natureza do servico',
          body: ['A plataforma atua como ambiente de aproximacao comercial e suporte operacional; a concretizacao de negocios depende de analise das partes.'],
        },
        {
          title: 'Cadastro e veracidade',
          body: ['O usuario declara que as informacoes fornecidas sao verdadeiras, atualizadas e pertencem ao proprio usuario ou empresa representada.'],
        },
      ],
    }),
  },
];

const notFoundRoute = {
  path: '/404.html',
  outputPath: '404.html',
  title: 'Pagina nao encontrada | Alytha',
  description: 'Esta pagina nao foi encontrada na plataforma Alytha.',
  canonicalPath: '/404.html',
  robots: 'noindex, follow',
  rootContent: renderRootContent({
    eyebrow: '404',
    heading: 'Pagina nao encontrada.',
    paragraphs: ['A rota acessada nao existe ou nao esta disponivel publicamente na plataforma Alytha.'],
    links: [{ href: '/', label: 'Voltar ao marketplace' }],
  }),
};

const upsertMeta = (html, attribute, key, content) => {
  const escapedContent = escapeAttribute(content);
  const replacement = `<meta ${attribute}="${key}" content="${escapedContent}" />`;
  const existingPattern = new RegExp(`\\s*<meta\\b(?=[^>]*\\b${attribute}="${key}")[^>]*>`, 'g');
  return html.replace(existingPattern, '').replace('</head>', `    ${replacement}\n  </head>`);
};

const renderRouteHtml = (route) => {
  const canonicalUrl = absoluteUrl(route.canonicalPath);
  const routeWithCanonical = { ...route, canonicalUrl };
  let html = baseHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`);
  html = upsertMeta(html, 'name', 'description', route.description);
  html = upsertMeta(html, 'name', 'robots', route.robots || 'index, follow');
  html = upsertMeta(html, 'property', 'og:title', route.title);
  html = upsertMeta(html, 'property', 'og:description', route.description);
  html = upsertMeta(html, 'property', 'og:url', canonicalUrl);
  html = upsertMeta(html, 'property', 'og:image', defaultImageUrl);
  html = upsertMeta(html, 'name', 'twitter:title', route.title);
  html = upsertMeta(html, 'name', 'twitter:description', route.description);
  html = upsertMeta(html, 'name', 'twitter:image', defaultImageUrl);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`);
  html = html.replace(
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n      ${JSON.stringify(routeJsonLd(routeWithCanonical), null, 8)}\n    </script>`,
  );
  html = html.replace('<div id="root"></div>', `<div id="root">\n${route.rootContent}\n    </div>`);

  return html;
};

for (const route of [...routes, notFoundRoute]) {
  const outputPath = join(distDir, route.outputPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderRouteHtml(route), 'utf-8');
}

console.log(`Pre-rendered ${routes.length} public routes and 404.html for SEO.`);
