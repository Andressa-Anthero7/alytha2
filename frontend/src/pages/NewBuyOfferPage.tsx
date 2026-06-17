import Navbar from '../components/Navbar';
import OfferForm from '../components/OfferForm';

export default function NewBuyOfferPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff1de_0%,#ffffff_44%,#f8fafc_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8">
        <OfferForm
          offerType="compra"
          title="Cadastrar demanda (compra)"
          compactSpacing
          subtitle="Estruture sua demanda com produto, volume, praça, safra, faixa de preço e condições comerciais para facilitar a originação e acelerar a negociação."
        />
      </main>
    </div>
  );
}
