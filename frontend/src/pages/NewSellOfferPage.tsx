import Navbar from '../components/Navbar';
import OfferForm from '../components/OfferForm';

export default function NewSellOfferPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e7f6ed_0%,#ffffff_44%,#f8fafc_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <OfferForm
          offerType="venda"
          title="Cadastrar oferta de venda"
          subtitle="Estruture sua oferta com produto, volume, praça, safra, base de preço, modalidade FOB/CIF e condições comerciais para dar mais velocidade à mesa e ao mercado."
        />
      </main>
    </div>
  );
}
