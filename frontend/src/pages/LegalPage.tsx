import { ArrowLeft, FileCheck2, Printer, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { LEGAL_DOCUMENT_VERSION, PRIVACY_POLICY_PATH, SERVICE_TERMS_PATH } from '../shared/legal';

type LegalPageProps = {
  variant: 'privacy' | 'terms';
};

type Section = {
  title: string;
  body: string[];
};

const companyName = 'Alytha Intermediações de Negócios Ltda';
const companyCnpj = '66.291.663/0001-10';
const contactEmail = 'contato@alytha.agr.br';

const privacySections: Section[] = [
  {
    title: '1. Controlador e abrangência',
    body: [
      `${companyName}, CNPJ ${companyCnpj}, atua como controladora dos dados pessoais tratados na plataforma Alytha quando define as finalidades e os meios de tratamento.`,
      'Esta política se aplica aos cadastros de comprador, vendedor, corretor, interessados que enviam oportunidades por links públicos, usuários autenticados e contatos realizados pela plataforma.',
    ],
  },
  {
    title: '2. Dados tratados',
    body: [
      'Podemos tratar nome, e-mail, WhatsApp, empresa, razão social, CPF ou CNPJ, inscrição estadual, endereço, cidade, UF, dados de acesso, histórico de ofertas, demandas, negociações, mensagens comerciais e informações necessárias para verificação cadastral.',
      'A plataforma não solicita dados pessoais sensíveis para cadastro ordinário. Caso algum dado sensível seja enviado espontaneamente em campos livres, ele poderá ser desconsiderado, removido ou tratado apenas quando houver base legal adequada.',
    ],
  },
  {
    title: '3. Finalidades',
    body: [
      'Os dados são usados para criar e validar cadastros, autenticar usuários, registrar ofertas e demandas, permitir contato comercial, conduzir negociações, emitir cobranças, prevenir fraude, cumprir obrigações legais, manter segurança e melhorar a operação da plataforma.',
      'Os dados de contato também podem ser utilizados para comunicações transacionais sobre cadastro, ofertas, demandas, pagamentos, suporte e avisos relevantes da Alytha.',
    ],
  },
  {
    title: '4. Bases legais',
    body: [
      'O tratamento pode se apoiar na execução de contrato ou procedimentos preliminares, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, proteção ao crédito, legítimo interesse e consentimento quando aplicável.',
      'Quando o consentimento for a base legal, o titular poderá revogá-lo pelos canais informados, sem afetar tratamentos realizados anteriormente de forma válida.',
    ],
  },
  {
    title: '5. Compartilhamento',
    body: [
      'Dados podem ser compartilhados com usuários envolvidos em uma oportunidade, corretores vinculados, parceiros técnicos de hospedagem, mensageria, segurança, meios de pagamento, contabilidade, consultoria jurídica e autoridades competentes.',
      'A Alytha adota critérios de necessidade e finalidade para limitar o compartilhamento ao mínimo necessário para execução dos serviços.',
    ],
  },
  {
    title: '6. Retenção e segurança',
    body: [
      'Os dados são mantidos pelo período necessário para cumprir as finalidades descritas, preservar histórico comercial, atender obrigações legais e resguardar direitos da Alytha e dos usuários.',
      'A plataforma utiliza medidas técnicas e administrativas para reduzir riscos de acesso não autorizado, perda, alteração, divulgação indevida ou uso inadequado dos dados.',
    ],
  },
  {
    title: '7. Direitos do titular',
    body: [
      'O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informações sobre compartilhamento, revisão de decisões automatizadas quando aplicável e revogação do consentimento.',
      `As solicitações devem ser enviadas para ${contactEmail}. Poderemos pedir confirmação de identidade antes de atender à requisição para proteger o próprio titular.`,
    ],
  },
  {
    title: '8. Atualizações',
    body: [
      `Esta política entra em vigor na versão ${LEGAL_DOCUMENT_VERSION}. Mudanças relevantes poderão ser comunicadas na plataforma ou pelos canais cadastrados.`,
    ],
  },
];

const termsSections: Section[] = [
  {
    title: '1. Partes e objeto',
    body: [
      `Este contrato regula a prestação de serviços por ${companyName}, CNPJ ${companyCnpj}, aos usuários cadastrados na plataforma Alytha.`,
      'A Alytha disponibiliza tecnologia, cadastro, organização de informações, publicação de oportunidades, apoio operacional e intermediação comercial para ofertas de venda e demandas de compra no mercado de grãos.',
    ],
  },
  {
    title: '2. Natureza do serviço',
    body: [
      'A plataforma atua como ambiente de aproximação comercial e suporte operacional. A concretização de negócios depende de análise das partes, disponibilidade do produto, crédito, documentação, logística, qualidade, precificação, tributos e demais condições comerciais.',
      'A Alytha pode operar com mesa comercial, corretores vinculados, publicações diretas e fluxos específicos de cobrança conforme regras exibidas na plataforma.',
    ],
  },
  {
    title: '3. Cadastro, veracidade e validação',
    body: [
      'O usuário declara que as informações fornecidas são verdadeiras, atualizadas e pertencem ao próprio usuário ou à empresa que ele representa legitimamente.',
      'A Alytha poderá validar, suspender, rejeitar ou solicitar complementação de cadastros quando identificar inconsistências, risco operacional, suspeita de fraude ou descumprimento deste contrato.',
    ],
  },
  {
    title: '4. Obrigações do usuário',
    body: [
      'O usuário deve usar a plataforma de boa-fé, manter sigilo de seu acesso, informar dados corretos, respeitar a legislação aplicável, honrar condições comerciais assumidas e não publicar informações falsas, abusivas, ilícitas ou de terceiros sem autorização.',
      'O usuário é responsável por tributos, licenças, autorizações, qualidade do produto, documentos fiscais, comprovantes, logística e demais requisitos do negócio que realizar.',
    ],
  },
  {
    title: '5. Remuneração, taxas e pagamentos',
    body: [
      'Os valores de assinatura, taxas de publicação direta, comissões da mesa, condições de PIX e demais regras comerciais serão exibidos nos fluxos da plataforma, propostas, contratos específicos ou comunicações comerciais.',
      'O cadastro de comprador ou vendedor poderá ter período de teste de 15 dias. Após esse período, poderá haver cobrança recorrente de R$ 99,90 via PIX automático ou R$ 129,90 via PIX convencional, conforme política comercial vigente.',
      'Cadastro realizado até 08/05/2026, às 23:59 horas, terá período de teste promocional de 30 dias. Após esse período promocional, seguem as condições normais de comercialização.',
      'Ao efetuar intermediação com contrato formalizado com corretor(a) da mesa de negociação Alytha, a taxa de assinatura referente ao mês subsequente ficará isenta, conforme o vencimento aplicável e a confirmação operacional da Alytha.',
    ],
  },
  {
    title: '6. Intermediação e limites de responsabilidade',
    body: [
      'A Alytha não garante fechamento de negócio, margem, lucro, disponibilidade permanente de contraparte, aprovação de crédito, entrega, qualidade final ou adimplemento por terceiros.',
      'A responsabilidade da Alytha limita-se aos serviços efetivamente prestados pela plataforma e pela mesa comercial, exceto quando houver contrato específico assinado estabelecendo condições diferentes.',
    ],
  },
  {
    title: '7. LGPD e confidencialidade',
    body: [
      'O usuário reconhece que a prestação dos serviços exige tratamento de dados pessoais e empresariais para cadastro, validação, contato, segurança, cobrança, suporte, auditoria e execução contratual.',
      'As partes devem manter confidenciais dados, documentos, preços, condições comerciais e informações estratégicas acessadas pela plataforma, salvo quando o compartilhamento for necessário para execução da negociação, cumprimento legal ou autorização da parte titular.',
    ],
  },
  {
    title: '8. Vigência, suspensão e encerramento',
    body: [
      'O contrato permanece vigente enquanto o usuário mantiver cadastro ativo ou utilizar serviços da Alytha. O acesso poderá ser suspenso em caso de inadimplência, fraude, uso indevido, violação legal ou descumprimento contratual.',
      'O encerramento do cadastro não elimina automaticamente registros que precisem ser mantidos para cumprimento legal, auditoria, segurança, cobrança, defesa de direitos ou histórico de operações.',
    ],
  },
  {
    title: '9. Foro e legislação aplicável',
    body: [
      'Este contrato é regido pelas leis da República Federativa do Brasil. Eventuais controvérsias deverão observar a legislação aplicável e os meios de solução previstos em contrato específico, quando existir.',
    ],
  },
];

export default function LegalPage({ variant }: LegalPageProps) {
  const isPrivacy = variant === 'privacy';
  const title = isPrivacy ? 'Termo LGPD, Privacidade e Tratamento de Dados' : 'Contrato de Prestação de Serviços Alytha';
  const eyebrow = isPrivacy ? 'LGPD' : 'Contrato Alytha';
  const intro = isPrivacy
    ? 'Documento contratual de transparência sobre tratamento de dados pessoais, bases legais, compartilhamento, retenção, segurança e direitos dos titulares.'
    : 'Documento contratual para uso da plataforma, cadastro, publicação de oportunidades, intermediação comercial, regras de pagamento, confidencialidade e LGPD.';
  const sections = isPrivacy ? privacySections : termsSections;
  const Icon = isPrivacy ? ShieldCheck : FileCheck2;
  const alternateLink = isPrivacy ? SERVICE_TERMS_PATH : PRIVACY_POLICY_PATH;
  const alternateLabel = isPrivacy ? 'Ver contrato de serviços' : 'Ver política LGPD';

  return (
    <div className="legal-document-page min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <main className="legal-print-content mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="legal-print-actions mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <Link
              to={alternateLink}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              {alternateLabel}
            </Link>
          </div>
        </div>

        <section className="legal-print-card rounded-lg border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.65)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="legal-print-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{intro}</p>
              <p className="mt-4 text-sm font-bold text-slate-500">Versão {LEGAL_DOCUMENT_VERSION}</p>
            </div>
          </div>
        </section>

        <section className="legal-print-card mt-6 rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
          <div className="space-y-8">
            {sections.map((section) => (
              <article key={section.title} className="legal-print-section border-b border-slate-200 pb-7 last:border-b-0 last:pb-0">
                <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="legal-governance-note mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
          <p className="font-black">Nota de governança</p>
          <p className="mt-2">
            Estes documentos foram estruturados para uso operacional da plataforma. Recomenda-se revisão jurídica periódica para adequação a contratos
            específicos, mudanças regulatórias, novas funcionalidades e políticas comerciais.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm"
              target="_blank"
              rel="noreferrer"
              className="font-black text-amber-950 underline underline-offset-4"
            >
              Lei 13.709/2018
            </a>
            <a
              href="https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes"
              target="_blank"
              rel="noreferrer"
              className="font-black text-amber-950 underline underline-offset-4"
            >
              FAQ ANPD
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
