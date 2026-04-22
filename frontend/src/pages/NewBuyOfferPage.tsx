import Navbar from '../components/Navbar';
import OfferForm from '../components/OfferForm';

export default function NewBuyOfferPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff1de_0%,#ffffff_44%,#f8fafc_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <OfferForm
          offerType="compra"
          title="Cadastrar demanda (compra)"
          subtitle="Estruture sua demanda com produto, volume, praça, safra, faixa de preço e condições comerciais para facilitar a originação e acelerar a negociação."
        />
      </main>
    </div>
  );
}
