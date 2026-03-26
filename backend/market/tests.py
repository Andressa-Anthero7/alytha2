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
            'brokerageValuePerSack': 0.5
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('0.50'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('375.00'))
        self.assertEqual(res.data['brokerageMode'], 'per_sack')
        self.assertEqual(res.data['brokerageValue'], 0.50)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

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
