from decimal import Decimal

from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle
from django.urls import reverse
from django.contrib.auth import get_user_model

from .models import Negotiation, Offer, PasswordResetToken, User


@override_settings(ALYTHA_PUBLIC_SITE_URL='https://app.alytha.test', ALYTHA_SHARE_IMAGE_URL='https://app.alytha.test/logo.png')
class PublicMarketplaceOfferShareTests(APITestCase):
    def test_offer_share_page_renders_server_side_open_graph_metadata(self):
        seller = User.objects.create(
            name='Seller Share',
            email='seller.share@test.com',
            type='vendedor',
            phone='5516999999999',
            company='Fazenda Share',
        )
        offer = Offer.objects.create(
            user=seller,
            offer_type='venda',
            grain='Soja',
            quantity=Decimal('1000.00'),
            unit='Sacas',
            price=Decimal('120.50'),
            location='Sorriso - MT',
            crop='24/25',
            shipping='FOB',
            negotiation_channel='direta',
            quality={},
            payment_terms='A vista',
            status='ativa',
        )

        response = self.client.get(reverse('public_marketplace_offer_share', args=[offer.id]))
        content = response.content.decode('utf-8')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')
        self.assertIn('property="og:title" content="Oferta de venda de Soja | Alytha"', content)
        self.assertIn('property="og:description" content="Oferta de venda em Sorriso - MT:', content)
        self.assertIn('property="og:image" content="https://app.alytha.test/logo.png"', content)
        self.assertIn(f'href="https://app.alytha.test/oportunidades/{offer.id}"', content)


class ValidatedRegistrationAPITestCase(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self._raw_post = self.client.post

        def wrapped_post(path, data=None, *args, **kwargs):
            if isinstance(path, str) and path.startswith('/api/register/') and isinstance(data, dict):
                data = {
                    **data,
                    'accept_terms': data.get('accept_terms', True),
                    'accept_privacy': data.get('accept_privacy', True),
                }
            response = self._raw_post(path, data=data, *args, **kwargs)
            if (
                isinstance(path, str)
                and path.startswith('/api/register/')
                and response.status_code == 201
                and isinstance(data, dict)
                and data.get('email')
            ):
                User.objects.filter(email=data['email']).exclude(type='backoffice').update(is_validated=True)
            return response

        self.client.post = wrapped_post

    def register_without_auto_validation(self, role, payload):
        payload = {
            **payload,
            'accept_terms': payload.get('accept_terms', True),
            'accept_privacy': payload.get('accept_privacy', True),
        }
        return self._raw_post(reverse('register', args=[role]), payload, format='json')


class AuthFlowTests(ValidatedRegistrationAPITestCase):

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

    def test_login_rejects_auth_user_without_market_profile(self):
        get_user_model().objects.create_user(
            username='orphan.client@test.com',
            email='orphan.client@test.com',
            password='SenhaOrphan123!',
        )

        response = self.client.post(
            '/api/login/',
            {'email': 'orphan.client@test.com', 'password': 'SenhaOrphan123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['detail'], 'Usuário não localizado.')
        self.assertNotIn('access', response.data)

    def test_login_accepts_auth_user_with_email_when_username_is_legacy(self):
        market_user = User.objects.create(
            name='Cliente Legacy',
            email='cliente.legacy@test.com',
            type='vendedor',
            is_validated=True,
        )
        get_user_model().objects.create_user(
            username='legacy-login',
            email='cliente.legacy@test.com',
            password='SenhaLegacy123!',
        )

        response = self.client.post(
            '/api/login/',
            {'email': 'CLIENTE.LEGACY@test.com', 'password': 'SenhaLegacy123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['id'], market_user.id)
        self.assertEqual(response.data['user']['email'], 'cliente.legacy@test.com')

    def test_dashboard_resolves_market_profile_from_auth_username_when_auth_email_is_blank(self):
        market_user = User.objects.create(
            name='Cliente Sem Email Auth',
            email='cliente.sem.email.auth@test.com',
            type='vendedor',
            is_validated=True,
        )
        get_user_model().objects.create_user(
            username='cliente.sem.email.auth@test.com',
            email='',
            password='SenhaUsername123!',
        )

        login = self.client.post(
            '/api/login/',
            {'email': 'cliente.sem.email.auth@test.com', 'password': 'SenhaUsername123!'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['user']['id'], market_user.id)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = self.client.get('/api/client-dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['header']['userName'], 'Cliente Sem Email Auth')

    def test_public_register_requires_backoffice_validation_before_login(self):
        response = self.register_without_auto_validation(
            'vendedor',
            {
                'name': 'Seller Pending',
                'email': 'seller.pending@test.com',
                'password': 'SenhaPendente123!',
            },
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email='seller.pending@test.com')
        self.assertFalse(created_user.is_validated)

        blocked_login = self.client.post(
            '/api/login/',
            {'email': 'seller.pending@test.com', 'password': 'SenhaPendente123!'},
            format='json',
        )
        self.assertEqual(blocked_login.status_code, 403)
        self.assertEqual(blocked_login.data['detail'], 'Seu cadastro ainda aguarda validacao do backoffice antes do primeiro login.')

        created_user.is_validated = True
        created_user.save(update_fields=['is_validated'])

        allowed_login = self.client.post(
            '/api/login/',
            {'email': 'seller.pending@test.com', 'password': 'SenhaPendente123!'},
            format='json',
        )
        self.assertEqual(allowed_login.status_code, 200)

    def test_public_register_rejects_privileged_roles(self):
        for role_slug in ('backoffice', 'armazenagem'):
            response = self.register_without_auto_validation(
                role_slug,
                {
                    'name': f'Privileged {role_slug}',
                    'email': f'{role_slug}@test.com',
                    'password': 'SenhaPendente123!',
                },
            )

            self.assertEqual(response.status_code, 403)
            self.assertEqual(response.data['detail'], 'Cadastro de backoffice deve ser criado por um administrador.')

        self.assertFalse(User.objects.filter(type='backoffice').exists())

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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Soja', 'quantity': 800, 'unit': 'Sacas',
            'price': 125, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': '30 dias'
        }, format='json').data
        # match
        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id']
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Negotiation.objects.exists())

    def test_broker_match_ignores_dynamic_percentage_commission(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Soja', 'quantity': 800, 'unit': 'Sacas',
            'price': 125, 'location': 'MT', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
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
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('800.00'))
        self.assertEqual(res.data['brokerageMode'], 'per_sack')
        self.assertEqual(res.data['brokerageValue'], 1.00)
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
        names = [user['name'] for user in res.data]
        emails = [user['email'] for user in res.data]
        self.assertIn('Seller Users', names)
        self.assertIn('Buyer Users', names)
        self.assertIn('Broker Users', names)
        self.assertNotIn('seller.users@test.com', emails)
        self.assertNotIn('buyer.users@test.com', emails)

    def test_broker_match_ignores_value_per_sack_commission(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
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
            'brokerageMode': 'per_sack',
            'brokerageValuePerSack': 4.0
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

    def test_broker_match_ignores_per_sack_commission_below_one_real(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
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
            'brokerageMode': 'per_sack',
            'brokerageValuePerSack': 0.5
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('750.00'))

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
            'quality': {}, 'paymentTerms': 'À vista'
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
                'accept_terms': True,
                'accept_privacy': True,
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

    def test_broker_match_ignores_fixed_commission_and_buyer_payer(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Sorgo', 'quantity': 500, 'unit': 'Sacas',
            'price': 73, 'location': 'MS', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
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
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('500.00'))
        self.assertEqual(negotiation.brokerage_payer, 'seller')
        self.assertEqual(res.data['brokerageMode'], 'per_sack')
        self.assertEqual(res.data['brokerageValue'], 1.00)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

    def test_broker_match_ignores_spread_commission(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Sorgo', 'quantity': 680, 'unit': 'Sacas',
            'price': 47.50, 'location': 'Rio Verde - GO', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': '7 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'spread',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertIsNone(negotiation.brokerage_percentage)
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('680.00'))
        self.assertEqual(res.data['brokerageMode'], 'per_sack')
        self.assertEqual(res.data['brokerageValue'], 1.00)
        self.assertEqual(res.data['brokeragePayer'], 'seller')

    def test_broker_match_ignores_non_positive_spread_commission(self):
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
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': 'À vista'
        }, format='json').data
        buy_offer = self.client.post('/api/offers', {
            'userId': buyer.id, 'type': 'compra', 'grain': 'Milho', 'quantity': 750, 'unit': 'Sacas',
            'price': 81.80, 'location': 'Jataí - GO', 'crop': '24/25', 'shipping': 'FOB',
            'negotiationChannel': 'direta',
            'quality': {}, 'paymentTerms': '14 dias'
        }, format='json').data

        res = self.client.post('/api/negotiations/match', {
            'buyOfferId': buy_offer['id'],
            'sellOfferId': sell_offer['id'],
            'brokerageMode': 'spread',
        }, format='json')

        self.assertEqual(res.status_code, 201)
        negotiation = Negotiation.objects.get()
        self.assertEqual(negotiation.brokerage_mode, 'per_sack')
        self.assertEqual(negotiation.brokerage_value_per_sack, Decimal('1.00'))
        self.assertEqual(negotiation.brokerage_fee, Decimal('750.00'))

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
            'quality': {}, 'paymentTerms': 'À vista'
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
        self.assertEqual(res.data['detail'], 'Só é possível casar ofertas do mesmo grão')
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
            'quality': {'notes': 'Padrão exportação', 'damagedSoybean': True},
            'paymentTerms': 'À vista'
        }, format='json')

        self.assertEqual(res.status_code, 201)
        offer = Offer.objects.get(id=res.data['id'])
        self.assertEqual(offer.user.email, 'seller.self@test.com')
        self.assertTrue(offer.quality['damagedSoybean'])

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
                'moisture': 14,
                'impurity': 1,
                'damaged': 3,
                'ardidos': 2,
                'ph': 78,
                'standard': 'Exportação',
                'deliveryWindow': 'abril a maio',
                'notes': 'Lote com prêmio para exportação',
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
        self.assertEqual(offer.quality['moisture'], 14)
        self.assertEqual(offer.quality['impurity'], 1)
        self.assertEqual(offer.quality['damaged'], 3)
        self.assertEqual(offer.quality['ardidos'], 2)
        self.assertEqual(offer.quality['ph'], 78)
        self.assertEqual(offer.quality['standard'], 'Exportação')
        self.assertEqual(offer.quality['deliveryWindow'], 'abril a maio')
        self.assertEqual(offer.quality['notes'], 'Lote com prêmio para exportação')
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

    def test_register_accepts_extended_profile_fields(self):
        response = self.client.post(reverse('register', args=['comprador']), {
            'name': 'Comprador Perfil',
            'email': 'comprador.perfil@test.com',
            'password': 'PerfilCompleto123!',
            'phone': '11988887777',
            'company': 'Trading Horizonte',
            'legal_name': 'Trading Horizonte Ltda',
            'profile_segment': 'trading',
            'document_type': 'cnpj',
            'document_number': '04.252.011/0001-10',
            'state_registration': '123456789',
            'address_zip_code': '01452-000',
            'address_street': 'Avenida das Nações',
            'address_number': '1500',
            'address_complement': 'Conjunto 82',
            'address_district': 'Jardins',
            'address_city': 'São Paulo',
            'address_state': 'sp',
            'address_country': 'Brasil',
            'document_notes': 'Comprador habilitado para mercado interno e exportação.',
            'accept_terms': True,
            'accept_privacy': True,
            'legal_version': '2026-04-24',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='comprador.perfil@test.com')
        self.assertEqual(user.type, 'comprador')
        self.assertEqual(user.profile_segment, 'trading')
        self.assertEqual(user.document_type, 'cnpj')
        self.assertEqual(user.document_number, '04.252.011/0001-10')
        self.assertEqual(user.legal_name, 'Trading Horizonte Ltda')
        self.assertEqual(user.address_state, 'SP')
        self.assertEqual(user.address_city, 'São Paulo')
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertIsNotNone(user.privacy_accepted_at)
        self.assertEqual(user.legal_version, '2026-04-24')
        self.assertEqual(response.data['profile_segment'], 'trading')
        self.assertEqual(response.data['document_type'], 'cnpj')

    def test_register_rejects_invalid_cpf(self):
        response = self.client.post(reverse('register', args=['comprador']), {
            'name': 'Comprador CPF Invalido',
            'email': 'comprador.cpf.invalido@test.com',
            'password': 'PerfilCompleto123!',
            'document_type': 'cpf',
            'document_number': '111.111.111-11',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('document_number', response.data)

    def test_register_rejects_duplicate_cpf_or_cnpj(self):
        first = self.client.post(reverse('register', args=['comprador']), {
            'name': 'Comprador CPF',
            'email': 'comprador.cpf@test.com',
            'password': 'PerfilCompleto123!',
            'document_type': 'cpf',
            'document_number': '529.982.247-25',
        }, format='json')
        self.assertEqual(first.status_code, 201)

        second = self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Vendedor CPF Duplicado',
            'email': 'vendedor.cpf.duplicado@test.com',
            'password': 'PerfilCompleto123!',
            'document_type': 'cpf',
            'document_number': '52998224725',
        }, format='json')

        self.assertEqual(second.status_code, 400)
        self.assertIn('document_number', second.data)

    @override_settings(ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN=True)
    def test_forgot_password_request_and_confirm_flow(self):
        self.client.post(reverse('register', args=['vendedor']), {
            'name': 'Seller Recover',
            'email': 'seller.recover@test.com',
            'password': 'SenhaInicial123!',
        }, format='json')

        request_reset = self.client.post('/api/forgot-password/request/', {
            'email': 'seller.recover@test.com',
        }, format='json')

        self.assertEqual(request_reset.status_code, 200)
        self.assertIn('resetPath', request_reset.data)
        self.assertIn('token', request_reset.data)

        reset_token = PasswordResetToken.objects.get(user__email='seller.recover@test.com')
        self.assertTrue(reset_token.is_active)

        confirm_reset = self.client.post('/api/forgot-password/confirm/', {
            'token': str(reset_token.token),
            'new_password': 'SenhaNova789@',
        }, format='json')

        self.assertEqual(confirm_reset.status_code, 200)
        self.assertEqual(confirm_reset.data['detail'], 'Senha redefinida com sucesso.')

        reset_token.refresh_from_db()
        self.assertIsNotNone(reset_token.used_at)

        old_login = self.client.post('/api/login/', {'email': 'seller.recover@test.com', 'password': 'SenhaInicial123!'}, format='json')
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post('/api/login/', {'email': 'seller.recover@test.com', 'password': 'SenhaNova789@'}, format='json')
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


class PublicEndpointThrottleTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.original_throttle_rates = ScopedRateThrottle.THROTTLE_RATES.copy()
        ScopedRateThrottle.THROTTLE_RATES.update(
            {
                'auth_login': '2/min',
                'password_reset': '2/min',
            }
        )
        cache.clear()

    def tearDown(self):
        ScopedRateThrottle.THROTTLE_RATES.clear()
        ScopedRateThrottle.THROTTLE_RATES.update(self.original_throttle_rates)
        cache.clear()
        super().tearDown()

    def test_login_is_throttled_after_configured_rate(self):
        for _ in range(2):
            response = self.client.post(
                '/api/login/',
                {'email': 'missing@test.com', 'password': 'SenhaInvalida123!'},
                format='json',
            )
            self.assertEqual(response.status_code, 401)

        throttled = self.client.post(
            '/api/login/',
            {'email': 'missing@test.com', 'password': 'SenhaInvalida123!'},
            format='json',
        )

        self.assertEqual(throttled.status_code, 429)

    def test_password_reset_request_is_throttled_after_configured_rate(self):
        for _ in range(2):
            response = self.client.post(
                '/api/forgot-password/request/',
                {'email': 'missing@test.com'},
                format='json',
            )
            self.assertEqual(response.status_code, 200)

        throttled = self.client.post(
            '/api/forgot-password/request/',
            {'email': 'missing@test.com'},
            format='json',
        )

        self.assertEqual(throttled.status_code, 429)


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


class MarketplaceRulesTests(ValidatedRegistrationAPITestCase):
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
            'quality': {'notes': 'Lote padrão'},
            'paymentTerms': 'À vista',
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
        self.assertEqual(fifth.data['registration']['pix']['beneficiary'], 'Alytha Intermediações de Negócios Ltda')
        self.assertEqual(fifth.data['registration']['pix']['pixKey'], '66.291.663/0001-10')

    def test_client_profile_cannot_create_or_list_other_profile_offer_type(self):
        self.register_user('vendedor', 'Seller Locked', 'seller.locked@test.com')
        self.login('seller.locked@test.com')

        blocked_buy = self.client.post(
            '/api/offers',
            {
                'type': 'compra',
                'grain': 'Soja',
                'quantity': 500,
                'unit': 'Sacas',
                'price': 130,
                'location': 'Rio Verde - GO',
                'crop': '24/25',
                'shipping': 'FOB',
                'quality': {},
                'paymentTerms': 'A vista',
            },
            format='json',
        )

        self.assertEqual(blocked_buy.status_code, 403)
        self.assertEqual(blocked_buy.data['detail'], 'Perfil Vendedor so pode cadastrar oferta de venda.')

        seller = User.objects.get(email='seller.locked@test.com')
        visible_sell = Offer.objects.create(
            user=seller,
            offer_type='venda',
            grain='Soja',
            quantity=Decimal('500'),
            unit='Sacas',
            price=Decimal('130.00'),
            location='Rio Verde - GO',
            crop='24/25',
            shipping='FOB',
            quality={},
            payment_terms='A vista',
            status='ativa',
        )
        hidden_buy = Offer.objects.create(
            user=seller,
            offer_type='compra',
            grain='Milho',
            quantity=Decimal('300'),
            unit='Sacas',
            price=Decimal('70.00'),
            location='Jatai - GO',
            crop='24/25',
            shipping='FOB',
            quality={},
            payment_terms='7 dias',
            status='ativa',
        )

        seller_offers = self.client.get('/api/offers?all=true')
        self.assertEqual(seller_offers.status_code, 200)
        seller_offer_ids = [offer['id'] for offer in seller_offers.data]
        self.assertIn(visible_sell.id, seller_offer_ids)
        self.assertNotIn(hidden_buy.id, seller_offer_ids)
        self.client.credentials()

        self.register_user('comprador', 'Buyer Locked', 'buyer.locked@test.com')
        self.login('buyer.locked@test.com')
        blocked_sell = self.client.post(
            '/api/offers',
            {
                'type': 'venda',
                'grain': 'Soja',
                'quantity': 500,
                'unit': 'Sacas',
                'price': 130,
                'location': 'Rio Verde - GO',
                'crop': '24/25',
                'shipping': 'FOB',
                'quality': {},
                'paymentTerms': 'A vista',
            },
            format='json',
        )

        self.assertEqual(blocked_sell.status_code, 403)
        self.assertEqual(blocked_sell.data['detail'], 'Perfil Comprador so pode cadastrar demanda de compra.')

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
                'accept_terms': True,
                'accept_privacy': True,
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
        seller.phone = '16999999999'
        seller.company = 'Fazenda Publica'
        seller.save(update_fields=['phone', 'company'])
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
            payment_terms='À vista',
            status='ativa',
        )
        other_public_offer = Offer.objects.create(
            user=seller,
            offer_type='venda',
            grain='Milho',
            quantity=850,
            unit='Sacas',
            price=Decimal('82.00'),
            location='Lucas do Rio Verde - MT',
            crop='26',
            shipping='CIF',
            negotiation_channel='direta',
            quality={'notes': 'Outro grão público'},
            payment_terms='14 dias',
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
            quality={'notes': 'Não deve aparecer'},
            payment_terms='À vista',
            status='ativa',
        )

        list_response = self.client.get('/api/public-marketplace/offers?q=Sinop')
        self.assertEqual(list_response.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in list_response.data['items']])
        self.assertNotIn(hidden_exclusive.id, [item['id'] for item in list_response.data['items']])

        self.client.credentials(HTTP_AUTHORIZATION='Bearer token-invalido')
        invalid_token_list = self.client.get('/api/public-marketplace/offers?limit=100')
        self.assertEqual(invalid_token_list.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in invalid_token_list.data['items']])

        search_notes = self.client.get('/api/public-marketplace/offers?q=especial')
        self.assertEqual(search_notes.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in search_notes.data['items']])

        grain_filter = self.client.get('/api/public-marketplace/offers?grain=Soja')
        self.assertEqual(grain_filter.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in grain_filter.data['items']])
        self.assertNotIn(other_public_offer.id, [item['id'] for item in grain_filter.data['items']])
        self.assertNotIn(hidden_exclusive.id, [item['id'] for item in grain_filter.data['items']])

        detail = self.client.get(f'/api/public-marketplace/offers/{visible_offer.id}')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['id'], visible_offer.id)
        self.assertEqual(detail.data['contact']['name'], 'Acesso restrito')
        self.assertEqual(detail.data['contact']['company'], '')
        self.assertTrue(detail.data['contact']['locked'])
        self.assertNotEqual(detail.data['contact']['email'], 'seller.public.search@test.com')
        self.assertNotEqual(detail.data['contact']['phone'], '16999999999')
        self.client.credentials()

        self.register_user('comprador', 'Buyer Viewer', 'buyer.viewer@test.com')
        self.login('buyer.viewer@test.com')
        buyer_list = self.client.get('/api/public-marketplace/offers?grain=Soja')
        self.assertEqual(buyer_list.status_code, 200)
        self.assertIn(visible_offer.id, [item['id'] for item in buyer_list.data['items']])

        buyer_detail = self.client.get(f'/api/public-marketplace/offers/{visible_offer.id}')

        self.assertEqual(buyer_detail.status_code, 200)
        self.assertFalse(buyer_detail.data['contact']['locked'])
        self.assertEqual(buyer_detail.data['contact']['email'], 'seller.public.search@test.com')
        self.client.credentials()

        self.login('seller.public.search@test.com')
        authenticated_detail = self.client.get(f'/api/public-marketplace/offers/{visible_offer.id}')

        self.assertEqual(authenticated_detail.status_code, 200)
        self.assertFalse(authenticated_detail.data['contact']['locked'])
        self.assertEqual(authenticated_detail.data['contact']['email'], 'seller.public.search@test.com')
        self.assertEqual(authenticated_detail.data['contact']['phone'], '16999999999')
        self.assertEqual(authenticated_detail.data['contact']['name'], 'Seller Public Search')
        self.assertEqual(authenticated_detail.data['contact']['company'], 'Fazenda Publica')
        self.client.credentials()

        self.login('broker.hidden@test.com')
        broker_marketplace = self.client.get('/api/public-marketplace')
        self.assertEqual(broker_marketplace.status_code, 200)
        self.assertEqual(broker_marketplace.data['stats']['sellOffers'], 0)
        self.assertEqual(broker_marketplace.data['stats']['buyOffers'], 0)
        self.assertEqual(broker_marketplace.data['latest'], [])

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
            payment_terms='À vista',
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
        public_sell = Offer.objects.create(
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
            payment_terms='À vista',
            status='ativa',
        )

        self.login('seller.dashboard@test.com')
        response = self.client.get('/api/client-dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['roleLabel'], 'Vendedor')
        self.assertEqual(response.data['header']['title'], 'Painel do vendedor')
        self.assertEqual(response.data['summaryCards'][0]['value'], 1)
        self.assertEqual(response.data['summaryCards'][1]['value'], 1)
        self.assertEqual(response.data['summaryCards'][2]['value'], 0)
        self.assertEqual(response.data['summaryCards'][3]['value'], 1)
        self.assertEqual(response.data['hero']['badges'][0]['value'], 1)
        self.assertEqual(response.data['hero']['badges'][1]['value'], 0)
        self.assertEqual(response.data['hero']['badges'][2]['value'], 0)
        self.assertEqual(response.data['ownOffersSection']['items'][0]['id'], first_offer.id)
        self.assertNotIn(second_offer.id, [item['id'] for item in response.data['ownOffersSection']['items']])
        market_item_ids = [item['id'] for item in response.data['marketSection']['items']]
        self.assertEqual(response.data['marketSection']['badges'][0]['value'], 2)
        self.assertIn(public_sell.id, market_item_ids)
        self.assertNotIn(public_buy.id, market_item_ids)
        self.assertEqual(response.data['marketSection']['items'][0]['type'], 'venda')

    def test_client_dashboard_rejects_broker(self):
        self.register_user('corretor', 'Broker Dashboard', 'broker.dashboard@test.com')

        self.login('broker.dashboard@test.com')
        response = self.client.get('/api/client-dashboard/')

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['detail'], 'Painel disponível apenas para comprador e vendedor.')

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
                'paymentTerms': 'À vista',
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
                    'paymentTerms': 'À vista',
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
        self.assertEqual(blocked.data['detail'], 'Somente pode ter 6 negociações em aberto.')


class BackofficeManagementTests(ValidatedRegistrationAPITestCase):
    def create_backoffice_user(self, name, email, password='SenhaForte123!'):
        User.objects.create(
            name=name,
            email=email,
            type='backoffice',
            is_validated=True,
        )
        get_user_model().objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name,
            is_staff=True,
            is_superuser=True,
        )

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

    def test_backoffice_can_create_update_and_delete_users_with_auth_sync(self):
        auth_user_model = get_user_model()
        self.create_backoffice_user('Backoffice Manager', 'backoffice.manager@test.com')
        self.login('backoffice.manager@test.com')

        create_response = self.client.post(
            '/api/users',
            {
                'name': 'Corretor Operacional',
                'email': 'broker.ops@test.com',
                'type': 'corretor',
                'phone': '16999990000',
                'company': 'Mesa Alytha',
                'profile_segment': 'empresa_corretora',
                'password': 'BrokerOps123!',
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, 201)
        created_user = User.objects.get(email='broker.ops@test.com')
        self.assertEqual(created_user.type, 'corretor')
        self.assertTrue(auth_user_model.objects.filter(username='broker.ops@test.com').exists())

        self.client.credentials()
        broker_login = self.client.post('/api/login/', {'email': 'broker.ops@test.com', 'password': 'BrokerOps123!'}, format='json')
        self.assertEqual(broker_login.status_code, 200)

        self.login('backoffice.manager@test.com')
        update_response = self.client.patch(
            f'/api/users/{created_user.id}',
            {
                'name': 'Corretor Operacional Senior',
                'email': 'broker.ops.senior@test.com',
                'company': 'Mesa Alytha Senior',
                'password': 'NovaSenhaBroker456@',
            },
            format='json',
        )

        self.assertEqual(update_response.status_code, 200)
        created_user.refresh_from_db()
        self.assertEqual(created_user.name, 'Corretor Operacional Senior')
        self.assertEqual(created_user.email, 'broker.ops.senior@test.com')
        self.assertEqual(created_user.company, 'Mesa Alytha Senior')
        self.assertFalse(auth_user_model.objects.filter(username='broker.ops@test.com').exists())
        self.assertTrue(auth_user_model.objects.filter(username='broker.ops.senior@test.com').exists())

        self.client.credentials()
        old_login = self.client.post('/api/login/', {'email': 'broker.ops@test.com', 'password': 'BrokerOps123!'}, format='json')
        self.assertEqual(old_login.status_code, 401)
        new_login = self.client.post('/api/login/', {'email': 'broker.ops.senior@test.com', 'password': 'NovaSenhaBroker456@'}, format='json')
        self.assertEqual(new_login.status_code, 200)

        self.login('backoffice.manager@test.com')
        delete_response = self.client.delete(f'/api/users/{created_user.id}')
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(User.objects.filter(id=created_user.id).exists())
        self.assertFalse(auth_user_model.objects.filter(username='broker.ops.senior@test.com').exists())

    def test_backoffice_can_create_offer_and_manage_negotiation_status(self):
        self.create_backoffice_user('Backoffice Desk', 'backoffice.desk@test.com')
        self.register_user('vendedor', 'Seller Managed', 'seller.managed@test.com')
        self.register_user('comprador', 'Buyer Managed', 'buyer.managed@test.com')
        self.login('backoffice.desk@test.com')

        seller = User.objects.get(email='seller.managed@test.com')
        buyer = User.objects.get(email='buyer.managed@test.com')

        sell_offer_response = self.client.post(
            '/api/offers',
            {
                'userId': seller.id,
                'type': 'venda',
                'grain': 'Soja',
                'quantity': 1000,
                'unit': 'Sacas',
                'price': 120,
                'location': 'Sorriso - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'negotiationChannel': 'mesa',
                'mesaCommission': 1.5,
                'quality': {'notes': 'Lote administrado pelo backoffice'},
                'paymentTerms': 'A vista',
            },
            format='json',
        )
        self.assertEqual(sell_offer_response.status_code, 201)

        buy_offer_response = self.client.post(
            '/api/offers',
            {
                'userId': buyer.id,
                'type': 'compra',
                'grain': 'Soja',
                'quantity': 800,
                'unit': 'Sacas',
                'price': 123,
                'location': 'Rondonopolis - MT',
                'crop': '24/25',
                'shipping': 'FOB',
                'negotiationChannel': 'direta',
                'quality': {'notes': 'Demanda criada pelo backoffice'},
                'paymentTerms': '7 dias',
            },
            format='json',
        )
        self.assertEqual(buy_offer_response.status_code, 201)

        match_response = self.client.post(
            '/api/negotiations/match',
            {
                'buyOfferId': buy_offer_response.data['id'],
                'sellOfferId': sell_offer_response.data['id'],
                'brokerageMode': 'percentage',
                'brokeragePercentage': 4,
            },
            format='json',
        )
        self.assertEqual(match_response.status_code, 201)

        negotiation = Negotiation.objects.get(id=match_response.data['id'])
        self.assertEqual(negotiation.status, 'pendente')

        update_response = self.client.patch(
            f'/api/negotiations/{negotiation.id}',
            {'status': 'aceita'},
            format='json',
        )
        self.assertEqual(update_response.status_code, 200)

        negotiation.refresh_from_db()
        negotiation.offer.refresh_from_db()
        negotiation.buy_offer.refresh_from_db()
        self.assertEqual(negotiation.status, 'aceita')
        self.assertEqual(negotiation.offer.status, 'finalizada')
        self.assertEqual(negotiation.buy_offer.status, 'finalizada')


