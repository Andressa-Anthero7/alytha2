from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from market.models import Offer, User


AuthUser = get_user_model()


USER_SEED_DATA = [
    {"id": 1, "name": "Nix Corretora", "email": "nix@agro.com", "type": "corretor", "company": "Mesa Agro"},
    {"id": 101, "name": "Fazenda Esperanca", "email": "venda1@agro.com", "type": "vendedor", "company": "Grupo Esperanca"},
    {"id": 102, "name": "Agro Vale", "email": "venda2@agro.com", "type": "vendedor", "company": "Agro Vale"},
    {"id": 103, "name": "Sementes do Campo", "email": "venda3@agro.com", "type": "vendedor", "company": "Sementes do Campo"},
    {"id": 201, "name": "Cargill S.A.", "email": "compra1@agro.com", "type": "comprador", "company": "Cargill"},
    {"id": 202, "name": "Agro Trading Sul", "email": "compra2@agro.com", "type": "comprador", "company": "Agro Trading Sul"},
    {"id": 203, "name": "Cooperativa Centro", "email": "compra3@agro.com", "type": "comprador", "company": "Cooperativa Centro"},
]

GRAIN_PROFILES = [
    {
        "grain": "Soja",
        "base_price": Decimal("135.50"),
        "base_quantity": Decimal("4500"),
        "crop": "24/25",
        "locations": ["Sorriso - MT", "Lucas do Rio Verde - MT", "Paranagua - PR"],
        "quality": {"moisture": 14, "impurity": 1, "broken": 2, "damaged": 1},
    },
    {
        "grain": "Milho",
        "base_price": Decimal("62.00"),
        "base_quantity": Decimal("6000"),
        "crop": "24/25",
        "locations": ["Rio Verde - GO", "Sinop - MT", "Cascavel - PR"],
        "quality": {"moisture": 13, "impurity": 1, "broken": 3, "damaged": 2},
    },
    {
        "grain": "Sorgo",
        "base_price": Decimal("45.00"),
        "base_quantity": Decimal("5200"),
        "crop": "24/25",
        "locations": ["Rio Verde - GO", "Uberlandia - MG", "Barreiras - BA"],
        "quality": {"moisture": 14, "impurity": 1, "broken": 2, "damaged": 2},
    },
]

AUTO_OFFER_ID_START = 900000
AUTO_OFFER_ID_END = 901000


class Command(BaseCommand):
    help = (
        "Popula o banco com dados de demonstracao. "
        "Gera automaticamente N compras e N vendas para cada grao da plataforma."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--orders-per-side",
            type=int,
            default=3,
            help="Quantidade de ofertas de compra e venda por grao (padrao: 3).",
        )
        parser.add_argument(
            "--no-clear-generated",
            action="store_true",
            help="Nao remove as ofertas auto-geradas previamente antes de gerar novas.",
        )

    @staticmethod
    def _quantize(value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"))

    def _seed_users(self):
        for data in USER_SEED_DATA:
            User.objects.update_or_create(id=data["id"], defaults=data)
            auth_user, _ = AuthUser.objects.update_or_create(
                username=data["email"],
                defaults={
                    "email": data["email"],
                    "first_name": data["name"],
                    "is_staff": data["type"] == "corretor",
                },
            )
            auth_user.set_password("seed123")
            auth_user.save()

    def _build_offer_payloads(self, orders_per_side: int):
        payment_sell = ["A vista", "15 dias", "30 dias"]
        payment_buy = ["A vista", "14 dias", "30 dias"]
        seller_ids = [101, 102, 103]
        buyer_ids = [201, 202, 203]
        offers = []
        offer_id = AUTO_OFFER_ID_START

        for grain_index, profile in enumerate(GRAIN_PROFILES):
            for idx in range(orders_per_side):
                price = self._quantize(profile["base_price"] + Decimal("0.65") * idx)
                quantity = profile["base_quantity"] + Decimal("850") * idx
                location = profile["locations"][idx % len(profile["locations"])]
                seller_id = seller_ids[(grain_index + idx) % len(seller_ids)]

                offers.append(
                    {
                        "id": offer_id,
                        "user_id": seller_id,
                        "offer_type": "venda",
                        "grain": profile["grain"],
                        "quantity": quantity,
                        "unit": "Sacas",
                        "price": price,
                        "location": location,
                        "crop": profile["crop"],
                        "shipping": "FOB",
                        "quality": profile["quality"],
                        "payment_terms": payment_sell[idx % len(payment_sell)],
                        "status": "ativa",
                    }
                )
                offer_id += 1

            for idx in range(orders_per_side):
                price = self._quantize(profile["base_price"] + Decimal("1.15") - Decimal("0.45") * idx)
                quantity = profile["base_quantity"] + Decimal("650") * idx
                location = profile["locations"][(idx + 1) % len(profile["locations"])]
                buyer_id = buyer_ids[(grain_index + idx) % len(buyer_ids)]

                offers.append(
                    {
                        "id": offer_id,
                        "user_id": buyer_id,
                        "offer_type": "compra",
                        "grain": profile["grain"],
                        "quantity": quantity,
                        "unit": "Sacas",
                        "price": price,
                        "location": location,
                        "crop": profile["crop"],
                        "shipping": "CIF",
                        "quality": profile["quality"],
                        "payment_terms": payment_buy[idx % len(payment_buy)],
                        "status": "ativa",
                    }
                )
                offer_id += 1

        return offers

    def handle(self, *args, **options):
        orders_per_side = max(1, options["orders_per_side"])

        self._seed_users()

        if not options["no_clear_generated"]:
            Offer.objects.filter(id__gte=AUTO_OFFER_ID_START, id__lt=AUTO_OFFER_ID_END).delete()

        offers_data = self._build_offer_payloads(orders_per_side)
        for data in offers_data:
            Offer.objects.update_or_create(id=data["id"], defaults=data)

        grains_count = len(GRAIN_PROFILES)
        total_offers = grains_count * orders_per_side * 2
        self.stdout.write(
            self.style.SUCCESS(
                f"Dados de demonstracao carregados: {orders_per_side} compras + {orders_per_side} vendas "
                f"para cada um dos {grains_count} graos ({total_offers} ofertas)."
            )
        )
