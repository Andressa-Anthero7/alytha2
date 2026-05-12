from rest_framework import serializers

from .models import Negotiation, NegotiationMessage, Offer, User


BUYER_PROFILE_SEGMENTS = {
    'industria',
    'trading',
    'distribuidora',
    'granja',
    'exportadora',
    'cooperativa',
    'cerealista',
    'esmagadora',
    'nutricao_animal',
    'outros',
}

SELLER_PROFILE_SEGMENTS = {
    'produtor_rural',
    'fazenda',
    'silos',
    'armazens',
    'cooperativa',
    'originador',
    'revenda',
    'trading',
    'outros',
}

BROKER_PROFILE_SEGMENTS = {
    'autonomo',
    'empresa_corretora',
    'mesa_corretora',
}

DOCUMENT_TYPES = {'cpf', 'cnpj'}

ROLE_SEGMENT_MAP = {
    'comprador': BUYER_PROFILE_SEGMENTS,
    'vendedor': SELLER_PROFILE_SEGMENTS,
    'corretor': BROKER_PROFILE_SEGMENTS,
}

USER_PROFILE_FIELDS = [
    'id',
    'name',
    'email',
    'type',
    'is_validated',
    'phone',
    'company',
    'legal_name',
    'profile_segment',
    'document_type',
    'document_number',
    'state_registration',
    'address_zip_code',
    'address_street',
    'address_number',
    'address_complement',
    'address_district',
    'address_city',
    'address_state',
    'address_country',
    'document_notes',
    'terms_accepted_at',
    'privacy_accepted_at',
    'legal_version',
    'legal_acceptance_ip',
]


def mask_email(value):
    email = str(value or '').strip()
    if not email:
        return ''

    local, separator, domain = email.partition('@')
    if not separator:
        return '***'

    visible_local = local[:2]
    masked_local = visible_local + ('*' * max(len(local) - len(visible_local), 3))

    domain_name, dot, suffix = domain.partition('.')
    if not dot:
        visible_domain = domain_name[:1]
        masked_domain = visible_domain + ('*' * max(len(domain_name) - len(visible_domain), 3))
        return f'{masked_local}@{masked_domain}'

    visible_domain = domain_name[:2]
    masked_domain = visible_domain + ('*' * max(len(domain_name) - len(visible_domain), 3))
    return f'{masked_local}@{masked_domain}.{suffix}'


def mask_phone(value):
    digits = ''.join(char for char in str(value or '') if char.isdigit())
    if not digits:
        return ''
    return '(**) *****-****'


def mask_name(value):
    name = str(value or '').strip()
    if not name:
        return 'Acesso restrito'
    return 'Acesso restrito'


def document_digits(value):
    return ''.join(char for char in str(value or '') if char.isdigit())


def has_repeated_digits(value):
    return bool(value) and len(set(value)) == 1


def is_valid_cpf(value):
    digits = document_digits(value)
    if len(digits) != 11 or has_repeated_digits(digits):
        return False

    for digit_position in (9, 10):
        total = sum(int(digits[index]) * (digit_position + 1 - index) for index in range(digit_position))
        check_digit = (total * 10) % 11
        if check_digit == 10:
            check_digit = 0
        if check_digit != int(digits[digit_position]):
            return False

    return True


def is_valid_cnpj(value):
    digits = document_digits(value)
    if len(digits) != 14 or has_repeated_digits(digits):
        return False

    first_weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    second_weights = [6, *first_weights]

    first_total = sum(int(digits[index]) * first_weights[index] for index in range(12))
    first_check_digit = 11 - (first_total % 11)
    if first_check_digit >= 10:
        first_check_digit = 0
    if first_check_digit != int(digits[12]):
        return False

    second_total = sum(int(digits[index]) * second_weights[index] for index in range(13))
    second_check_digit = 11 - (second_total % 11)
    if second_check_digit >= 10:
        second_check_digit = 0

    return second_check_digit == int(digits[13])


def format_document_number(document_type, value):
    digits = document_digits(value)
    if document_type == 'cpf' and len(digits) == 11:
        return f'{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}'
    if document_type == 'cnpj' and len(digits) == 14:
        return f'{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}'
    return str(value or '').strip()


def find_duplicate_document(document_number, instance=None):
    target_digits = document_digits(document_number)
    if not target_digits:
        return None

    queryset = User.objects.exclude(document_number_digits='').only('id', 'document_number', 'document_number_digits')
    if instance:
        queryset = queryset.exclude(pk=instance.pk)

    exact_match = queryset.filter(document_number_digits=target_digits).first()
    if exact_match:
        return exact_match

    for user in queryset:
        if document_digits(user.document_number) == target_digits:
            return user

    return None


class UserSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        role = attrs.get('type') or getattr(self.instance, 'type', None)
        profile_segment = (attrs.get('profile_segment') or getattr(self.instance, 'profile_segment', '')).strip().lower()
        document_type = (attrs.get('document_type') or getattr(self.instance, 'document_type', '')).strip().lower()
        document_is_being_updated = 'document_number' in attrs or 'document_type' in attrs
        document_number = attrs.get('document_number', getattr(self.instance, 'document_number', ''))
        address_state = attrs.get('address_state')
        email = attrs.get('email')
        name = attrs.get('name')

        if role in ROLE_SEGMENT_MAP and profile_segment and profile_segment not in ROLE_SEGMENT_MAP[role]:
            raise serializers.ValidationError({'profile_segment': 'Selecione uma categoria válida para este perfil.'})

        if document_is_being_updated and document_type and document_type not in DOCUMENT_TYPES:
            raise serializers.ValidationError({'document_type': 'Selecione CPF ou CNPJ.'})

        if document_is_being_updated and document_number:
            if not document_type:
                raise serializers.ValidationError({'document_type': 'Selecione CPF ou CNPJ.'})

            digits = document_digits(document_number)
            if document_type == 'cpf' and not is_valid_cpf(digits):
                raise serializers.ValidationError({'document_number': 'CPF invalido.'})
            if document_type == 'cnpj' and not is_valid_cnpj(digits):
                raise serializers.ValidationError({'document_number': 'CNPJ invalido.'})

            if find_duplicate_document(digits, self.instance):
                raise serializers.ValidationError({'document_number': 'CPF/CNPJ ja cadastrado. Somente um cadastro e permitido por documento.'})

            attrs['document_number'] = format_document_number(document_type, digits)
        elif document_is_being_updated and 'document_number' in attrs:
            attrs['document_number'] = ''

        if email is not None:
            attrs['email'] = str(email).strip().lower()

        if name is not None:
            attrs['name'] = str(name).strip()

        if address_state is not None:
            attrs['address_state'] = str(address_state).strip().upper()

        if 'document_type' in attrs:
            attrs['document_type'] = str(attrs['document_type'] or '').strip().lower()
        if 'profile_segment' in attrs:
            attrs['profile_segment'] = str(attrs['profile_segment'] or '').strip().lower()

        return attrs

    class Meta:
        model = User
        fields = USER_PROFILE_FIELDS
        read_only_fields = ['id', 'terms_accepted_at', 'privacy_accepted_at', 'legal_version', 'legal_acceptance_ip']
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True},
            'type': {'required': True},
        }


class BrokerUserSummarySerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'type', 'is_validated', 'phone', 'company']
        read_only_fields = fields

    def get_email(self, obj):
        return mask_email(obj.email)

    def get_phone(self, obj):
        return mask_phone(obj.phone)


class ProfileSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        return UserSerializer.validate(self, attrs)

    class Meta:
        model = User
        fields = USER_PROFILE_FIELDS
        read_only_fields = [
            'id',
            'email',
            'type',
            'is_validated',
            'terms_accepted_at',
            'privacy_accepted_at',
            'legal_version',
            'legal_acceptance_ip',
        ]


class OfferSerializer(serializers.ModelSerializer):
    userId = serializers.PrimaryKeyRelatedField(source='user', queryset=User.objects.all(), required=False, allow_null=True)
    type = serializers.CharField(source='offer_type')
    paymentTerms = serializers.CharField(source='payment_terms')
    negotiationChannel = serializers.CharField(source='negotiation_channel', required=False)
    mesaCommission = serializers.DecimalField(
        source='mesa_commission',
        max_digits=4,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )
    directFee = serializers.DecimalField(source='direct_fee', max_digits=10, decimal_places=2, coerce_to_string=False, read_only=True)
    directPaymentStatus = serializers.CharField(source='direct_payment_status', read_only=True)
    exclusiveBrokerId = serializers.IntegerField(source='exclusive_broker_id', read_only=True)
    exclusiveBrokerName = serializers.CharField(source='exclusive_broker.name', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Offer
        fields = [
            'id',
            'userId',
            'type',
            'grain',
            'quantity',
            'unit',
            'price',
            'location',
            'crop',
            'shipping',
            'negotiationChannel',
            'mesaCommission',
            'directFee',
            'directPaymentStatus',
            'exclusiveBrokerId',
            'exclusiveBrokerName',
            'quality',
            'paymentTerms',
            'status',
            'createdAt',
        ]


class NegotiationSerializer(serializers.ModelSerializer):
    offerId = serializers.PrimaryKeyRelatedField(source='offer', queryset=Offer.objects.all())
    buyOfferId = serializers.PrimaryKeyRelatedField(source='buy_offer', queryset=Offer.objects.all(), allow_null=True, required=False)
    buyerId = serializers.PrimaryKeyRelatedField(source='buyer', queryset=User.objects.all())
    sellerId = serializers.PrimaryKeyRelatedField(source='seller', queryset=User.objects.all())
    brokerId = serializers.PrimaryKeyRelatedField(source='broker', queryset=User.objects.all(), allow_null=True, required=False)
    proposedPrice = serializers.DecimalField(source='proposed_price', max_digits=12, decimal_places=2, coerce_to_string=False)
    proposedQuantity = serializers.DecimalField(source='proposed_quantity', max_digits=15, decimal_places=2, coerce_to_string=False)
    brokerageMode = serializers.CharField(source='brokerage_mode')
    brokeragePercentage = serializers.DecimalField(source='brokerage_percentage', max_digits=5, decimal_places=2, coerce_to_string=False, allow_null=True, required=False)
    brokerageValue = serializers.DecimalField(source='brokerage_value_per_sack', max_digits=12, decimal_places=2, coerce_to_string=False, allow_null=True, required=False)
    brokeragePayer = serializers.CharField(source='brokerage_payer')
    brokerageFee = serializers.DecimalField(source='brokerage_fee', max_digits=12, decimal_places=2, coerce_to_string=False)
    brokerName = serializers.CharField(source='broker.name', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Negotiation
        fields = [
            'id',
            'offerId',
            'buyOfferId',
            'buyerId',
            'sellerId',
            'brokerId',
            'proposedPrice',
            'proposedQuantity',
            'brokerageMode',
            'brokeragePercentage',
            'brokerageValue',
            'brokeragePayer',
            'brokerageFee',
            'brokerName',
            'status',
            'createdAt',
        ]


class NegotiationMessageSerializer(serializers.ModelSerializer):
    negotiationId = serializers.IntegerField(source='negotiation_id', read_only=True)
    senderId = serializers.IntegerField(source='sender_id', read_only=True)
    senderName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    body = serializers.CharField(max_length=2000, trim_whitespace=True)

    class Meta:
        model = NegotiationMessage
        fields = [
            'id',
            'negotiationId',
            'audience',
            'senderId',
            'senderName',
            'body',
            'createdAt',
        ]
        read_only_fields = ['id', 'negotiationId', 'senderId', 'senderName', 'createdAt']

    def get_senderName(self, obj):
        return obj.sender.name if obj.sender else 'Alytha'

    def validate_body(self, value):
        body = str(value or '').strip()
        if not body:
            raise serializers.ValidationError('Informe a mensagem.')
        return body


class MarketplaceOfferSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='offer_type')
    negotiationChannel = serializers.CharField(source='negotiation_channel')
    mesaCommission = serializers.DecimalField(
        source='mesa_commission',
        max_digits=4,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Offer
        fields = [
            'id',
            'type',
            'grain',
            'quantity',
            'unit',
            'price',
            'location',
            'crop',
            'shipping',
            'negotiationChannel',
            'mesaCommission',
            'createdAt',
        ]


class PublicOfferContactSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()

    def can_view_channels(self):
        request = self.context.get('request')
        return bool(request and getattr(request, 'user', None) and request.user.is_authenticated)

    def get_name(self, obj):
        return obj.name if self.can_view_channels() else mask_name(obj.name)

    def get_company(self, obj):
        return obj.company if self.can_view_channels() else ''

    def get_email(self, obj):
        return obj.email if self.can_view_channels() else mask_email(obj.email)

    def get_phone(self, obj):
        return obj.phone if self.can_view_channels() else mask_phone(obj.phone)

    def get_locked(self, obj):
        return not self.can_view_channels()

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'company', 'locked']


class PublicMarketplaceOfferListSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='offer_type')
    negotiationChannel = serializers.CharField(source='negotiation_channel')
    mesaCommission = serializers.DecimalField(
        source='mesa_commission',
        max_digits=4,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )
    paymentTerms = serializers.CharField(source='payment_terms')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Offer
        fields = [
            'id',
            'type',
            'grain',
            'quantity',
            'unit',
            'price',
            'location',
            'crop',
            'shipping',
            'negotiationChannel',
            'mesaCommission',
            'paymentTerms',
            'createdAt',
        ]


class PublicMarketplaceOfferDetailSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source='offer_type')
    negotiationChannel = serializers.CharField(source='negotiation_channel')
    mesaCommission = serializers.DecimalField(
        source='mesa_commission',
        max_digits=4,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )
    directFee = serializers.DecimalField(source='direct_fee', max_digits=10, decimal_places=2, coerce_to_string=False)
    directPaymentStatus = serializers.CharField(source='direct_payment_status')
    paymentTerms = serializers.CharField(source='payment_terms')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    contact = PublicOfferContactSerializer(source='user', read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Offer
        fields = [
            'id',
            'type',
            'grain',
            'quantity',
            'unit',
            'price',
            'location',
            'crop',
            'shipping',
            'negotiationChannel',
            'mesaCommission',
            'directFee',
            'directPaymentStatus',
            'quality',
            'paymentTerms',
            'status',
            'createdAt',
            'contact',
        ]


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(min_length=8, trim_whitespace=False)


class BrokerLinkOfferSubmissionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    type = serializers.ChoiceField(choices=Offer.OFFER_TYPES, source='offer_type')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=150, required=False, allow_blank=True)
    accept_terms = serializers.BooleanField(required=False, default=False, write_only=True)
    accept_privacy = serializers.BooleanField(required=False, default=False, write_only=True)
    legal_version = serializers.CharField(max_length=30, required=False, allow_blank=True, write_only=True)
    grain = serializers.CharField(max_length=50)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=2, coerce_to_string=False)
    unit = serializers.CharField(max_length=20, required=False)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    location = serializers.CharField(max_length=120)
    crop = serializers.CharField(max_length=10)
    shipping = serializers.ChoiceField(choices=Offer.SHIPPING_CHOICES)
    negotiationChannel = serializers.ChoiceField(choices=Offer.NEGOTIATION_CHANNEL_CHOICES, source='negotiation_channel', required=False)
    mesaCommission = serializers.DecimalField(
        source='mesa_commission',
        max_digits=4,
        decimal_places=2,
        coerce_to_string=False,
        allow_null=True,
        required=False,
    )
    quality = serializers.JSONField(required=False)
    paymentTerms = serializers.CharField(source='payment_terms', max_length=120)
