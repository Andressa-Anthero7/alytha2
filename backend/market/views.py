from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.exceptions import PermissionDenied

from .models import Offer, User, Negotiation
from .serializers import OfferSerializer, UserSerializer, NegotiationSerializer

AuthUser = get_user_model()


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


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated, BrokerReadOnlyOrBackoffice]


class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Offer.objects.select_related('user').order_by('-created_at')
        market_user = get_market_user(self.request)
        user_role = getattr(market_user, 'type', None)
        is_privileged = self.request.user.is_staff or user_role in ('backoffice', 'corretor')
        if not is_privileged:
            qs = qs.filter(user=market_user)
        if self.request.query_params.get('all') == 'true':
            return qs
        return qs.filter(status='ativa')

    def perform_create(self, serializer):
        market_user = get_market_user(self.request)
        if not market_user:
            raise PermissionDenied("Usuário não localizado.")
        user_role = getattr(market_user, 'type', None)
        target_user = serializer.validated_data.get('user')
        if user_role in ('backoffice', 'corretor') and target_user:
            serializer.save(status='ativa')
        else:
            serializer.save(status='ativa', user=market_user)

    def destroy(self, request, *args, **kwargs):
        market_user = get_market_user(request)
        instance = self.get_object()
        user_role = getattr(market_user, 'type', None)
        is_privileged = request.user.is_staff or user_role in ('backoffice', 'corretor')
        if not is_privileged and instance.user != market_user:
            raise PermissionDenied("Sem permissão para remover esta oferta.")
        return super().destroy(request, *args, **kwargs)


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
        qs = Negotiation.objects.select_related('offer', 'buy_offer', 'buyer', 'seller', 'broker').order_by('-created_at')
        market_user = get_market_user(self.request)
        user_role = getattr(market_user, 'type', None)
        is_privileged = self.request.user.is_staff or user_role in ('backoffice', 'corretor')
        if is_privileged:
            return qs
        return qs.filter(
            Q(buyer=market_user) | Q(seller=market_user) | Q(broker=market_user)
        )

    @action(detail=False, methods=['post'], url_path='match')
    def match(self, request):
        market_user = get_market_user(request)
        user_role = getattr(market_user, 'type', None)
        if not (request.user.is_staff or user_role in ('backoffice', 'corretor')):
            raise PermissionDenied("Apenas corretores ou backoffice podem casar ofertas.")
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

        proposed_quantity = min(buy_offer.quantity, sell_offer.quantity)
        proposed_price = sell_offer.price
        operation_total = Decimal(proposed_price) * Decimal(proposed_quantity)

        brokerage_mode = request.data.get('brokerageMode') or 'percentage'
        if brokerage_mode not in ('percentage', 'fixed', 'per_sack'):
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
        else:
            brokerage_value = self._parse_decimal(request.data.get('brokerageValue'))
            if brokerage_value is None:
                brokerage_value = self._parse_decimal(request.data.get('brokerageValuePerSack', '1'))
            if brokerage_value is None:
                return Response({'detail': 'brokerageValue invalido'}, status=status.HTTP_400_BAD_REQUEST)
            brokerage_value = brokerage_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            if brokerage_mode == 'per_sack':
                if brokerage_value < Decimal('0.50'):
                    return Response({'detail': 'brokerageValue deve ser maior ou igual a 0.50'}, status=status.HTTP_400_BAD_REQUEST)
                if brokerage_value > Decimal('5.00'):
                    return Response({'detail': 'brokerageValue deve ser menor ou igual a 5.00'}, status=status.HTTP_400_BAD_REQUEST)
                half_steps = brokerage_value * Decimal('2')
                if half_steps != half_steps.to_integral_value():
                    return Response({'detail': 'brokerageValue deve variar em passos de 0.50'}, status=status.HTTP_400_BAD_REQUEST)
                brokerage_fee = (Decimal(proposed_quantity) * brokerage_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            else:
                if brokerage_value < Decimal('0'):
                    return Response({'detail': 'brokerageValue deve ser maior ou igual a 0'}, status=status.HTTP_400_BAD_REQUEST)
                brokerage_fee = brokerage_value

        broker = market_user if user_role == 'corretor' else User.objects.filter(type='corretor').first()

        negotiation = Negotiation.objects.create(
            offer=sell_offer,
            buy_offer=buy_offer,
            buyer=buy_offer.user,
            seller=sell_offer.user,
            broker=broker,
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
        is_privileged = request.user.is_staff or user_role in ('backoffice', 'corretor')
        if not is_privileged and market_user not in [instance.buyer, instance.seller, instance.broker]:
            raise PermissionDenied("Sem permissão para alterar esta negociação.")
        status_value = request.data.get('status')
        if status_value:
            valid_status = {choice[0] for choice in Negotiation.STATUS_CHOICES}
            if status_value not in valid_status:
                return Response({'detail': 'Status invalido'}, status=status.HTTP_400_BAD_REQUEST)
            instance.status = status_value
            instance.save()
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
        is_privileged = request.user.is_staff or user_role in ('backoffice', 'corretor')
        if not is_privileged and market_user not in [instance.buyer, instance.seller, instance.broker]:
            raise PermissionDenied("Sem permissão para remover esta negociação.")
        return super().destroy(request, *args, **kwargs)


class RegisterView(APIView):
    """
    Registra usuários por tipo: comprador, vendedor, corretor, transportador (corretor), armazenagem (backoffice).
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
            return Response({'detail': 'email obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                auth_user, _ = AuthUser.objects.get_or_create(username=email, defaults={'email': email, 'first_name': name})
                auth_user.set_password(password)
                auth_user.save()
            except IntegrityError:
                return Response({'detail': 'email já cadastrado'}, status=status.HTTP_400_BAD_REQUEST)
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
            return Response({'detail': 'email e senha obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
        auth_user = authenticate(username=email, password=password)
        if not auth_user:
            return Response({'detail': 'credenciais inválidas'}, status=status.HTTP_401_UNAUTHORIZED)
        market_user = User.objects.filter(email=email).first()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(auth_user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(market_user).data if market_user else None
        })
