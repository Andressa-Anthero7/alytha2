import json
import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Q, TextField
from django.db.models.functions import Cast
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.html import escape
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied, ValidationError as DRFValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Negotiation, Offer, PasswordResetToken, User
from .serializers import (
    BrokerLinkOfferSubmissionSerializer,
    BrokerUserSummarySerializer,
    MarketplaceOfferSerializer,
    NegotiationSerializer,
    OfferSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    PublicMarketplaceOfferDetailSerializer,
    PublicMarketplaceOfferListSerializer,
    UserSerializer,
)

AuthUser = get_user_model()
logger = logging.getLogger(__name__)

DIRECT_FREE_OFFERS_PER_MONTH = 4
DIRECT_OFFER_FEE = Decimal('100.00')
DESK_COMMISSION_MIN = Decimal('0.50')
MATCH_DESK_COMMISSION_MIN = Decimal('1.00')
DESK_COMMISSION_MAX = Decimal('5.00')
MAX_OPEN_NEGOTIATIONS = 6
PIX_CNPJ = '66.291.663/0001-10'
PIX_CNPJ_DIGITS = '66291663000110'
PIX_BENEFICIARY = 'Alytha Intermediações de Negócios Ltda'
PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)
LEGAL_DOCUMENT_VERSION = '25/04/2026'
ROLE_LABELS = {
    'vendedor': 'Vendedor',
    'comprador': 'Comprador',
    'corretor': 'Corretor',
    'backoffice': 'Backoffice',
}


def parse_request_bool(value):
    if isinstance(value, (list, tuple)):
        value = value[0] if value else False
    if isinstance(value, bool):
        return value
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or None


def apply_legal_acceptance_fields(target, *, accept_terms, accept_privacy, legal_version, request):
    accepted_at = timezone.now()
    updated_fields = []

    if accept_terms:
        target.terms_accepted_at = accepted_at
        updated_fields.append('terms_accepted_at')

    if accept_privacy:
        target.privacy_accepted_at = accepted_at
        updated_fields.append('privacy_accepted_at')

    if accept_terms or accept_privacy:
        target.legal_version = str(legal_version or LEGAL_DOCUMENT_VERSION).strip()[:30]
        target.legal_acceptance_ip = get_client_ip(request)
        updated_fields.extend(['legal_version', 'legal_acceptance_ip'])

    return updated_fields


def enforce_legal_acceptance(*, accept_terms, accept_privacy):
    if accept_terms and accept_privacy:
        return
    raise DRFValidationError({
        'detail': 'Para continuar, confirme a leitura e aceite do contrato Alytha e da politica de LGPD.'
    })


CLIENT_OFFER_TYPE_BY_ROLE = {
    'vendedor': 'venda',
    'comprador': 'compra',
}
OFFER_TYPE_LABELS = {
    'venda': 'oferta de venda',
    'compra': 'demanda de compra',
}
CLIENT_PROFILE_DASHBOARD_COPY = {
    'vendedor': {
        'tickerLabel': 'Ofertas publicas',
        'focusTitle': 'Radar de vendedores',
        'focusDescription': 'Ofertas de venda publicas do perfil vendedor para acompanhar sua propria categoria.',
        'marketTitle': 'Ultimas ofertas de venda cadastradas',
        'marketDescription': 'Ofertas de venda recentes do marketplace publico, sem misturar demandas de comprador.',
        'marketEmptyTitle': 'Sem ofertas de venda recentes por aqui.',
        'marketEmptyDescription': 'Nenhuma oferta publica do perfil vendedor foi encontrada neste momento.',
    },
    'comprador': {
        'tickerLabel': 'Demandas publicas',
        'focusTitle': 'Radar de compradores',
        'focusDescription': 'Demandas de compra publicas do perfil comprador para acompanhar sua propria categoria.',
        'marketTitle': 'Ultimas demandas de compra cadastradas',
        'marketDescription': 'Demandas de compra recentes do marketplace publico, sem misturar ofertas de vendedor.',
        'marketEmptyTitle': 'Sem demandas de compra recentes por aqui.',
        'marketEmptyDescription': 'Nenhuma demanda publica do perfil comprador foi encontrada neste momento.',
    },
}
PENDING_VALIDATION_ROLES = {'vendedor', 'comprador', 'corretor'}
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
                'description': 'Cadastros enviados sem intermediação da mesa.',
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
                'description': 'Cadastros enviados sem intermediação da mesa.',
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

        market_user = get_market_user_for_auth_user(request.user)
        if not market_user:
            return False

        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return market_user.type in ('backoffice', 'corretor')

        return market_user.type == 'backoffice'


class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None


def get_market_user(request):
    if not request.user or not request.user.is_authenticated:
        return None
    return get_market_user_for_auth_user(request.user)


def normalize_identity(value):
    return str(value or '').strip().lower()


def build_identity_query(*values):
    query = Q()
    for value in values:
        normalized_value = normalize_identity(value)
        if normalized_value:
            query |= Q(email__iexact=normalized_value)
    return query


def get_market_user_for_auth_user(auth_user):
    if not auth_user or not getattr(auth_user, 'is_authenticated', False):
        return None

    query = build_identity_query(
        getattr(auth_user, 'email', ''),
        getattr(auth_user, 'username', ''),
    )
    if not query:
        return None

    return User.objects.filter(query).first()


def get_auth_user_by_identity(identity):
    normalized_identity = normalize_identity(identity)
    if not normalized_identity:
        return None

    return AuthUser.objects.filter(Q(username__iexact=normalized_identity) | Q(email__iexact=normalized_identity)).first()


def get_or_create_auth_user(*, email: str, name: str):
    email = normalize_identity(email)
    auth_user = AuthUser.objects.filter(Q(username__iexact=email) | Q(email__iexact=email)).first()
    created = False

    if not auth_user:
        auth_user = AuthUser.objects.create_user(
            username=email,
            email=email,
            first_name=name,
        )
        created = True

    if not created:
        updated_fields = []
        if auth_user.username != email:
            auth_user.username = email
            updated_fields.append('username')
        if auth_user.email != email:
            auth_user.email = email
            updated_fields.append('email')
        if name and auth_user.first_name != name:
            auth_user.first_name = name
            updated_fields.append('first_name')
        if updated_fields:
            auth_user.save(update_fields=updated_fields)

    return auth_user


def sync_auth_user_for_market_user(*, market_user: User, previous_email: str | None = None, password: str | None = None):
    reference_email = normalize_identity(previous_email or market_user.email)
    market_email = normalize_identity(market_user.email)
    auth_user = AuthUser.objects.filter(Q(username__iexact=reference_email) | Q(email__iexact=reference_email)).first()
    if not auth_user:
        auth_user = AuthUser.objects.filter(Q(username__iexact=market_email) | Q(email__iexact=market_email)).first()

    if not auth_user:
        auth_user = get_or_create_auth_user(email=market_email, name=market_user.name)
    else:
        updated_fields = []
        if auth_user.username != market_email:
            auth_user.username = market_email
            updated_fields.append('username')
        if auth_user.email != market_email:
            auth_user.email = market_email
            updated_fields.append('email')
        if market_user.name and auth_user.first_name != market_user.name:
            auth_user.first_name = market_user.name
            updated_fields.append('first_name')
        if updated_fields:
            auth_user.save(update_fields=updated_fields)

    normalized_password = str(password or '').strip()
    if normalized_password:
        auth_user.set_password(normalized_password)
        auth_user.save(update_fields=['password'])

    return auth_user


def requires_backoffice_validation(role: str | None) -> bool:
    return bool(role in PENDING_VALIDATION_ROLES)


def user_is_pending_validation(user: User | None) -> bool:
    return bool(user and requires_backoffice_validation(user.type) and not user.is_validated)


def validate_offer_type_for_profile(*, target_user: User, offer_type: str):
    allowed_offer_type = CLIENT_OFFER_TYPE_BY_ROLE.get(target_user.type)
    if allowed_offer_type and offer_type != allowed_offer_type:
        role_label = ROLE_LABELS.get(target_user.type, target_user.type)
        expected_label = OFFER_TYPE_LABELS.get(allowed_offer_type, allowed_offer_type)
        raise PermissionDenied(f'Perfil {role_label} so pode cadastrar {expected_label}.')


def expire_active_password_reset_tokens(user: User):
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True, expires_at__gt=timezone.now()).update(used_at=timezone.now())


def build_password_reset_path(token: str):
    return f'/redefinir-senha/{token}'


def build_password_reset_response_payload(reset_token: PasswordResetToken | None = None):
    payload = {'detail': 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.'}
    if reset_token is not None and getattr(settings, 'ALYTHA_EXPOSE_PASSWORD_RESET_TOKEN', False):
        payload['resetPath'] = build_password_reset_path(str(reset_token.token))
        payload['token'] = str(reset_token.token)
    return payload


def build_password_reset_url(token: str):
    base_url = getattr(settings, 'ALYTHA_PUBLIC_SITE_URL', '').rstrip('/')
    path = build_password_reset_path(token)
    return f'{base_url}{path}' if base_url else path


def send_password_reset_email(market_user: User, reset_token: PasswordResetToken):
    reset_url = build_password_reset_url(str(reset_token.token))
    subject = 'Redefinicao de senha | Alytha'
    message = (
        f'Ola, {market_user.name or "cliente"}.\n\n'
        'Recebemos uma solicitacao para redefinir a senha da sua conta Alytha.\n'
        f'Acesse o link abaixo em ate 1 hora:\n\n{reset_url}\n\n'
        'Se voce nao solicitou essa alteracao, ignore esta mensagem.'
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [market_user.email],
        fail_silently=False,
    )


def is_half_step_commission(value: Decimal) -> bool:
    half_steps = value * Decimal('2')
    return half_steps == half_steps.to_integral_value()


def validate_desk_commission(value: Decimal | None) -> Decimal:
    if value is None:
        return DESK_COMMISSION_MIN

    commission = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if commission < DESK_COMMISSION_MIN or commission > DESK_COMMISSION_MAX or not is_half_step_commission(commission):
        raise DRFValidationError({'detail': 'Selecione uma comissão da mesa entre R$ 0,50 e R$ 5,00 em passos de R$ 0,50.'})
    return commission


def validate_match_per_sack_commission(value: Decimal | None) -> Decimal:
    if value is None:
        return MATCH_DESK_COMMISSION_MIN

    commission = Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if commission < MATCH_DESK_COMMISSION_MIN or commission > DESK_COMMISSION_MAX or not is_half_step_commission(commission):
        raise DRFValidationError({'detail': 'Selecione uma comissão do match entre R$ 1,00 e R$ 5,00 em passos de R$ 0,50.'})
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
            f'Valor: R$ {formatted_amount} | Referência: {reference}'
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


def get_public_marketplace_queryset(request=None):
    queryset = (
        Offer.objects.select_related('user', 'exclusive_broker')
        .filter(status='ativa', exclusive_broker__isnull=True)
        .order_by('-created_at')
    )

    market_user = get_market_user(request) if request else None
    user_role = getattr(market_user, 'type', None)
    if market_user and not getattr(request.user, 'is_staff', False) and user_role != 'backoffice':
        if user_role not in CLIENT_OFFER_TYPE_BY_ROLE:
            return queryset.none()

    return queryset


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
    visible_queryset = queryset if queryset is not None else get_public_marketplace_queryset()
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


def format_decimal_pt_br(value, decimal_places=2, trim_integer=False):
    decimal_value = Decimal(value).quantize(Decimal(10) ** -decimal_places, rounding=ROUND_HALF_UP)
    if trim_integer and decimal_value == decimal_value.to_integral_value():
        return f'{int(decimal_value):,}'.replace(',', '.')

    formatted = f'{decimal_value:,.{decimal_places}f}'
    return formatted.replace(',', '_').replace('.', ',').replace('_', '.')


def format_currency_pt_br(value):
    return f'R$ {format_decimal_pt_br(value)}'


def format_quantity_pt_br(value, unit):
    return f'{format_decimal_pt_br(value, trim_integer=True)} {unit}'


def build_public_site_url(request, path):
    normalized_path = path if path.startswith('/') else f'/{path}'
    base_url = getattr(settings, 'ALYTHA_PUBLIC_SITE_URL', '')
    if base_url:
        return f'{base_url}{normalized_path}'
    return request.build_absolute_uri(normalized_path)


def build_share_image_url(request):
    configured_url = getattr(settings, 'ALYTHA_SHARE_IMAGE_URL', '')
    if configured_url:
        return configured_url
    return build_public_site_url(request, '/logo.png')


def build_offer_share_metadata(request, offer):
    offer_type_label = 'Oferta de venda' if offer.offer_type == 'venda' else 'Demanda de compra'
    title = f'{offer_type_label} de {offer.grain} | Alytha'
    description = (
        f'{offer_type_label} em {offer.location}: '
        f'{format_quantity_pt_br(offer.quantity, offer.unit)}, '
        f'{format_currency_pt_br(offer.price)}, safra {offer.crop}, frete {offer.shipping}.'
    )
    frontend_url = build_public_site_url(request, f'/oportunidades/{offer.id}')
    share_url = request.build_absolute_uri(request.path)
    image_url = build_share_image_url(request)
    return {
        'title': title,
        'description': description,
        'frontend_url': frontend_url,
        'share_url': share_url,
        'image_url': image_url,
    }


def render_offer_share_html(metadata):
    title = escape(metadata['title'])
    description = escape(metadata['description'])
    frontend_url = escape(metadata['frontend_url'])
    share_url = escape(metadata['share_url'])
    image_url = escape(metadata['image_url'])
    redirect_target = json.dumps(metadata['frontend_url'])

    return f"""<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
    <meta name="description" content="{description}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="Alytha">
    <meta property="og:type" content="article">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="{share_url}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:image:alt" content="{title}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image_url}">
    <link rel="canonical" href="{frontend_url}">
    <meta http-equiv="refresh" content="0; url={frontend_url}">
  </head>
  <body>
    <p>Redirecionando para <a href="{frontend_url}">{title}</a>.</p>
    <script>window.location.replace({redirect_target});</script>
  </body>
</html>"""


def build_client_dashboard_payload(market_user: User):
    config = CLIENT_DASHBOARD_CONFIG.get(market_user.type)
    if not config:
        raise PermissionDenied('Painel disponível apenas para comprador e vendedor.')

    primary_offer_type = CLIENT_OFFER_TYPE_BY_ROLE[market_user.type]
    dashboard_copy = CLIENT_PROFILE_DASHBOARD_COPY[market_user.type]
    own_queryset = (
        Offer.objects.select_related('user', 'exclusive_broker')
        .filter(user=market_user, offer_type=primary_offer_type)
        .order_by('-created_at')
    )
    public_queryset = get_public_marketplace_queryset()
    profile_public_queryset = public_queryset.filter(offer_type=primary_offer_type)
    public_stats = build_public_marketplace_stats(profile_public_queryset)
    market_offer_type = primary_offer_type

    total_offers = own_queryset.count()
    active_offers = own_queryset.filter(status='ativa').count()
    direct_offers = own_queryset.filter(negotiation_channel='direta').count()
    desk_offers = own_queryset.filter(negotiation_channel='mesa').count()
    pending_pix_offers = own_queryset.filter(status='aguardando_pagamento').count()
    primary_offers = own_queryset.filter(offer_type=primary_offer_type).count()
    secondary_offers = 0
    market_total = public_stats['buyOffers'] if market_offer_type == 'compra' else public_stats['sellOffers']

    own_latest = list(own_queryset[:6])
    market_latest = list(profile_public_queryset[:6])
    profile_market_indicator_id = 'sellOffers' if market_offer_type == 'venda' else 'buyOffers'

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
                f"{dashboard_copy['tickerLabel']}: {market_total}",
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
            'focusTitle': dashboard_copy['focusTitle'],
            'focusDescription': dashboard_copy['focusDescription'],
            'profileValue': ROLE_LABELS.get(market_user.type, market_user.type),
            'companyValue': market_user.company or 'Não informada',
            'marketIndicators': [
                {
                    **item,
                    'value': public_stats['locations'] if item['id'] == 'locations' else public_stats[item['id']],
                }
                for item in config['account']['marketIndicators']
                if item['id'] in (profile_market_indicator_id, 'locations')
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
            ],
            'items': OfferSerializer(own_latest, many=True).data,
        },
        'marketSection': {
            'eyebrow': config['market']['eyebrow'],
            'title': dashboard_copy['marketTitle'],
            'description': dashboard_copy['marketDescription'],
            'emptyTitle': dashboard_copy['marketEmptyTitle'],
            'emptyDescription': dashboard_copy['marketEmptyDescription'],
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
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated, BrokerReadOnlyOrBackoffice]

    def get_queryset(self):
        queryset = User.objects.all().order_by('id')
        market_user = get_market_user(self.request)
        user_role = getattr(market_user, 'type', None)

        if getattr(self.request.user, 'is_staff', False) or user_role == 'backoffice':
            return queryset
        if self.request.method in ('GET', 'HEAD', 'OPTIONS') and user_role == 'corretor':
            return queryset.only('id', 'name', 'email', 'type', 'is_validated', 'phone', 'company')
        return User.objects.none()

    def get_serializer_class(self):
        market_user = get_market_user(self.request)
        if self.request.method in ('GET', 'HEAD', 'OPTIONS') and getattr(market_user, 'type', None) == 'corretor':
            return BrokerUserSummarySerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.pop('password', None)
        if 'email' in data:
            data['email'] = normalize_identity(data.get('email'))

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        password = str(request.data.get('password') or '').strip() or AuthUser.objects.make_random_password()

        try:
            with transaction.atomic():
                user = serializer.save()
                sync_auth_user_for_market_user(market_user=user, password=password)
        except IntegrityError:
            return Response({'detail': 'e-mail já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(user).data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        previous_email = instance.email
        data = request.data.copy()
        data.pop('password', None)
        if 'email' in data:
            data['email'] = normalize_identity(data.get('email'))

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        password = str(request.data.get('password') or '').strip()

        try:
            with transaction.atomic():
                user = serializer.save()
                sync_auth_user_for_market_user(
                    market_user=user,
                    previous_email=previous_email,
                    password=password or None,
                )
        except IntegrityError:
            return Response({'detail': 'e-mail já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(self.get_serializer(user).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        auth_user = get_auth_user_by_identity(instance.email)

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            if auth_user:
                auth_user.delete()

        return response


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuário não localizado.')
        return Response(ProfileSerializer(market_user).data)

    def patch(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuário não localizado.')

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
    authentication_classes = [OptionalJWTAuthentication]

    def get(self, request):
        return Response(build_public_marketplace_payload(get_public_marketplace_queryset(request)))


class PublicMarketplaceOfferListView(APIView):
    permission_classes = []
    authentication_classes = [OptionalJWTAuthentication]

    @staticmethod
    def _parse_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def get(self, request):
        queryset = get_public_marketplace_queryset(request)

        grain = str(request.query_params.get('grain') or '').strip()
        if grain:
            queryset = queryset.filter(grain__iexact=grain)

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
    authentication_classes = [OptionalJWTAuthentication]

    def get(self, request, offer_id):
        offer = get_object_or_404(get_public_marketplace_queryset(request), id=offer_id)
        return Response(PublicMarketplaceOfferDetailSerializer(offer, context={'request': request}).data)


class PublicMarketplaceOfferShareView(APIView):
    permission_classes = []
    authentication_classes = []

    def get(self, request, offer_id):
        offer = get_object_or_404(get_public_marketplace_queryset(), id=offer_id)
        metadata = build_offer_share_metadata(request, offer)
        return HttpResponse(render_offer_share_html(metadata), content_type='text/html; charset=utf-8')


class ClientDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuário não localizado.')
        if market_user.type not in ('vendedor', 'comprador'):
            raise PermissionDenied('Painel disponível apenas para comprador e vendedor.')
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
        elif user_role in CLIENT_OFFER_TYPE_BY_ROLE:
            visible = queryset.filter(user=market_user, offer_type=CLIENT_OFFER_TYPE_BY_ROLE[user_role])
        else:
            visible = queryset.filter(user=market_user)

        if self.request.query_params.get('all') == 'true':
            return visible
        return visible.filter(status='ativa')

    def create(self, request, *args, **kwargs):
        market_user = get_market_user(request)
        if not market_user:
            raise PermissionDenied('Usuário não localizado.')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        requested_user = validated_data.pop('user', None)
        user_role = getattr(market_user, 'type', None)

        if request.user.is_staff or user_role in ('backoffice', 'corretor'):
            target_user = requested_user or market_user
        else:
            target_user = market_user

        validate_offer_type_for_profile(target_user=target_user, offer_type=validated_data['offer_type'])

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
            raise PermissionDenied('Sem permissão para remover esta oferta.')
        return super().destroy(request, *args, **kwargs)


class PublicBrokerOfferCreateView(APIView):
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'public_broker_offer'

    def post(self, request, token):
        broker = get_object_or_404(User, broker_link_token=token, type='corretor')
        serializer = BrokerLinkOfferSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        email = normalize_identity(validated_data.pop('email'))
        name = validated_data.pop('name')
        phone = validated_data.pop('phone', '')
        company = validated_data.pop('company', '')
        accept_terms = validated_data.pop('accept_terms', False)
        accept_privacy = validated_data.pop('accept_privacy', False)
        legal_version = validated_data.pop('legal_version', LEGAL_DOCUMENT_VERSION)
        enforce_legal_acceptance(accept_terms=accept_terms, accept_privacy=accept_privacy)
        target_type = 'comprador' if validated_data['offer_type'] == 'compra' else 'vendedor'

        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user and existing_user.type != target_type:
            return Response(
                {'detail': 'Este e-mail já está vinculado a um perfil diferente na Alytha.'},
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
            updated_fields.extend(
                apply_legal_acceptance_fields(
                    target_user,
                    accept_terms=accept_terms,
                    accept_privacy=accept_privacy,
                    legal_version=legal_version,
                    request=request,
                ),
            )
            if updated_fields:
                target_user.save(update_fields=list(dict.fromkeys(updated_fields)))
        else:
            target_user = User.objects.create(
                name=name,
                email=email,
                type=target_type,
                phone=phone,
                company=company,
            )
            legal_updated_fields = apply_legal_acceptance_fields(
                target_user,
                accept_terms=accept_terms,
                accept_privacy=accept_privacy,
                legal_version=legal_version,
                request=request,
            )
            if legal_updated_fields:
                target_user.save(update_fields=legal_updated_fields)

        get_or_create_auth_user(email=email, name=target_user.name)

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
            raise PermissionDenied('Usuário não localizado.')

        open_negotiations = Negotiation.objects.filter(broker=market_user, status='pendente').count()
        if open_negotiations >= MAX_OPEN_NEGOTIATIONS:
            return Response(
                {'detail': 'Somente pode ter 6 negociações em aberto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buy_offer_id = request.data.get('buyOfferId')
        sell_offer_id = request.data.get('sellOfferId')

        if not buy_offer_id or not sell_offer_id:
            return Response({'detail': 'buyOfferId e sellOfferId são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        buy_offer = get_object_or_404(Offer, pk=buy_offer_id)
        sell_offer = get_object_or_404(Offer, pk=sell_offer_id)

        if buy_offer.offer_type != 'compra' or sell_offer.offer_type != 'venda':
            return Response({'detail': 'Tipos de oferta incompatíveis para match'}, status=status.HTTP_400_BAD_REQUEST)
        if buy_offer.status != 'ativa' or sell_offer.status != 'ativa':
            return Response({'detail': 'Apenas ofertas ativas podem ser casadas'}, status=status.HTTP_400_BAD_REQUEST)
        if (buy_offer.grain or '').strip().lower() != (sell_offer.grain or '').strip().lower():
            return Response({'detail': 'Só é possível casar ofertas do mesmo grão'}, status=status.HTTP_400_BAD_REQUEST)

        if user_role == 'corretor':
            exclusive_ids = {buy_offer.exclusive_broker_id, sell_offer.exclusive_broker_id} - {None}
            if exclusive_ids and exclusive_ids != {market_user.id}:
                return Response(
                    {'detail': 'Esta oferta exclusiva está vinculada a outro corretor.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        proposed_quantity = min(buy_offer.quantity, sell_offer.quantity)
        proposed_price = sell_offer.price
        operation_total = Decimal(proposed_price) * Decimal(proposed_quantity)

        registration_commission = resolve_match_registration_commission(sell_offer, buy_offer)
        if user_role == 'corretor':
            brokerage_mode = 'per_sack'
            brokerage_percentage = None
            brokerage_value = registration_commission if registration_commission is not None else validate_match_per_sack_commission(None)
            brokerage_payer = 'seller'
            brokerage_fee = (Decimal(proposed_quantity) * brokerage_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

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

        brokerage_mode = 'per_sack' if registration_commission is not None else request.data.get('brokerageMode') or 'percentage'
        if brokerage_mode not in ('percentage', 'fixed', 'per_sack', 'spread'):
            return Response({'detail': 'brokerageMode inválido'}, status=status.HTTP_400_BAD_REQUEST)

        brokerage_percentage = None
        brokerage_value = None
        brokerage_payer = request.data.get('brokeragePayer') or 'seller'
        if brokerage_payer not in ('seller', 'buyer'):
            return Response({'detail': 'brokeragePayer inválido'}, status=status.HTTP_400_BAD_REQUEST)

        if brokerage_mode == 'percentage':
            brokerage_percentage = self._parse_decimal(request.data.get('brokeragePercentage', '1'))
            if brokerage_percentage is None:
                return Response({'detail': 'brokeragePercentage inválido'}, status=status.HTTP_400_BAD_REQUEST)
            if brokerage_percentage < Decimal('0') or brokerage_percentage > Decimal('100'):
                return Response({'detail': 'brokeragePercentage deve estar entre 0 e 100'}, status=status.HTTP_400_BAD_REQUEST)
            brokerage_percentage = brokerage_percentage.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            brokerage_fee = (operation_total * brokerage_percentage / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        elif brokerage_mode == 'spread':
            brokerage_value = (Decimal(buy_offer.price) - Decimal(sell_offer.price)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if brokerage_value <= Decimal('0'):
                return Response({'detail': 'Spread deve ser positivo para ser usado como comissão'}, status=status.HTTP_400_BAD_REQUEST)
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
                    return Response({'detail': 'brokerageValue inválido'}, status=status.HTTP_400_BAD_REQUEST)
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
            raise PermissionDenied('Sem permissão para alterar esta negociação.')

        status_value = request.data.get('status')
        if status_value:
            valid_status = {choice[0] for choice in Negotiation.STATUS_CHOICES}
            if status_value not in valid_status:
                return Response({'detail': 'Status inválido'}, status=status.HTTP_400_BAD_REQUEST)
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
            raise PermissionDenied('Sem permissão para remover esta negociação.')
        return super().destroy(request, *args, **kwargs)


class RegisterView(APIView):
    """
    Registra usuários públicos por tipo: comprador, vendedor, corretor e transportador (corretor).
    """

    ROLE_MAP = {
        'comprador': 'comprador',
        'vendedor': 'vendedor',
        'cliente': 'vendedor',
        'corretor': 'corretor',
        'transportador': 'corretor',
    }
    BLOCKED_PUBLIC_ROLE_SLUGS = {'armazenagem', 'backoffice'}

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_register'

    def post(self, request, role_slug):
        if role_slug in self.BLOCKED_PUBLIC_ROLE_SLUGS:
            return Response(
                {'detail': 'Cadastro de backoffice deve ser criado por um administrador.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        role = self.ROLE_MAP.get(role_slug)
        if not role:
            return Response({'detail': 'tipo inválido'}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        accept_terms = parse_request_bool(data.pop('accept_terms', False))
        accept_privacy = parse_request_bool(data.pop('accept_privacy', False))
        legal_version = data.pop('legal_version', LEGAL_DOCUMENT_VERSION)
        enforce_legal_acceptance(accept_terms=accept_terms, accept_privacy=accept_privacy)
        if isinstance(legal_version, (list, tuple)):
            legal_version = legal_version[0] if legal_version else LEGAL_DOCUMENT_VERSION
        data['type'] = role
        if requires_backoffice_validation(role):
            data['is_validated'] = False
        password = data.get('password') or AuthUser.objects.make_random_password()
        email = normalize_identity(data.get('email'))
        data['email'] = email
        name = data.get('name') or data.get('username') or ''
        if not email:
            return Response({'detail': 'e-mail obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    legal_updated_fields = apply_legal_acceptance_fields(
                        user,
                        accept_terms=accept_terms,
                        accept_privacy=accept_privacy,
                        legal_version=legal_version,
                        request=request,
                    )
                    if legal_updated_fields:
                        user.save(update_fields=legal_updated_fields)
                    auth_user = get_or_create_auth_user(email=email, name=name)
                    auth_user.set_password(password)
                    auth_user.save(update_fields=['password'])
            except IntegrityError:
                return Response({'detail': 'e-mail já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({**UserSerializer(user).data, 'token_info': 'use /api/login para obter JWT'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordRequestView(APIView):
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = normalize_identity(serializer.validated_data['email'])
        market_user = User.objects.filter(email__iexact=email).first()
        reset_token = None

        if market_user:
            expire_active_password_reset_tokens(market_user)
            reset_token = PasswordResetToken.objects.create(
                user=market_user,
                expires_at=timezone.now() + PASSWORD_RESET_TOKEN_TTL,
            )
            try:
                send_password_reset_email(market_user, reset_token)
            except Exception:
                logger.exception('Falha ao enviar e-mail de redefinicao de senha para usuario %s.', market_user.id)
                reset_token.delete()
                if getattr(settings, 'DEBUG', False):
                    raise
                reset_token = None

        return Response(build_password_reset_response_payload(reset_token), status=status.HTTP_200_OK)


class ForgotPasswordConfirmView(APIView):
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_confirm'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        reset_token = PasswordResetToken.objects.filter(token=token).select_related('user').first()

        if not reset_token or not reset_token.is_active:
            return Response({'detail': 'O link para redefinir senha expirou ou é inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        auth_user = get_auth_user_by_identity(reset_token.user.email)
        if not auth_user:
            return Response({'detail': 'Conta não localizada para redefinir a senha.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, auth_user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        auth_user.set_password(new_password)
        auth_user.save(update_fields=['password'])

        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=['used_at'])
        expire_active_password_reset_tokens(reset_token.user)

        return Response({'detail': 'Senha redefinida com sucesso.'}, status=status.HTTP_200_OK)


class LoginView(APIView):
    """
    Login com JWT (email + senha)
    """

    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        email = normalize_identity(request.data.get('email'))
        password = request.data.get('password')
        if not email or not password:
            return Response({'detail': 'e-mail e senha obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        auth_user = authenticate(username=email, password=password)
        if not auth_user:
            auth_candidate = get_auth_user_by_identity(email)
            if auth_candidate:
                auth_user = authenticate(username=auth_candidate.get_username(), password=password)
        if not auth_user:
            return Response({'detail': 'credenciais inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
        market_user = get_market_user_for_auth_user(auth_user) or User.objects.filter(email__iexact=email).first()
        if not market_user:
            return Response({'detail': 'Usuário não localizado.'}, status=status.HTTP_403_FORBIDDEN)
        if user_is_pending_validation(market_user):
            return Response(
                {'detail': 'Seu cadastro ainda aguarda validacao do backoffice antes do primeiro login.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(auth_user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(market_user).data,
            }
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {'detail': 'current_password e new_password são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        if not user.check_password(current_password):
            return Response(
                {'detail': 'Senha atual inválida.'},
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
