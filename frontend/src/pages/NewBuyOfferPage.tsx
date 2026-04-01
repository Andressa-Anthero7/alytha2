import Navbar from '../components/Navbar';
import OfferForm from '../components/OfferForm';

export default function NewBuyOfferPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff1de_0%,#ffffff_44%,#f8fafc_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <OfferForm
          offerType="compra"
          title="Cadastrar intenção de compra"
          subtitle="Defina produto, volume, local, faixa de preço, padrão desejado e condições da operação para acelerar a prospecção."
        />
      </main>
    </div>
  );
}
