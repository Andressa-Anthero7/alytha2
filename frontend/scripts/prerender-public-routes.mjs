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

const keywordRoutes = [
  {
    path: '/vender-soja',
    title: 'Vender soja | Alytha',
    description: 'Publique ofertas de soja com praca, volume, safra, frete e valor. A Alytha conecta vendedores a compradores e corretores de graos.',
    eyebrow: 'Vender soja',
    heading: 'Vender soja com apoio comercial e compradores qualificados.',
    paragraphs: [
      'A Alytha ajuda produtores, silos e originadores a organizar ofertas de soja para negociacao com dados claros de praca, volume, safra, frete e pagamento.',
      'A oferta de soja fica pronta para consulta no marketplace e pode seguir com apoio da mesa Alytha quando houver oportunidade comercial aderente.',
    ],
    sections: [
      { title: 'Como vender soja', body: ['Cadastre quantidade, unidade, localidade, modalidade FOB ou CIF, safra, valor pretendido e condicoes de pagamento.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar oferta de soja' },
      { href: '/comprar-soja', label: 'Comprar soja' },
      { href: '/vendedorgraos', label: 'Vender graos' },
    ],
  },
  {
    path: '/comprar-soja',
    title: 'Comprar soja | Alytha',
    description: 'Encontre ofertas e demandas de soja com praca, volume, safra, frete e valor. A Alytha aproxima compradores, vendedores e corretores.',
    eyebrow: 'Comprar soja',
    heading: 'Comprar soja com oportunidades qualificadas no marketplace.',
    paragraphs: [
      'Compradores encontram oportunidades de soja com informacoes comerciais organizadas para avaliar volume, localidade, safra, frete e condicoes de pagamento.',
      'Quando nao houver uma oferta aderente, o comprador pode registrar a demanda para que a operacao comercial seja acompanhada com mais contexto.',
    ],
    sections: [
      { title: 'Como comprar soja', body: ['Consulte oportunidades por praca, volume, safra e valor ou publique uma demanda de compra para o mercado encontrar sua necessidade.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar demanda de soja' },
      { href: '/vender-soja', label: 'Vender soja' },
      { href: '/compradorgraos', label: 'Comprar graos' },
    ],
  },
  {
    path: '/vender-milho',
    title: 'Vender milho | Alytha',
    description: 'Cadastre ofertas de milho com volume, praca, safra, frete e valor para conectar sua producao a compradores de graos.',
    eyebrow: 'Vender milho',
    heading: 'Vender milho com informacoes comerciais claras.',
    paragraphs: [
      'A Alytha organiza ofertas de milho para que compradores avaliem a oportunidade com dados objetivos de localidade, quantidade, safra, frete e pagamento.',
      'O vendedor pode indicar modalidade FOB ou CIF, valor pretendido e condicoes de pagamento para deixar a negociacao mais objetiva desde o inicio.',
    ],
    sections: [
      { title: 'Oferta de milho', body: ['Publique volume, praca, safra, frete e pagamento para deixar a oferta pronta para consulta no marketplace.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar oferta de milho' },
      { href: '/comprar-milho', label: 'Comprar milho' },
      { href: '/vendedorgraos', label: 'Vender graos' },
    ],
  },
  {
    path: '/comprar-milho',
    title: 'Comprar milho | Alytha',
    description: 'Consulte oportunidades para comprar milho com informacoes de praca, volume, safra, frete, pagamento e valor.',
    eyebrow: 'Comprar milho',
    heading: 'Comprar milho com oportunidades organizadas por praca e volume.',
    paragraphs: [
      'A Alytha aproxima compradores de milho de ofertas e demandas com leitura comercial, dados de safra e informacoes de frete.',
      'A demanda de compra tambem pode ser cadastrada para que vendedores e corretores encontrem uma oportunidade aderente.',
    ],
    sections: [
      { title: 'Demanda de milho', body: ['Registre produto, volume, localidade e condicoes comerciais para encontrar uma oferta compativel.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar demanda de milho' },
      { href: '/vender-milho', label: 'Vender milho' },
      { href: '/compradorgraos', label: 'Comprar graos' },
    ],
  },
  {
    path: '/vender-sorgo',
    title: 'Vender sorgo | Alytha',
    description: 'Publique ofertas de sorgo com praca, volume, safra, frete e valor para encontrar compradores e corretores de graos.',
    eyebrow: 'Vender sorgo',
    heading: 'Vender sorgo com oferta organizada para o mercado de graos.',
    paragraphs: [
      'A Alytha ajuda o vendedor a apresentar ofertas de sorgo com informacoes comerciais suficientes para avaliacao rapida de compradores.',
      'Com dados organizados, a oportunidade fica mais facil de ser encontrada no marketplace e acompanhada pela operacao comercial.',
    ],
    sections: [
      { title: 'Oferta de sorgo', body: ['Informe quantidade, praca, safra, frete, valor e pagamento para deixar o lote pronto para negociacao.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar oferta de sorgo' },
      { href: '/comprar-sorgo', label: 'Comprar sorgo' },
      { href: '/vendedorgraos', label: 'Vender graos' },
    ],
  },
  {
    path: '/comprar-sorgo',
    title: 'Comprar sorgo | Alytha',
    description: 'Encontre oportunidades para comprar sorgo com praca, volume, safra, frete, pagamento e valor na plataforma Alytha.',
    eyebrow: 'Comprar sorgo',
    heading: 'Comprar sorgo com oportunidades comerciais qualificadas.',
    paragraphs: [
      'Compradores podem consultar ofertas de sorgo ou registrar demandas para aproximar a necessidade de compra de vendedores e corretores.',
      'O marketplace organiza informacoes que ajudam na avaliacao de disponibilidade, frete, safra e valor.',
    ],
    sections: [
      { title: 'Demanda de sorgo', body: ['Cadastre sua necessidade de compra com dados comerciais claros para facilitar a conexao com vendedores.'] },
    ],
    links: [
      { href: '/login', label: 'Cadastrar demanda de sorgo' },
      { href: '/vender-sorgo', label: 'Vender sorgo' },
      { href: '/compradorgraos', label: 'Comprar graos' },
    ],
  },
  {
    path: '/corretora-de-graos',
    title: 'Corretora de graos | Alytha',
    description: 'Alytha atua como corretora e intermediadora de graos, conectando compradores, vendedores e corretores de soja, milho e sorgo.',
    eyebrow: 'Corretora de graos',
    heading: 'Corretora de graos para conectar oferta, demanda e mesa comercial.',
    paragraphs: [
      'A Alytha combina marketplace, cadastro de oportunidades e rotina de corretagem para aproximar vendedores, compradores e corretores.',
      'A operacao cobre soja, milho e sorgo, com foco em praca, volume, safra, frete, valor e condicoes de pagamento.',
    ],
    sections: [
      { title: 'Intermediacao comercial', body: ['Corretores acompanham oportunidades e organizam negociacoes com informacoes comerciais padronizadas.'] },
    ],
    links: [
      { href: '/corretores', label: 'Corretores' },
      { href: '/marketplace-de-graos', label: 'Marketplace de graos' },
      { href: '/quemsomos', label: 'Quem somos' },
    ],
  },
  {
    path: '/marketplace-de-graos',
    title: 'Marketplace de graos | Alytha',
    description: 'Marketplace de graos para consultar ofertas de venda e demandas de compra de soja, milho e sorgo com praca, volume, frete e valor.',
    eyebrow: 'Marketplace de graos',
    heading: 'Marketplace de graos para ofertas e demandas de soja, milho e sorgo.',
    paragraphs: [
      'A Alytha centraliza oportunidades do mercado fisico de graos para que compradores, vendedores e corretores encontrem informacoes comerciais em um so lugar.',
      'Cada oportunidade pode reunir produto, quantidade, unidade, localidade, safra, frete, pagamento e valor.',
    ],
    sections: [
      { title: 'Ofertas e demandas', body: ['Consulte oportunidades ativas ou registre uma oferta/demanda para iniciar uma conversa comercial com mais contexto.'] },
    ],
    links: [
      { href: '/', label: 'Abrir marketplace' },
      { href: '/vender-soja', label: 'Vender soja' },
      { href: '/comprar-soja', label: 'Comprar soja' },
    ],
  },
].map((route) => ({
  ...route,
  outputPath: `${route.path.slice(1)}/index.html`,
  canonicalPath: route.path,
  rootContent: renderRootContent(route),
}));

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
        { href: '/vender-soja', label: 'Vender soja' },
        { href: '/comprar-soja', label: 'Comprar soja' },
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
        { href: '/vender-soja', label: 'Vender soja' },
        { href: '/comprar-soja', label: 'Comprar soja' },
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
  ...keywordRoutes,
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
