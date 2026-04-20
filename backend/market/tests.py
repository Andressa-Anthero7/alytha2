from decimal import Decimal

from django.core.management import call_command
from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth import get_user_model

from .models import User, Offer, Negotiation


class AuthFlowTests(APITestCase):
    def setUp(self):
        pass

    def test_register_login_and_create_offer(self):
        self.assertEqual(reverse('login'), '/api/login/')
        # register vendedor
        res = self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Produtor X',
            'email': 'produtor@test.com',
            'password': 'senha123',
            'phone': '5599999999',
            'company': 'Fazenda X'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        # login
        res = self.client.post('/api/login/', {'email': 'produtor@test.com', 'password': 'senha123'}, format='json')
        self.assertEqual(res.status_code, 200)
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        # create offer
        res = self.client.post('/api/offers', {
            'userId': User.objects.get(email='produtor@test.com').id,
            'type': 'venda',
            'grain': 'Soja',
            'quantity': 1000,
            'unit': 'Sacas',
            'price': 120.5,
            'location': 'Sorriso - MT',
            'crop': '24/25',
            'shipping': 'FOB',
            'quality': {'moisture': 14, 'impurity': 1, 'broken': 2, 'damaged': 1},
            'paymentTerms': '30 dias'
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Offer.objects.filter(grain='Soja').exists())

    def test_broker_can_match_negotiation(self):
        # create seller
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller',
            'email': 'seller@test.com',
            'password': 'pass',
        }, format='json')
        # create buyer
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer',
            'email': 'buyer@test.com',
            'password': 'pass',
        }, format='json')
        # login broker
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker',
            'email': 'broker@test.com',
            'password': 'pass',
        }, format='json')
        res = self.client.post('/api/login/', {'email': 'broker@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        seller = User.objects.get(email='seller@test.com')
        buyer = User.objects.get(email='buyer@test.com')
        # offers
        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Soja', 'quantity': 1000, 'unit': 'Sacas',
            'price': 120, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Soja', 'quantity': 800, 'unit': 'Sacas',
            'price': 125, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '30 dias'
        }, format='json').data
        # match
        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id']
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Negotiation.objects.exists())

    def test_broker_can_match_with_dynamic_percentage_commission(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Percent',
            'email': 'seller.percent@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Percent',
            'email': 'buyer.percent@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Percent',
            'email': 'broker.percent@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.percent@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.percent@test.com')
        buyer = User.objects.get(email='buyer.percent@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Soja', 'quantity': 1000, 'unit': 'Sacas',
            'price': 120, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Soja', 'quantity': 800, 'unit': 'Sacas',
            'price': 125, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '30 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'percentage',
            'brokeragePercentage': 5
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'percentage')
        self.assertEqual(negotiation.brokerage_percentage, Decimal('5.00'))
        self.assertIsNone(negotiation.brokerage_value_per_sack)
        self.assertEqual(negotiation.brokerage_fee, Decimal('4800.00'))
        self.assertEqual(res.data['brokerageMode'], 'percentage')
        self.assertEqual(res.data['brokeragePercentage'], 5.00)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

    def test_broker_can_list_users_for_trading_desk(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Users',
            'email': 'seller.users@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Users',
            'email': 'buyer.users@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Users',
            'email': 'broker.users@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.users@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        res = self.client.get('/api/users')

        self.assertEqual(res.status_code, 200)
        emails = [user['email'] for user in res.data]
        self.assertIn('seller.users@test.com', emails)
        self.assertIn('buyer.users@test.com', emails)
        self.assertIn('broker.users@test.com', emails)

    def test_broker_can_match_with_value_per_sack_commission(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Sack',
            'email': 'seller.sack@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Sack',
            'email': 'buyer.sack@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Sack',
            'email': 'broker.sack@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.sack@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.sack@test.com')
        buyer = User.objects.get(email='buyer.sack@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Milho', 'quantity': 900, 'unit': 'Sacas',
            'price': 80, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 750, 'unit': 'Sacas',
            'price': 82, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '14 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'per_sack',
            'brokerageValuePerSack': 1.0
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('750.00'))
        self.assertEqual(res.data['brokerageMode'], 'per_sack')
        self.assertEqual(res.data['brokerageValue'], 1.00)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

    def test_broker_cannot_match_with_per_sack_commission_below_one_real(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Sack Min',
            'email': 'seller.sack.min@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Sack Min',
            'email': 'buyer.sack.min@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Sack Min',
            'email': 'broker.sack.min@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.sack.min@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.sack.min@test.com')
        buyer = User.objects.get(email='buyer.sack.min@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Milho', 'quantity': 900, 'unit': 'Sacas',
            'price': 80, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 750, 'unit': 'Sacas',
            'price': 82, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '14 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'per_sack',
            'brokerageValuePerSack': 0.5
        }, format='json')

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['detail'], 'Selecione uma comissao do match entre R$ 1,00 e R$ 5,00 em passos de R$ 0,50.')

    def test_match_uses_registration_commission_from_mesa_offer(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Mesa',
            'email': 'seller.mesa@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Open',
            'email': 'buyer.open@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Mesa',
            'email': 'broker.mesa@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.mesa@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.mesa@test.com')
        buyer = User.objects.get(email='buyer.open@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Milho', 'quantity': 900, 'unit': 'Sacas',
            'price': 80, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'mesa', 'mesaCommission': 1.5,
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 750, 'unit': 'Sacas',
            'price': 82, 'location': 'GO', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': '14 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'percentage',
            'brokeragePercentage': 8
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get(id=res.data['id'])
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.50'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('1125.00'))

    def test_match_uses_registration_commission_from_exclusive_link_offer(self):
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Link Open',
            'email': 'buyer.link.open@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Link Source',
            'email': 'broker.link.source@test.com',
            'password': 'pass',
        }, format='json')

        broker_login = self.client.post('/api/login/', {'email': 'broker.link.source@test.com', 'password': 'pass'}, format='json')
        broker_token = broker_login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {broker_token}')
        broker_link = self.client.get('/api/broker-links/me/')
        self.assertEqual(broker_link.status_code, 200)
        token = broker_link.data['token']
        self.client.credentials()

        public_response = self.client.post(
            f'/api/broker-links/{token}/offers',
            {
                'name': 'Seller Link Source',
                'email': 'seller.link.source@test.com',
                'type': 'venda',
                'grain': 'Milho',
                'quantity': 700,
                'unit': 'Sacas',
                'price': 84,
                'location': 'Sinop - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'negotiationChannel': 'direta',
                'mesaCommission': 1.5,
                'quality': {'notes': 'Exclusivo'},
                'paymentTerms': '14 dias',
            },
            format='json',
        )
        self.assertEqual(public_response.status_code, 201)
        offer = Offer.objects.get(id=public_response.data['id'])
        self.assertEqual(offer.mesa_commission, Decimal('1.50'))

        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Link Match',
            'email': 'buyer.link.match@test.com',
            'password': 'pass',
        }, format='json')
        buyer = User.objects.get(email='buyer.link.match@test.com')

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {broker_token}')
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 650, 'unit': 'Sacas',
            'price': 86, 'location': 'Sinop - MT', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': '7 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': offer.id,
            'brokerageMode': 'percentage',
            'brokeragePercentage': 12
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get(id=res.data['id'])
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.50'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('975.00'))

    def test_broker_can_match_with_fixed_commission_and_buyer_payer(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Fixed',
            'email': 'seller.fixed@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Fixed',
            'email': 'buyer.fixed@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Fixed',
            'email': 'broker.fixed@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.fixed@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.fixed@test.com')
        buyer = User.objects.get(email='buyer.fixed@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Sorgo', 'quantity': 600, 'unit': 'Sacas',
            'price': 70, 'location': 'MS', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Sorgo', 'quantity': 500, 'unit': 'Sacas',
            'price': 73, 'location': 'MS', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '7 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'fixed',
            'brokerageValue': 1500,
            'brokeragePayer': 'buyer',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'fixed')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1500.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('1500.00'))
        self.assertEqual(negotiation.brokerage_payer, 'buyer')
        self.assertEqual(res.data['brokerageMode'], 'fixed')
        self.assertEqual(res.data['brokerageValue'], 1500.00)
        self.assertEqual(res.data['brokeragePayer'], 'buyer')

    def test_broker_can_match_with_spread_commission(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Spread',
            'email': 'seller.spread@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer Spread',
            'email': 'buyer.spread@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker Spread',
            'email': 'broker.spread@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.spread@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.spread@test.com')
        buyer = User.objects.get(email='buyer.spread@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Sorgo', 'quantity': 720, 'unit': 'Sacas',
            'price': 45.00, 'location': 'Barreiras - BA', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Sorgo', 'quantity': 680, 'unit': 'Sacas',
            'price': 47.50, 'location': 'Rio Verde - GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '7 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'spread',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'spread')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('2.50'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('1700.00'))
        self.assertEqual(res.data['brokerageMode'], 'spread')
        self.assertEqual(res.data['brokerageValue'], 2.50)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

    def test_broker_cannot_match_with_non_positive_spread_commission(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller No Spread',
            'email': 'seller.nospread@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer No Spread',
            'email': 'buyer.nospread@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker No Spread',
            'email': 'broker.nospread@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker.nospread@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller.nospread@test.com')
        buyer = User.objects.get(email='buyer.nospread@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Milho', 'quantity': 900, 'unit': 'Sacas',
            'price': 82.00, 'location': 'Jataí - GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 750, 'unit': 'Sacas',
            'price': 81.80, 'location': 'Jataí - GO', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '14 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'spread',
        }, format='json')

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['detail'], 'Spread deve ser positivo para ser usado como comissao')
        self.assertFalse(Negotiation.objects.exists())

    def test_broker_cannot_match_different_grains(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller',
            'email': 'seller2@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Buyer',
            'email': 'buyer2@test.com',
            'password': 'pass',
        }, format='json')
        self.client.post(reverse('register', args=['corretor']), {
            'name': 'Broker',
            'email': 'broker2@test.com',
            'password': 'pass',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'broker2@test.com', 'password': 'pass'}, format='json')
        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        seller = User.objects.get(email='seller2@test.com')
        buyer = User.objects.get(email='buyer2@test.com')

        sell_offer = self.client.post('/api/offers', {
            'userId': seller.id, 'type': 'venda', 'grain': 'Milho', 'quantity': 1000, 'unit': 'Sacas',
            'price': 120, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': 'A vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Soja', 'quantity': 800, 'unit': 'Sacas',
            'price': 125, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'quality': {}, 'paymentTerms': '30 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id']
        }, format='json')

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['detail'], 'So e possivel casar ofertas do mesmo grao')
        self.assertFalse(Negotiation.objects.exists())

    def test_authenticated_user_can_create_offer_without_user_id(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Self',
            'email': 'seller.self@test.com',
            'password': 'passforte123',
        }, format='json')

        res = self.client.post('/api/login/', {'email': 'seller.self@test.com', 'password': 'passforte123'}, format='json')
        self.assertEqual(res.status_code, 200)

        token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        res = self.client.post('/api/offers', {
            'type': 'venda',
            'grain': 'Soja',
            'quantity': 500,
            'unit': 'Sacas',
            'price': 130,
            'location': 'Rio Verde - GO',
            'crop': '24/25',
            'shipping': 'FOB',
            'quality': {'notes': 'Padrao exportacao'},
            'paymentTerms': 'A vista'
        }, format='json')

        self.assertEqual(res.status_code, 201)
        offer = Offer.objects.get(id=res.data['id'])
        self.assertEqual(offer.user.email, 'seller.self@test.com')

    def test_authenticated_user_can_create_offer_with_current_frontend_payload_shape(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Frontend',
            'email': 'seller.frontend@test.com',
            'password': 'SenhaFrontend123!',
        }, format='json')

        login = self.client.post('/api/login/', {'email': 'seller.frontend@test.com', 'password': 'SenhaFrontend123!'}, format='json')
        self.assertEqual(login.status_code, 200)

        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        payload = {
            'type': 'venda',
            'grain': 'Milho',
            'quantity': 780.5,
            'unit': 'Sacas',
            'price': 81.35,
            'location': 'Lucas do Rio Verde - MT',
            'crop': '24/25',
            'shipping': 'FOB',
            'quality': {
                'deliveryWindow': 'abril a maio',
                'notes': 'Umidade até 14%',
                'observations': 'Carga disponível para retirada imediata',
            },
            'paymentTerms': 'Pagamento em 7 dias',
        }

        response = self.client.post('/api/offers', payload, format='json')

        self.assertEqual(response.status_code, 201)
        offer = Offer.objects.get(id=response.data['id'])
        self.assertEqual(offer.user.email, 'seller.frontend@test.com')
        self.assertEqual(offer.offer_type, 'venda')
        self.assertEqual(offer.grain, 'Milho')
        self.assertEqual(offer.location, 'Lucas do Rio Verde - MT')
        self.assertEqual(offer.payment_terms, 'Pagamento em 7 dias')
        self.assertEqual(offer.quality['deliveryWindow'], 'abril a maio')
        self.assertEqual(offer.quality['notes'], 'Umidade até 14%')
        self.assertEqual(offer.quality['observations'], 'Carga disponível para retirada imediata')

    def test_change_password_endpoint(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Password',
            'email': 'seller.password@test.com',
            'password': 'SenhaInicial123!',
        }, format='json')

        login = self.client.post('/api/login/', {'email': 'seller.password@test.com', 'password': 'SenhaInicial123!'}, format='json')
        self.assertEqual(login.status_code, 200)

        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        change = self.client.post('/api/change-password/', {
            'current_password': 'SenhaInicial123!',
            'new_password': 'NovaSenha456@',
        }, format='json')

        self.assertEqual(change.status_code, 200)
        self.assertEqual(change.data['detail'], 'Senha alterada com sucesso.')

        self.client.credentials()

        old_login = self.client.post('/api/login/', {'email': 'seller.password@test.com', 'password': 'SenhaInicial123!'}, format='json')
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post('/api/login/', {'email': 'seller.password@test.com', 'password': 'NovaSenha456@'}, format='json')
        self.assertEqual(new_login.status_code, 200)

    def test_authenticated_user_can_view_own_profile(self):
        self.client.post(reverse('register', args=['comprador']), {
            'name': 'Perfil Cliente',
            'email': 'perfil.cliente@test.com',
            'password': 'PerfilSenha123!',
            'phone': '11999999999',
            'company': 'Cliente Alytha',
        }, format='json')

        login = self.client.post('/api/login/', {'email': 'perfil.cliente@test.com', 'password': 'PerfilSenha123!'}, format='json')
        self.assertEqual(login.status_code, 200)

        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.get('/api/profile/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], 'perfil.cliente@test.com')
        self.assertEqual(response.data['name'], 'Perfil Cliente')
        self.assertEqual(response.data['type'], 'comprador')
        self.assertEqual(response.data['company'], 'Cliente Alytha')

    def test_authenticated_user_can_update_own_profile(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Perfil Vendedor',
            'email': 'perfil.vendedor@test.com',
            'password': 'PerfilSenha123!',
            'phone': '16999999999',
            'company': 'Fazenda Inicial',
        }, format='json')

        login = self.client.post('/api/login/', {'email': 'perfil.vendedor@test.com', 'password': 'PerfilSenha123!'}, format='json')
        self.assertEqual(login.status_code, 200)

        token = login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        response = self.client.patch('/api/profile/', {
            'name': 'Perfil Vendedor Atualizado',
            'phone': '16888888888',
            'company': 'Fazenda Atualizada',
            'email': 'nao.deve.alterar@test.com',
        }, format='json')

        self.assertEqual(response.status_code, 200)

        user = User.objects.get(email='perfil.vendedor@test.com')
        self.assertEqual(user.name, 'Perfil Vendedor Atualizado')
        self.assertEqual(user.phone, '16888888888')
        self.assertEqual(user.company, 'Fazenda Atualizada')
        self.assertEqual(user.email, 'perfil.vendedor@test.com')


class SeedDemoCommandTests(APITestCase):
    def test_seed_demo_creates_three_buy_and_three_sell_per_grain(self):
        call_command('seed_demo')

        for grain in ('Soja', 'Milho', 'Sorgo'):
            self.assertEqual(
                Offer.objects.filter(grain=grain, offer_type='compra', status='ativa').count(),
                3,
            )
            self.assertEqual(
                Offer.objects.filter(grain=grain, offer_type='venda', status='ativa').count(),
                3,
            )

    def test_seed_demo_is_idempotent_for_generated_id_range(self):
        call_command('seed_demo')
        call_command('seed_demo')

        generated = Offer.objects.filter(id__gte=900000, id__lt=901000)
        self.assertEqual(generated.count(), 18)


class MarketplaceRulesTests(APITestCase):
    def register_user(self, role, name, email, password='SenhaForte123!'):
        response = self.client.post(
            reverse('register', args=[role]),
            {
                'name': name,
                'email': email,
                'password': password,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        return response

    def login(self, email, password='SenhaForte123!'):
        response = self.client.post('/api/login/', {'email': email, 'password': password}, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response.data

    def test_direct_offers_after_fourth_generate_pix_and_pending_status(self):
        self.register_user('vendedor', 'Seller Direct', 'seller.direct@test.com')
        self.login('seller.direct@test.com')

        payload = {
            'type': 'venda',
            'grain': 'Soja',
            'quantity': 500,
            'unit': 'Sacas',
            'price': 130,
            'location': 'Rio Verde - GO',
            'crop': '24/25',
            'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {'notes': 'Lote padrao'},
            'paymentTerms': 'A vista',
        }

        for index in range(4):
            response = self.client.post('/api/offers', {**payload, 'location': f'Rio Verde - GO {index}'}, format='json')
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.data['status'], 'ativa')
            self.assertEqual(response.data['directFee'], 0.00)
            self.assertIsNone(response.data['registration']['pix'])

        fifth = self.client.post('/api/offers', {**payload, 'location': 'Rio Verde - GO 5'}, format='json')

        self.assertEqual(fifth.status_code, 201)
        self.assertEqual(fifth.data['status'], 'aguardando_pagamento')
        self.assertEqual(fifth.data['directFee'], 100.00)
        self.assertEqual(fifth.data['directPaymentStatus'], 'pending')
        self.assertEqual(fifth.data['registration']['directOffersUsedThisMonth'], 5)
        self.assertEqual(fifth.data['registration']['freeDirectOffersRemaining'], 0)
        self.assertEqual(fifth.data['registration']['pix']['beneficiary'], 'Alytha Intermediacoes de Negocios Ltda')
        self.assertEqual(fifth.data['registration']['pix']['pixKey'], '66.291.663/0001-10')

    def test_broker_link_creates_exclusive_offer_visible_only_to_owner_broker(self):
        self.register_user('corretor', 'Broker A', 'broker.a@test.com')
        self.register_user('corretor', 'Broker B', 'broker.b@test.com')

        self.login('broker.a@test.com')
        broker_link = self.client.get('/api/broker-links/me/')
        self.assertEqual(broker_link.status_code, 200)
        token = broker_link.data['token']
        self.client.credentials()

        public_response = self.client.post(
            f'/api/broker-links/{token}/offers',
            {
                'name': 'Cliente Exclusivo',
                'email': 'cliente.exclusivo@test.com',
                'type': 'venda',
                'grain': 'Milho',
                'quantity': 700,
                'unit': 'Sacas',
                'price': 84,
                'location': 'Sinop - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'negotiationChannel': 'mesa',
                'mesaCommission': 1.5,
                'quality': {'notes': 'Exclusivo'},
                'paymentTerms': '14 dias',
            },
            format='json',
        )

        self.assertEqual(public_response.status_code, 201)
        offer_id = public_response.data['id']

        self.login('broker.a@test.com')
        owner_offers = self.client.get('/api/offers')
        self.assertEqual(owner_offers.status_code, 200)
        self.assertIn(offer_id, [offer['id'] for offer in owner_offers.data])
        self.client.credentials()

        self.login('broker.b@test.com')
        other_offers = self.client.get('/api/offers')
        self.assertEqual(other_offers.status_code, 200)
        self.assertNotIn(offer_id, [offer['id'] for offer in other_offers.data])
        self.client.credentials()

        public_market = self.client.get('/api/public-marketplace')
        self.assertEqual(public_market.status_code, 200)
        self.assertNotIn(offer_id, [offer['id'] for offer in public_market.data['latest']])

    def test_public_marketplace_offer_list_and_detail_support_search_and_contact(self):
        self.register_user('vendedor', 'Seller Public Search', 'seller.public.search@test.com')
        self.register_user('corretor', 'Broker Hidden', 'broker.hidden@test.com')

        seller = User.objects.get(email='seller.public.search@test.com')
        broker = User.objects.get(email='broker.hidden@test.com')

        visible_offer = Offer.objects.create(
            user=seller,
            offer_type='venda',
            grain='Soja',
            quantity=10000,
            unit='Sacas',
            price=Decimal('106.00'),
            location='Sinop - MT',
            crop='26',
            shipping='FOB',
            negotiation_channel='mesa',
            mesa_commission=Decimal('1.00'),
            quality={'notes': 'Lote especial'},
            payment_terms='A vista',
            status='ativa',
        )
        hidden_exclusive = Offer.objects.create(
            user=seller,
            exclusive_broker=broker,
            offer_type='venda',
            grain='Milho',
            quantity=500,
            unit='Sacas',
            price=Decimal('80.00'),
            location='Sinop - MT',
            crop='26',
            shipping='FOB',
            negotiation_channel='mesa',
            mesa_commission=Decimal('1.00'),
            quality={'notes': 'Nao deve aparecer'},
            payment_terms='A vista',
            status='ativa',
        )

        list_response = self.client.get('/api/public-marketplace/offers?q=Sinop')
        self.assertEqual(list_response.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in list_response.data['items']])
        self.assertNotIn(hidden_exclusive.id, [item['id'] for item in list_response.data['items']])

        search_notes = self.client.get('/api/public-marketplace/offers?q=especial')
        self.assertEqual(search_notes.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in search_notes.data['items']])

        detail = self.client.get(f'/api/public-marketplace/offers/{visible_offer.id}')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['id'], visible_offer.id)
        self.assertEqual(detail.data['contact']['email'], 'seller.public.search@test.com')
        self.assertEqual(detail.data['contact']['name'], 'Seller Public Search')

    def test_client_dashboard_returns_backend_payload_for_seller(self):
        self.register_user('vendedor', 'Seller Dashboard', 'seller.dashboard@test.com')
        self.register_user('comprador', 'Buyer Public', 'buyer.public@test.com')
        self.register_user('vendedor', 'Seller Public', 'seller.public@test.com')

        seller = User.objects.get(email='seller.dashboard@test.com')
        public_buyer = User.objects.get(email='buyer.public@test.com')
        public_seller = User.objects.get(email='seller.public@test.com')

        first_offer = Offer.objects.create(
            user=seller,
            offer_type='venda',
            grain='Soja',
            quantity=1000,
            unit='Sacas',
            price=120,
            location='Sorriso - MT',
            crop='24/25',
            shipping='FOB',
            negotiation_channel='mesa',
            mesa_commission=Decimal('1.00'),
            quality={},
            payment_terms='A vista',
            status='ativa',
        )
        second_offer = Offer.objects.create(
            user=seller,
            offer_type='compra',
            grain='Milho',
            quantity=500,
            unit='Sacas',
            price=71,
            location='Rio Verde - GO',
            crop='24/25',
            shipping='CIF',
            negotiation_channel='direta',
            direct_fee=Decimal('100.00'),
            direct_payment_status='pending',
            quality={},
            payment_terms='7 dias',
            status='aguardando_pagamento',
        )
        public_buy = Offer.objects.create(
            user=public_buyer,
            offer_type='compra',
            grain='Soja',
            quantity=850,
            unit='Sacas',
            price=126,
            location='Primavera do Leste - MT',
            crop='24/25',
            shipping='FOB',
            negotiation_channel='mesa',
            mesa_commission=Decimal('0.50'),
            quality={},
            payment_terms='14 dias',
            status='ativa',
        )
        Offer.objects.create(
            user=public_seller,
            offer_type='venda',
            grain='Milho',
            quantity=900,
            unit='Sacas',
            price=82,
            location='Jatai - GO',
            crop='24/25',
            shipping='FOB',
            negotiation_channel='mesa',
            mesa_commission=Decimal('1.00'),
            quality={},
            payment_terms='A vista',
            status='ativa',
        )

        self.login('seller.dashboard@test.com')
        response = self.client.get('/api/client-dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['roleLabel'], 'Vendedor')
        self.assertEqual(response.data['header']['title'], 'Painel do vendedor')
        self.assertEqual(response.data['summaryCards'][0]['value'], 2)
        self.assertEqual(response.data['summaryCards'][1]['value'], 1)
        self.assertEqual(response.data['summaryCards'][2]['value'], 1)
        self.assertEqual(response.data['summaryCards'][3]['value'], 1)
        self.assertEqual(response.data['hero']['badges'][0]['value'], 1)
        self.assertEqual(response.data['hero']['badges'][1]['value'], 1)
        self.assertEqual(response.data['hero']['badges'][2]['value'], 1)
        self.assertEqual(response.data['ownOffersSection']['items'][0]['id'], second_offer.id)
        self.assertEqual(response.data['ownOffersSection']['items'][1]['id'], first_offer.id)
        self.assertEqual(response.data['marketSection']['badges'][0]['value'], 1)
        self.assertEqual(response.data['marketSection']['items'][0]['id'], public_buy.id)
        self.assertEqual(response.data['marketSection']['items'][0]['type'], 'compra')

    def test_client_dashboard_rejects_broker(self):
        self.register_user('corretor', 'Broker Dashboard', 'broker.dashboard@test.com')

        self.login('broker.dashboard@test.com')
        response = self.client.get('/api/client-dashboard/')

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['detail'], 'Painel disponivel apenas para comprador e vendedor.')

    def test_match_is_locked_to_the_broker_that_created_it(self):
        self.register_user('vendedor', 'Seller Lock', 'seller.lock@test.com')
        self.register_user('comprador', 'Buyer Lock', 'buyer.lock@test.com')
        self.register_user('corretor', 'Broker Lock 1', 'broker.lock1@test.com')
        self.register_user('corretor', 'Broker Lock 2', 'broker.lock2@test.com')

        seller = User.objects.get(email='seller.lock@test.com')
        buyer = User.objects.get(email='buyer.lock@test.com')

        self.login('broker.lock1@test.com')
        sell_offer = self.client.post(
            '/api/offers',
            {
                'userId': seller.id,
                'type': 'venda',
                'grain': 'Soja',
                'quantity': 900,
                'unit': 'Sacas',
                'price': 120,
                'location': 'Sorriso - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'quality': {},
                'paymentTerms': 'A vista',
            },
            format='json',
        ).data
        buy_offer = self.client.post(
            '/api/offers',
            {
                'userId': buyer.id,
                'type': 'compra',
                'grain': 'Soja',
                'quantity': 850,
                'unit': 'Sacas',
                'price': 123,
                'location': 'Sorriso - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'quality': {},
                'paymentTerms': '7 dias',
            },
            format='json',
        ).data

        created = self.client.post(
            '/api/negotiations/match',
            {'buyOfferId': buy_offer['id'], 'sellOfferId': sell_offer['id']},
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        negotiation_id = created.data['id']
        self.client.credentials()

        self.login('broker.lock2@test.com')
        other_broker_view = self.client.get('/api/negotiations')
        self.assertEqual(other_broker_view.status_code, 200)
        self.assertNotIn(negotiation_id, [item['id'] for item in other_broker_view.data])

    def test_broker_cannot_open_more_than_six_pending_negotiations(self):
        self.register_user('vendedor', 'Seller Limit', 'seller.limit@test.com')
        self.register_user('comprador', 'Buyer Limit', 'buyer.limit@test.com')
        self.register_user('corretor', 'Broker Limit', 'broker.limit@test.com')

        seller = User.objects.get(email='seller.limit@test.com')
        buyer = User.objects.get(email='buyer.limit@test.com')

        self.login('broker.limit@test.com')

        def create_offer_pair(index):
            sell_offer = self.client.post(
                '/api/offers',
                {
                    'userId': seller.id,
                    'type': 'venda',
                    'grain': 'Milho',
                    'quantity': 1000 + index,
                    'unit': 'Sacas',
                    'price': 80 + index,
                    'location': f'Praça venda {index}',
                    'crop': '24/25',
                    'shipping': 'FOB',
                    'quality': {},
                    'paymentTerms': 'A vista',
                },
                format='json',
            ).data
            buy_offer = self.client.post(
                '/api/offers',
                {
                    'userId': buyer.id,
                    'type': 'compra',
                    'grain': 'Milho',
                    'quantity': 900 + index,
                    'unit': 'Sacas',
                    'price': 90 + index,
                    'location': f'Praça compra {index}',
                    'crop': '24/25',
                    'shipping': 'FOB',
                    'quality': {},
                    'paymentTerms': '7 dias',
                },
                format='json',
            ).data
            return sell_offer, buy_offer

        for index in range(6):
            sell_offer, buy_offer = create_offer_pair(index)
            response = self.client.post(
                '/api/negotiations/match',
                {'buyOfferId': buy_offer['id'], 'sellOfferId': sell_offer['id']},
                format='json',
            )
            self.assertEqual(response.status_code, 201)

        extra_sell_offer, extra_buy_offer = create_offer_pair(7)
        blocked = self.client.post(
            '/api/negotiations/match',
            {'buyOfferId': extra_buy_offer['id'], 'sellOfferId': extra_sell_offer['id']},
            format='json',
        )

        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(blocked.data['detail'], 'Somente pode ter 6 negociacoes em aberto.')
