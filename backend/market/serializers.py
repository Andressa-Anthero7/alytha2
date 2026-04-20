from rest_framework import serializers

from .models import Offer, User, Negotiation


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'type', 'phone', 'company']
        extra_kwargs = {
            'email': {'required': True},
            'name': {'required': True},
            'type': {'required': True},
        }


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'type', 'phone', 'company']
        read_only_fields = ['id', 'email', 'type']


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
    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'company']


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


class BrokerLinkOfferSubmissionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    type = serializers.ChoiceField(choices=Offer.OFFER_TYPES, source='offer_type')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    company = serializers.CharField(max_length=150, required=False, allow_blank=True)
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
