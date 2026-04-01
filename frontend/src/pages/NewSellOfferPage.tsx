import Navbar from '../components/Navbar';
import OfferForm from '../components/OfferForm';

export default function NewSellOfferPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e7f6ed_0%,#ffffff_44%,#f8fafc_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <OfferForm
          offerType="venda"
          title="Cadastrar oferta de venda"
          subtitle="Informe produto, volume, praça, safra, condição FOB ou CIF e observações comerciais para a Alytha apresentar sua oportunidade."
        />
      </main>
    </div>
  );
}
