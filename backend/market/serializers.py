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


class OfferSerializer(serializers.ModelSerializer):
    userId = serializers.PrimaryKeyRelatedField(source='user', queryset=User.objects.all())
    type = serializers.CharField(source='offer_type')
    paymentTerms = serializers.CharField(source='payment_terms')
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
            'status',
            'createdAt',
        ]
