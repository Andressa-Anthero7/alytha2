import { Link } from 'react-router-dom';
import { LEGAL_DOCUMENT_VERSION, PRIVACY_POLICY_PATH, SERVICE_TERMS_PATH } from '../shared/legal';

type LegalAgreementCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

export default function LegalAgreementCheckbox({ checked, onChange, className = '' }: LegalAgreementCheckboxProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-left shadow-sm ${className}`}
    >
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="text-sm leading-6 text-slate-700">
        Confirmo que li, compreendi e aceito o{' '}
        <Link to={SERVICE_TERMS_PATH} target="_blank" rel="noreferrer" className="font-black text-emerald-700 underline underline-offset-4">
          Contrato de Prestacao de Servicos da Alytha
        </Link>{' '}
        e a{' '}
        <Link to={PRIVACY_POLICY_PATH} target="_blank" rel="noreferrer" className="font-black text-emerald-700 underline underline-offset-4">
          Termo LGPD, Privacidade e Tratamento de Dados
        </Link>
        , versao {LEGAL_DOCUMENT_VERSION}. Estou ciente de que meus dados serao tratados para cadastro, validacao, operacao comercial,
        seguranca, comunicacao e cumprimento das obrigacoes legais e contratuais da plataforma.
      </span>
    </label>
  );
}
