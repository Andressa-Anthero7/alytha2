from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models import Q, TextField
from django.db.models.functions import Cast
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Negotiation, Offer, User
from .serializers import (
    BrokerLinkOfferSubmissionSerializer,
    MarketplaceOfferSerializer,
    NegotiationSerializer,
    OfferSerializer,
    ProfileSerializer,
    PublicMarketplaceOfferDetailSerializer,
    PublicMarketplaceOfferListSerializer,
    UserSerializer,
)

AuthUser = get_user_model()

DIRECT_FREE_OFFERS_PER_MONTH = 4
DIRECT_OFFER_FEE = Decimal('100.00')
DESK_COMMISSION_MIN = Decimal('0.50')
MATCH_DESK_COMMISSION_MIN = Decimal('1.00')
DESK_COMMISSION_MAX = Decimal('5.00')
MAX_OPEN_NEGOTIATIONS = 6
PIX_CNPJ = '66.291.663/0001-10'
PIX_CNPJ_DIGITS = '66291663000110'
PIX_BENEFICIARY = 'Alytha Intermediacoes de Negocios Ltda'
ROLE_LABELS = {
    'vendedor': 'Vendedor',
    'comprador': 'Comprador',
    'corretor': 'Corretor',
    'backoffice': 'Backoffice',
}
CLIENT_DASHBOARD_CONFIG = {
    'vendedor': {
        'header': {
            'title': 'Painel do vendedor',
            'subtitle': 'Cadastre ofertas de venda, acompanhe sua base e monitore as últimas demandas do marketplace.',
        },
        'hero': {
            'eyebrow': 'Dashboard Alytha',
            'title': 'Sua rotina comercial em um painel pensado para quem vende.',
            'description': (
                'Use este espaço para publicar disponibilidades, organizar o histórico do seu perfil '
                'e acompanhar onde o mercado comprador está mais ativo.'
            ),
            'primaryAction': {
                'href': '/ofertas/venda/nova',
                'label': 'Cadastrar oferta de venda',
                'summary': 'Publique nova disponibilidade com modalidade de mesa ou oferta direta.',
            },
            'secondaryAction': {
                'href': '/ofertas/compra/nova',
                'label': 'Cadastrar demanda complementar',
                'summary': 'Registre uma necessidade pontual de compra sem sair do mesmo painel.',
            },
            'badgeLabels': {
                'primary': 'vendas cadastradas',
                'secondary': 'compras complementares',
                'pending': 'aguardando PIX',
            },
        },
        'account': {
            'eyebrow': 'Conta conectada',
            'profileLabel': 'Perfil',
            'companyLabel': 'Empresa',
            'focusTitle': 'Radar de compradores',
            'focusDescription': (
                'As demandas públicas recentes ajudam a identificar apetite de compra, '
                'comparar praças e priorizar novas conversas comerciais.'
            ),
            'marketIndicators': [
                {'id': 'sellOffers', 'label': 'Ofertas'},
                {'id': 'buyOffers', 'label': 'Demandas'},
                {'id': 'locations', 'label': 'Praças'},
            ],
        },
        'summaryCards': [
            {
                'id': 'totalOffers',
                'label': 'Cadastros totais',
                'description': 'Tudo o que este perfil já registrou na Alytha.',
                'tone': 'slate',
            },
            {
                'id': 'activeOffers',
                'label': 'Ofertas ativas',
                'description': 'Cadastros prontos para seguir em negociação.',
                'tone': 'emerald',
            },
            {
                'id': 'directOffers',
                'label': 'Oferta direta',
                'description': 'Cadastros enviados sem intermediar pela mesa.',
                'tone': 'amber',
            },
            {
                'id': 'deskOffers',
                'label': 'Mesa Alytha',
                'description': 'Cadastros que seguem com a corretagem da Alytha.',
                'tone': 'orange',
            },
        ],
        'ownOffers': {
            'eyebrow': 'Base do perfil',
            'title': 'Ofertas cadastradas pelo seu perfil',
            'description': (
                'Aqui ficam os cadastros mais recentes vinculados a sua conta, incluindo ofertas ativas, '
                'finalizadas e registros aguardando liberação.'
            ),
            'emptyTitle': 'Nenhum cadastro encontrado ainda.',
            'emptyDescription': 'Use o cadastro principal deste painel para registrar sua primeira oportunidade comercial.',
            'badges': {
                'total': 'total',
                'primary': 'vendas cadastradas',
                'secondary': 'compras complementares',
            },
        },
        'market': {
            'offerType': 'compra',
            'eyebrow': 'Leitura de mercado',
            'title': 'Últimas demandas cadastradas',
            'description': (
                'Demandas de compra recentes do marketplace público para uma leitura rápida do apetite comprador.'
            ),
            'emptyTitle': 'Sem oportunidades recentes por aqui.',
            'emptyDescription': 'Nenhuma demanda pública recente foi encontrada neste momento.',
            'badges': {
                'totalSuffix': 'no marketplace',
                'locationsSuffix': 'praças',
            },
            'tickerLabel': 'Demandas públicas',
        },
    },
    'comprador': {
        'header': {
            'title': 'Painel do comprador',
            'subtitle': 'Cadastre demandas de compra, acompanhe sua base e veja as últimas ofertas de venda do marketplace.',
        },
        'hero': {
            'eyebrow': 'Dashboard Alytha',
            'title': 'Seu painel para organizar demanda, comparar oportunidades e acelerar negociações.',
            'description': (
                'Centralize suas demandas de compra, mantenha seu histórico acessível '
                'e acompanhe as ofertas recentes que entram no mercado público da Alytha.'
            ),
            'primaryAction': {
                'href': '/ofertas/compra/nova',
                'label': 'Cadastrar demanda (compra)',
                'summary': 'Registre nova demanda com volume, praça, preço e modalidade de negociação.',
            },
            'secondaryAction': {
                'href': '/ofertas/compra/nova',
                'label': 'Cadastrar demanda (compra)',
                'summary': 'Abra um cadastro de demanda de compra no painel do comprador.',
            },
            'badgeLabels': {
                'primary': 'compras cadastradas',
                'secondary': 'vendas complementares',
                'pending': 'aguardando PIX',
            },
        },
        'account': {
            'eyebrow': 'Conta conectada',
            'profileLabel': 'Perfil',
            'companyLabel': 'Empresa',
            'focusTitle': 'Radar de vendedores',
            'focusDescription': (
                'As ofertas públicas recentes ajudam a enxergar volume, praça e referência de valor '
                'para orientar novas negociações.'
            ),
            'marketIndicators': [
                {'id': 'sellOffers', 'label': 'Ofertas'},
                {'id': 'buyOffers', 'label': 'Demandas'},
                {'id': 'locations', 'label': 'Praças'},
            ],
        },
        'summaryCards': [
            {
                'id': 'totalOffers',
                'label': 'Cadastros totais',
                'description': 'Tudo o que este perfil já registrou na Alytha.',
                'tone': 'slate',
            },
            {
                'id': 'activeOffers',
                'label': 'Ofertas ativas',
                'description': 'Cadastros prontos para seguir em negociação.',
                'tone': 'emerald',
            },
            {
                'id': 'directOffers',
                'label': 'Oferta direta',
                'description': 'Cadastros enviados sem intermediar pela mesa.',
                'tone': 'amber',
            },
            {
                'id': 'deskOffers',
                'label': 'Mesa Alytha',
                'description': 'Cadastros que seguem com a corretagem da Alytha.',
                'tone': 'orange',
            },
        ],
        'ownOffers': {
            'eyebrow': 'Base do perfil',
            'title': 'Ofertas cadastradas pelo seu perfil',
            'description': (
                'Aqui ficam os cadastros mais recentes vinculados a sua conta, incluindo ofertas ativas, '
                'finalizadas e registros aguardando liberação.'
            ),
            'emptyTitle': 'Nenhum cadastro encontrado ainda.',
            'emptyDescription': 'Use o cadastro principal deste painel para registrar sua primeira oportunidade comercial.',
            'badges': {
                'total': 'total',
                'primary': 'compras cadastradas',
                'secondary': 'vendas complementares',
            },
        },
        'market': {
            'offerType': 'venda',
            'eyebrow': 'Leitura de mercado',
            'title': 'Últimas ofertas cadastradas',
            'description': (
                'Ofertas de venda recentes do marketplace público para acompanhar disponibilidade e referência comercial.'
            ),
            'emptyTitle': 'Sem oportunidades recentes por aqui.',
            'emptyDescription': 'Nenhuma oferta pública recente foi encontrada neste momento.',
            'badges': {
                'totalSuffix': 'no marketplace',
                'locationsSuffix': 'praças',
            },
            'tickerLabel': 'Ofertas públicas',
        },
    },
}


class BrokerReadOnlyOrBackoffice(BasePermission):
    """
    Permite leitura para corretores e acesso completo para backoffice/staff.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_staff', False):
            return True

        market_user = User.objects.filter(email=request.user.email).first()
        if not market_user:
            return False

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return market_user.type in ('backoffice', 'corretor')

        return market_user.type == 'backoffice'


def get_market_user(request):
    if not request.user or not request.user.is_authenticated:
        return None
    return User.objects.filter(email=request.user.email).first()


def is_half_step_commission(value: Decimal) -> bool:
    half_steps = value * Decimal('2')
    return half_steps == half_steps.to_integral_value()


def validate_desk_commission(value: Decimal | None) -> Decimal:
    if value is None:
        return DESK_COMMISSION_MIN

    commission = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if commission < DESK_COMMISSION_MIN or commission > DESK_COMMISSION_MAX or not is_half_step_commission(commission):
        raise DRFValidationError({'detail': 'Selecione uma comissao da mesa entre R$ 0,50 e R$ 5,00 em passos de R$ 0,50.'})
    return commission


def validate_match_per_sack_commission(value: Decimal | None) -> Decimal:
    if value is None:
        return MATCH_DESK_COMMISSION_MIN

    commission = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if commission < MATCH_DESK_COMMISSION_MIN or commission > DESK_COMMISSION_MAX or not is_half_step_commission(commission):
        raise DRFValidationError({'detail': 'Selecione uma comissao do match entre R$ 1,00 e R$ 5,00 em passos de R$ 0,50.'})
    return commission


def offer_uses_registration_commission(offer: Offer) -> bool:
    return offer.negotiation_channel == 'mesa' or offer.exclusive_broker_id is not None


def resolve_match_registration_commission(sell_offer: Offer, buy_offer: Offer) -> Decimal | None:
    if offer_uses_registration_commission(sell_offer) and sell_offer.mesa_commission is not None:
        return validate_desk_commission(sell_offer.mesa_commission)
    if offer_uses_registration_commission(buy_offer) and buy_offer.mesa_commission is not None:
        return validate_desk_commission(buy_offer.mesa_commission)
    return None


def get_month_window(reference=None):
    now = reference or timezone.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def build_pix_payload(offer: Offer):
    amount = offer.direct_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    reference = f'ALYTHA-DIRETA-{offer.id}'
    formatted_amount = f'{amount:.2f}'.replace('.', ',')
    return {
        'requiresPix': amount > 0,
        'amount': float(amount),
        'formattedAmount': f'R$ {formatted_amount}',
        'beneficiary': PIX_BENEFICIARY,
        'pixKeyType': 'cnpj',
        'pixKey': PIX_CNPJ,
        'pixKeyDigits': PIX_CNPJ_DIGITS,
        'reference': reference,
        'copyMessage': (
            f'PIX CNPJ {PIX_CNPJ} | Favorecido: {PIX_BENEFICIARY} | '
            f'Valor: R$ {formatted_amount} | Referencia: {reference}'
        ),
    }


def build_offer_response(serializer_class, offer: Offer, registration_meta: dict):
    data = serializer_class(offer).data
    data['registration'] = registration_meta
    return data


def create_offer_with_rules(*, validated_data, target_user: User, exclusive_broker: User | None = None):
    channel = validated_data.get('negotiation_channel') or 'mesa'
    mesa_commission = validated_data.get('mesa_commission')
    quality = validated_data.get('quality') or {}
    direct_fee = Decimal('0.00')
    direct_payment_status = 'free'
    status_value = 'ativa'
    direct_count_in_month = 0
    uses_registration_commission = channel == 'mesa' or exclusive_broker is not None

    if uses_registration_commission:
        mesa_commission = validate_desk_commission(mesa_commission)
    if channel == 'direta':
        if not uses_registration_commission:
            mesa_commission = None
        month_start, month_end = get_month_window()
        direct_count_in_month = Offer.objects.filter(
            user=target_user,
            negotiation_channel='direta',
            created_at__gte=month_start,
            created_at__lt=month_end,
        ).count()
        if direct_count_in_month >= DIRECT_FREE_OFFERS_PER_MONTH:
            direct_fee = DIRECT_OFFER_FEE
            direct_payment_status = 'pending'
            status_value = 'aguardando_pagamento'
    elif not uses_registration_commission:
        mesa_commission = None

    offer = Offer.objects.create(
        user=target_user,
        exclusive_broker=exclusive_broker,
        offer_type=validated_data['offer_type'],
        grain=validated_data['grain'],
        quantity=validated_data['quantity'],
        unit=validated_data.get('unit') or 'Sacas',
        price=validated_data['price'],
        location=validated_data['location'],
        crop=validated_data['crop'],
        shipping=validated_data['shipping'],
        negotiation_channel=channel,
        mesa_commission=mesa_commission,
        direct_fee=direct_fee,
        direct_payment_status=direct_payment_status,
        quality=quality,
        payment_terms=validated_data['payment_terms'],
        status=status_value,
    )

    registration_meta = {
        'channel': channel,
        'exclusiveBrokerId': exclusive_broker.id if exclusive_broker else None,
        'exclusiveBrokerName': exclusive_broker.name if exclusive_broker else None,
        'mesaCommission': float(mesa_commission) if mesa_commission is not None else None,
        'directOffersUsedThisMonth': direct_count_in_month + 1 if channel == 'direta' else None,
        'freeDirectOffersRemaining': (
            max(0, DIRECT_FREE_OFFERS_PER_MONTH - (direct_count_in_month + 1)) if channel == 'direta' else None
        ),
        'pix': build_pix_payload(offer) if channel == 'direta' and direct_fee > 0 else None,
    }
    return offer, registration_meta


def get_public_marketplace_queryset():
    return (
        Offer.objects.select_related('user', 'exclusive_broker')
        .filter(status='ativa', exclusive_broker__isnull=True)
        .order_by('-created_at')
    )


def _parse_decimal_query_value(value):
    raw = str(value or '').strip()
    if not raw:
        return None

    candidate = raw.replace(' ', '')
    if candidate.count(',') == 1 and candidate.count('.') >= 1:
        candidate = candidate.replace('.', '').replace(',', '.')
    else:
        candidate = candidate.replace(',', '.')

    try:
        return Decimal(candidate)
    except (InvalidOperation, TypeError, ValueError):
        return None


def apply_public_marketplace_offer_search(queryset, search_term):
    term = str(search_term or '').strip()
    if not term:
        return queryset

    queryset = queryset.annotate(
        quality_text=Cast('quality', TextField()),
        price_text=Cast('price', TextField()),
        quantity_text=Cast('quantity', TextField()),
        mesa_commission_text=Cast('mesa_commission', TextField()),
        direct_fee_text=Cast('direct_fee', TextField()),
        created_at_text=Cast('created_at', TextField()),
    )

    search_q = (
        Q(offer_type__icontains=term)
        | Q(grain__icontains=term)
        | Q(unit__icontains=term)
        | Q(location__icontains=term)
        | Q(crop__icontains=term)
        | Q(shipping__icontains=term)
        | Q(negotiation_channel__icontains=term)
        | Q(payment_terms__icontains=term)
        | Q(status__icontains=term)
        | Q(direct_payment_status__icontains=term)
        | Q(user__name__icontains=term)
        | Q(user__email__icontains=term)
        | Q(user__phone__icontains=term)
        | Q(user__company__icontains=term)
        | Q(quality_text__icontains=term)
        | Q(price_text__icontains=term)
        | Q(quantity_text__icontains=term)
        | Q(mesa_commission_text__icontains=term)
        | Q(direct_fee_text__icontains=term)
        | Q(created_at_text__icontains=term)
    )

    if term.isdigit():
        search_q |= Q(id=int(term))

    decimal_value = _parse_decimal_query_value(term)
    if decimal_value is not None:
        search_q |= (
            Q(price=decimal_value)
            | Q(quantity=decimal_value)
            | Q(mesa_commission=decimal_value)
            | Q(direct_fee=decimal_value)
        )

    return queryset.filter(search_q)


def build_public_marketplace_stats(queryset):
    return {
        'sellOffers': queryset.filter(offer_type='venda').count(),
        'buyOffers': queryset.filter(offer_type='compra').count(),
        'locations': queryset.values_list('location', flat=True).distinct().count(),
    }


def build_public_marketplace_payload(queryset=None):
    visible_queryset = queryset or get_public_marketplace_queryset()
    stats = build_public_marketplace_stats(visible_queryset)
    latest = list(visible_queryset[:12])
    latest_sell = list(visible_queryset.filter(offer_type='venda')[:6])
    latest_buy = list(visible_queryset.filter(offer_type='compra')[:6])
    return {
        'stats': stats,
        'latest': MarketplaceOfferSerializer(latest, many=True).data,
        'sellOffers': MarketplaceOfferSerializer(latest_sell, many=True).data,
        'buyOffers': MarketplaceOfferSerializer(latest_buy, many=True).data,
    }


def build_client_dashboard_payload(market_user: User):
    config = CLIENT_DASHBOARD_CONFIG.get(market_user.type)
    if not config:
        raise PermissionDenied('Painel disponivel apenas para comprador e vendedor.')

    own_queryset = Offer.objects.select_related('user', 'exclusive_broker').filter(user=market_user).order_by('-created_at')
    public_queryset = get_public_marketplace_queryset()
    public_stats = build_public_marketplace_stats(public_queryset)
    primary_offer_type = 'venda' if market_user.type == 'vendedor' else 'compra'
    market_offer_type = config['market']['offerType']

    total_offers = own_queryset.count()
    active_offers = own_queryset.filter(status='ativa').count()
    direct_offers = own_queryset.filter(negotiation_channel='direta').count()
    desk_offers = own_queryset.filter(negotiation_channel='mesa').count()
    pending_pix_offers = own_queryset.filter(status='aguardando_pagamento').count()
    primary_offers = own_queryset.filter(offer_type=primary_offer_type).count()
    secondary_offers = own_queryset.exclude(offer_type=primary_offer_type).count()
    market_total = public_stats['buyOffers'] if market_offer_type == 'compra' else public_stats['sellOffers']

    own_latest = list(own_queryset[:6])
    market_latest = list(public_queryset.filter(offer_type=market_offer_type)[:6])

    summary_metric_values = {
        'totalOffers': total_offers,
        'activeOffers': active_offers,
        'directOffers': direct_offers,
        'deskOffers': desk_offers,
    }

    return {
        'roleLabel': ROLE_LABELS.get(market_user.type, market_user.type),
        'header': {
            **config['header'],
            'userName': market_user.name,
            'userCompany': market_user.company or ROLE_LABELS.get(market_user.type, market_user.type),
            'tickerItems': [
                f"{config['market']['tickerLabel']}: {market_total}",
                f"Cadastros do perfil: {total_offers}",
                f"Ofertas ativas: {active_offers}",
                f"Aguardando PIX: {pending_pix_offers}",
                f"Conta vinculada a {market_user.company}" if market_user.company else 'Conta pronta para novos cadastros',
            ],
        },
        'hero': {
            **config['hero'],
            'badges': [
                {
                    'id': 'primary',
                    'label': config['hero']['badgeLabels']['primary'],
                    'value': primary_offers,
                    'tone': 'emerald',
                },
                {
                    'id': 'secondary',
                    'label': config['hero']['badgeLabels']['secondary'],
                    'value': secondary_offers,
                    'tone': 'slate',
                },
                {
                    'id': 'pending',
                    'label': config['hero']['badgeLabels']['pending'],
                    'value': pending_pix_offers,
                    'tone': 'amber',
                },
            ],
        },
        'account': {
            **config['account'],
            'profileValue': ROLE_LABELS.get(market_user.type, market_user.type),
            'companyValue': market_user.company or 'Nao informada',
            'marketIndicators': [
                {
                    **item,
                    'value': public_stats['locations'] if item['id'] == 'locations' else public_stats[item['id']],
                }
                for item in config['account']['marketIndicators']
            ],
        },
        'summaryCards': [
            {
                **card,
                'value': summary_metric_values[card['id']],
            }
            for card in config['summaryCards']
        ],
        'ownOffersSection': {
            'eyebrow': config['ownOffers']['eyebrow'],
            'title': config['ownOffers']['title'],
            'description': config['ownOffers']['description'],
            'emptyTitle': config['ownOffers']['emptyTitle'],
            'emptyDescription': config['ownOffers']['emptyDescription'],
            'badges': [
                {
                    'id': 'total',
                    'label': config['ownOffers']['badges']['total'],
                    'value': total_offers,
                    'tone': 'slate',
                },
                {
                    'id': 'primary',
                    'label': config['ownOffers']['badges']['primary'],
                    'value': primary_offers,
                    'tone': 'emerald',
                },
                {
                    'id': 'secondary',
                    'label': config['ownOffers']['badges']['secondary'],
                    'value': secondary_offers,
                    'tone': 'amber',
                },
            ],
            'items': OfferSerializer(own_latest, many=True).data,
        },
        'marketSection': {
            'eyebrow': config['market']['eyebrow'],
            'title': config['market']['title'],
            'description': config['market']['description'],
            'emptyTitle': config['market']['emptyTitle'],
            'emptyDescription': config['market']['emptyDescription'],
            'badges': [
                {
                    'id': 'total',
                    'label': config['market']['badges']['totalSuffix'],
                    'value': market_total,
                    'tone': 'slate',
                },
                {
                    'id': 'locations',
                    'label': config['market']['badges']['locationsSuffix'],
                    'value': public_stats['locations'],
                    'tone': 'emerald',
                },
            ],
            'items': MarketplaceOfferSerializer(market_latest, many=True).data,
        },
    }


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated, BrokerReadOnlyOrBackoffice]


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuario nao localizado.')
        return Response(ProfileSerializer(market_user).data)

    def patch(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuario nao localizado.')

        serializer = ProfileSerializer(market_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        auth_user = request.user
        updated_name = serializer.validated_data.get('name')
        if updated_name:
            auth_user.first_name = updated_name
            auth_user.save(update_fields=['first_name'])

        return Response(serializer.data)


class BrokerLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        market_user = get_market_user(request)
        if not market_user or market_user.type != 'corretor':
            raise PermissionDenied('Apenas corretores podem acessar os links exclusivos.')

        if not market_user.broker_link_token:
            market_user.save(update_fields=['broker_link_token'])

        token = str(market_user.broker_link_token)
        return Response(
            {
                'token': token,
                'sellPath': f'/corretor/{token}/vender',
                'buyPath': f'/corretor/{token}/comprar',
            }
        )


class PublicBrokerLinkView(APIView):
    permission_classes = []

    def get(self, request, token):
        broker = get_object_or_404(User, broker_link_token=token, type='corretor')
        return Response(
            {
                'broker': {
                    'id': broker.id,
                    'name': broker.name,
                    'company': broker.company,
                }
            }
        )


class PublicMarketplaceView(APIView):
    permission_classes = []

    def get(self, request):
        return Response(build_public_marketplace_payload())


class PublicMarketplaceOfferListView(APIView):
    permission_classes = []

    @staticmethod
    def _parse_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def get(self, request):
        queryset = get_public_marketplace_queryset()

        offer_type = str(request.query_params.get('type') or '').strip().lower()
        if offer_type in ('venda', 'compra'):
            queryset = queryset.filter(offer_type=offer_type)

        shipping = str(request.query_params.get('shipping') or '').strip().upper()
        if shipping in ('FOB', 'CIF'):
            queryset = queryset.filter(shipping=shipping)

        negotiation_channel = str(request.query_params.get('negotiationChannel') or '').strip().lower()
        if negotiation_channel in ('mesa', 'direta'):
            queryset = queryset.filter(negotiation_channel=negotiation_channel)

        search = request.query_params.get('q')
        if search:
            queryset = apply_public_marketplace_offer_search(queryset, search)

        limit = min(max(self._parse_int(request.query_params.get('limit'), 24), 1), 100)
        offset = max(self._parse_int(request.query_params.get('offset'), 0), 0)

        total = queryset.count()
        items = queryset[offset : offset + limit]

        return Response(
            {
                'count': total,
                'limit': limit,
                'offset': offset,
                'items': PublicMarketplaceOfferListSerializer(items, many=True).data,
            }
        )


class PublicMarketplaceOfferDetailView(APIView):
    permission_classes = []

    def get(self, request, offer_id):
        offer = get_object_or_404(get_public_marketplace_queryset(), id=offer_id)
        return Response(PublicMarketplaceOfferDetailSerializer(offer).data)


class ClientDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuario nao localizado.')
        if market_user.type not in ('vendedor', 'comprador'):
            raise PermissionDenied('Painel disponivel apenas para comprador e vendedor.')
        return Response(build_client_dashboard_payload(market_user))


class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Offer.objects.select_related('user', 'exclusive_broker').order_by('-created_at')
        market_user = get_market_user(self.request)
        if self.request.user.is_staff and not market_user:
            visible = queryset
            if self.request.query_params.get('all') == 'true':
                return visible
            return visible.filter(status='ativa')
        if not market_user:
            return Offer.objects.none()

        user_role = getattr(market_user, 'type', None)
        if self.request.user.is_staff or user_role == 'backoffice':
            visible = queryset
        elif user_role == 'corretor':
            visible = queryset.filter(Q(exclusive_broker__isnull=True) | Q(exclusive_broker=market_user))
        else:
            visible = queryset.filter(user=market_user)

        if self.request.query_params.get('all') == 'true':
            return visible
        return visible.filter(status='ativa')

    def create(self, request, *args, **kwargs):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuario nao localizado.')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        requested_user = validated_data.pop('user', None)
        user_role = getattr(market_user, 'type', None)

        if request.user.is_staff or user_role in ('backoffice', 'corretor'):
            target_user = requested_user or market_user
        else:
            target_user = market_user

        offer, registration_meta = create_offer_with_rules(
            validated_data=validated_data,
            target_user=target_user,
        )

        return Response(
            build_offer_response(self.get_serializer, offer, registration_meta),
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        market_user = get_market_user(request)
        instance = self.get_object()
        user_role = getattr(market_user, 'type', None)
        is_privileged = request.user.is_staff or user_role in ('backoffice', 'corretor')
        if not is_privileged and instance.user != market_user:
            raise PermissionDenied('Sem permissao para remover esta oferta.')
        return super().destroy(request, *args, **kwargs)


class PublicBrokerOfferCreateView(APIView):
    permission_classes = []

    def post(self, request, token):
        broker = get_object_or_404(User, broker_link_token=token, type='corretor')
        serializer = BrokerLinkOfferSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        email = validated_data.pop('email')
        name = validated_data.pop('name')
        phone = validated_data.pop('phone', '')
        company = validated_data.pop('company', '')
        target_type = 'comprador' if validated_data['offer_type'] == 'compra' else 'vendedor'

        existing_user = User.objects.filter(email=email).first()
        if existing_user and existing_user.type != target_type:
            return Response(
                {'detail': 'Este e-mail ja esta vinculado a um perfil diferente na Alytha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if existing_user:
            target_user = existing_user
            updated_fields = []
            if name and target_user.name != name:
                target_user.name = name
                updated_fields.append('name')
            if phone and target_user.phone != phone:
                target_user.phone = phone
                updated_fields.append('phone')
            if company and target_user.company != company:
                target_user.company = company
                updated_fields.append('company')
            if updated_fields:
                target_user.save(update_fields=updated_fields)
        else:
            target_user = User.objects.create(
                name=name,
                email=email,
                type=target_type,
                phone=phone,
                company=company,
            )

        auth_user, created = AuthUser.objects.get_or_create(
            username=email,
            defaults={'email': email, 'first_name': target_user.name},
        )
        if created:
            auth_user.set_unusable_password()
            auth_user.save()

        offer, registration_meta = create_offer_with_rules(
            validated_data=validated_data,
            target_user=target_user,
            exclusive_broker=broker,
        )

        return Response(
            {
                **build_offer_response(OfferSerializer, offer, registration_meta),
                'broker': {'id': broker.id, 'name': broker.name},
            },
            status=status.HTTP_201_CREATED,
        )


class NegotiationViewSet(viewsets.ModelViewSet):
    serializer_class = NegotiationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _parse_decimal(value):
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def get_queryset(self):
        queryset = Negotiation.objects.select_related('offer', 'buy_offer', 'buyer', 'seller', 'broker').order_by('-created_at')
        market_user = get_market_user(self.request)
        user_role = getattr(market_user, 'type', None)
        if self.request.user.is_staff or user_role == 'backoffice':
            return queryset
        if user_role == 'corretor':
            return queryset.filter(broker=market_user)
        return queryset.filter(Q(buyer=market_user) | Q(seller=market_user) | Q(broker=market_user))

    @action(detail=False, methods=['post'], url_path='match')
    def match(self, request):
        market_user = get_market_user(request)
        user_role = getattr(market_user, 'type', None)
        if not (request.user.is_staff or user_role in ('backoffice', 'corretor')):
            raise PermissionDenied('Apenas corretores ou backoffice podem casar ofertas.')
        if not market_user:
            raise PermissionDenied('Usuario nao localizado.')

        open_negotiations = Negotiation.objects.filter(broker=market_user, status='pendente').count()
        if open_negotiations >= MAX_OPEN_NEGOTIATIONS:
            return Response(
                {'detail': 'Somente pode ter 6 negociacoes em aberto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buy_offer_id = request.data.get('buyOfferId')
        sell_offer_id = request.data.get('sellOfferId')

        if not buy_offer_id or not sell_offer_id:
            return Response({'detail': 'buyOfferId e sellOfferId sao obrigatorios'}, status=status.HTTP_400_BAD_REQUEST)

        buy_offer = get_object_or_404(Offer, pk=buy_offer_id)
        sell_offer = get_object_or_404(Offer, pk=sell_offer_id)

        if buy_offer.offer_type != 'compra' or sell_offer.offer_type != 'venda':
            return Response({'detail': 'Tipos de oferta incompativeis para match'}, status=status.HTTP_400_BAD_REQUEST)
        if buy_offer.status != 'ativa' or sell_offer.status != 'ativa':
            return Response({'detail': 'Apenas ofertas ativas podem ser casadas'}, status=status.HTTP_400_BAD_REQUEST)
        if (buy_offer.grain or '').strip().lower() != (sell_offer.grain or '').strip().lower():
            return Response({'detail': 'So e possivel casar ofertas do mesmo grao'}, status=status.HTTP_400_BAD_REQUEST)

        if user_role == 'corretor':
            exclusive_ids = {buy_offer.exclusive_broker_id, sell_offer.exclusive_broker_id} - {None}
            if exclusive_ids and exclusive_ids != {market_user.id}:
                return Response(
                    {'detail': 'Esta oferta exclusiva esta vinculada a outro corretor.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        proposed_quantity = min(buy_offer.quantity, sell_offer.quantity)
        proposed_price = sell_offer.price
        operation_total = Decimal(proposed_price) * Decimal(proposed_quantity)

        registration_commission = resolve_match_registration_commission(sell_offer, buy_offer)
        brokerage_mode = 'per_sack' if registration_commission is not None else request.data.get('brokerageMode') or 'percentage'
        if brokerage_mode not in ('percentage', 'fixed', 'per_sack', 'spread'):
            return Response({'detail': 'brokerageMode invalido'}, status=status.HTTP_400_BAD_REQUEST)

        brokerage_percentage = None
        brokerage_value = None
        brokerage_payer = request.data.get('brokeragePayer') or 'seller'
        if brokerage_payer not in ('seller', 'buyer'):
            return Response({'detail': 'brokeragePayer invalido'}, status=status.HTTP_400_BAD_REQUEST)

        if brokerage_mode == 'percentage':
            brokerage_percentage = self._parse_decimal(request.data.get('brokeragePercentage', '1'))
            if brokerage_percentage is None:
                return Response({'detail': 'brokeragePercentage invalido'}, status=status.HTTP_400_BAD_REQUEST)
            if brokerage_percentage < Decimal('0') or brokerage_percentage > Decimal('100'):
                return Response({'detail': 'brokeragePercentage deve estar entre 0 e 100'}, status=status.HTTP_400_BAD_REQUEST)
            brokerage_percentage = brokerage_percentage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            brokerage_fee = (operation_total * brokerage_percentage / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif brokerage_mode == 'spread':
            brokerage_value = (Decimal(buy_offer.price) - Decimal(sell_offer.price)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if brokerage_value <= Decimal('0'):
                return Response({'detail': 'Spread deve ser positivo para ser usado como comissao'}, status=status.HTTP_400_BAD_REQUEST)
            brokerage_fee = (Decimal(proposed_quantity) * brokerage_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            if registration_commission is not None:
                brokerage_value = registration_commission
                brokerage_fee = (Decimal(proposed_quantity) * brokerage_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            else:
                raw_value = request.data.get('brokerageValue')
                if raw_value is None:
                    raw_value = request.data.get('brokerageValuePerSack')

                brokerage_value = self._parse_decimal(raw_value)
                if brokerage_value is None:
                    return Response({'detail': 'brokerageValue invalido'}, status=status.HTTP_400_BAD_REQUEST)
                brokerage_value = brokerage_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

                if brokerage_mode == 'per_sack':
                    try:
                        brokerage_value = validate_match_per_sack_commission(brokerage_value)
                    except DRFValidationError as exc:
                        return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
                    brokerage_fee = (Decimal(proposed_quantity) * brokerage_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                else:
                    if brokerage_value < Decimal('0'):
                        return Response({'detail': 'brokerageValue deve ser maior ou igual a 0'}, status=status.HTTP_400_BAD_REQUEST)
                    brokerage_fee = brokerage_value

        negotiation = Negotiation.objects.create(
            offer=sell_offer,
            buy_offer=buy_offer,
            buyer=buy_offer.user,
            seller=sell_offer.user,
            broker=market_user,
            proposed_price=proposed_price,
            proposed_quantity=proposed_quantity,
            brokerage_mode=brokerage_mode,
            brokerage_percentage=brokerage_percentage,
            brokerage_value_per_sack=brokerage_value,
            brokerage_payer=brokerage_payer,
            brokerage_fee=brokerage_fee,
            status='pendente',
        )

        serializer = self.get_serializer(negotiation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        market_user = get_market_user(request)
        user_role = getattr(market_user, 'type', None)
        full_access = request.user.is_staff or user_role == 'backoffice'
        is_participant = market_user in [instance.buyer, instance.seller, instance.broker]
        if not full_access and not is_participant:
            raise PermissionDenied('Sem permissao para alterar esta negociacao.')

        status_value = request.data.get('status')
        if status_value:
            valid_status = {choice[0] for choice in Negotiation.STATUS_CHOICES}
            if status_value not in valid_status:
                return Response({'detail': 'Status invalido'}, status=status.HTTP_400_BAD_REQUEST)
            instance.status = status_value
            instance.save(update_fields=['status', 'updated_at'])
            if status_value == 'aceita':
                instance.offer.status = 'finalizada'
                instance.offer.save(update_fields=['status'])
                if instance.buy_offer:
                    instance.buy_offer.status = 'finalizada'
                    instance.buy_offer.save(update_fields=['status'])

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        market_user = get_market_user(request)
        user_role = getattr(market_user, 'type', None)
        full_access = request.user.is_staff or user_role == 'backoffice'
        is_participant = market_user in [instance.buyer, instance.seller, instance.broker]
        if not full_access and not is_participant:
            raise PermissionDenied('Sem permissao para remover esta negociacao.')
        return super().destroy(request, *args, **kwargs)


class RegisterView(APIView):
    """
    Registra usuarios por tipo: comprador, vendedor, corretor, transportador (corretor), armazenagem (backoffice).
    """

    ROLE_MAP = {
        'comprador': 'comprador',
        'vendedor': 'vendedor',
        'cliente': 'vendedor',
        'corretor': 'corretor',
        'transportador': 'corretor',
        'armazenagem': 'backoffice',
        'backoffice': 'backoffice',
    }

    permission_classes = []

    def post(self, request, role_slug):
        role = self.ROLE_MAP.get(role_slug)
        if not role:
            return Response({'detail': 'tipo invalido'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        data['type'] = role
        password = data.get('password') or AuthUser.objects.make_random_password()
        email = data.get('email')
        name = data.get('name') or data.get('username') or ''
        if not email:
            return Response({'detail': 'email obrigatorio'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                auth_user, _ = AuthUser.objects.get_or_create(username=email, defaults={'email': email, 'first_name': name})
                auth_user.set_password(password)
                auth_user.save()
            except IntegrityError:
                return Response({'detail': 'email ja cadastrado'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({**UserSerializer(user).data, 'token_info': 'use /api/login para obter JWT'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    Login com JWT (email + senha)
    """

    permission_classes = []

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'detail': 'email e senha obrigatorios'}, status=status.HTTP_400_BAD_REQUEST)
        auth_user = authenticate(username=email, password=password)
        if not auth_user:
            return Response({'detail': 'credenciais invalidas'}, status=status.HTTP_401_UNAUTHORIZED)
        market_user = User.objects.filter(email=email).first()
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(auth_user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(market_user).data if market_user else None,
            }
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {'detail': 'current_password e new_password sao obrigatorios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        if not user.check_password(current_password):
            return Response(
                {'detail': 'Senha atual invalida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response(
                {'detail': ' '.join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'detail': 'Senha alterada com sucesso.'}, status=status.HTTP_200_OK)
