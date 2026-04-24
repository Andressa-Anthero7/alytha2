import uuid

from django.db import models
from django.utils import timezone


class User(models.Model):
    USER_TYPES = (
        ('vendedor', 'Vendedor'),
        ('comprador', 'Comprador'),
        ('corretor', 'Corretor'),
        ('backoffice', 'Backoffice'),
    )

    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    type = models.CharField(max_length=20, choices=USER_TYPES)
    phone = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=150, blank=True)
    legal_name = models.CharField(max_length=160, blank=True)
    profile_segment = models.CharField(max_length=40, blank=True)
    document_type = models.CharField(max_length=10, blank=True)
    document_number = models.CharField(max_length=30, blank=True)
    state_registration = models.CharField(max_length=30, blank=True)
    address_zip_code = models.CharField(max_length=12, blank=True)
    address_street = models.CharField(max_length=160, blank=True)
    address_number = models.CharField(max_length=20, blank=True)
    address_complement = models.CharField(max_length=120, blank=True)
    address_district = models.CharField(max_length=120, blank=True)
    address_city = models.CharField(max_length=120, blank=True)
    address_state = models.CharField(max_length=2, blank=True)
    address_country = models.CharField(max_length=60, blank=True, default='Brasil')
    document_notes = models.TextField(blank=True)
    is_validated = models.BooleanField(default=True)
    broker_link_token = models.UUIDField(unique=True, editable=False, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.broker_link_token:
            self.broker_link_token = uuid.uuid4()
        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Reset token for {self.user.email}'

    @property
    def is_active(self):
        return self.used_at is None and self.expires_at > timezone.now()


class Offer(models.Model):
    OFFER_TYPES = (
        ('venda', 'Oferta de Venda'),
        ('compra', 'Ordem de Compra'),
    )
    SHIPPING_CHOICES = (
        ('FOB', 'FOB'),
        ('CIF', 'CIF'),
    )
    STATUS_CHOICES = (
        ('ativa', 'Ativa'),
        ('finalizada', 'Finalizada'),
        ('aguardando_pagamento', 'Aguardando pagamento'),
    )
    NEGOTIATION_CHANNEL_CHOICES = (
        ('mesa', 'Operando com a mesa'),
        ('direta', 'Oferta direta'),
    )
    DIRECT_PAYMENT_STATUS_CHOICES = (
        ('free', 'Isenta'),
        ('pending', 'Aguardando pagamento'),
        ('paid', 'Pago'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers')
    exclusive_broker = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exclusive_marketplace_offers',
    )
    offer_type = models.CharField(max_length=10, choices=OFFER_TYPES)
    grain = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=15, decimal_places=2)
    unit = models.CharField(max_length=20, default='Sacas')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=120)
    crop = models.CharField(max_length=10)
    shipping = models.CharField(max_length=3, choices=SHIPPING_CHOICES)
    negotiation_channel = models.CharField(max_length=10, choices=NEGOTIATION_CHANNEL_CHOICES, default='mesa')
    mesa_commission = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    direct_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    direct_payment_status = models.CharField(max_length=12, choices=DIRECT_PAYMENT_STATUS_CHOICES, default='free')
    quality = models.JSONField(default=dict)
    payment_terms = models.CharField(max_length=120)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='ativa')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.offer_type} - {self.grain} ({self.quantity} {self.unit})"


class Negotiation(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('aceita', 'Aceita'),
        ('recusada', 'Recusada'),
    )
    BROKERAGE_MODE_CHOICES = (
        ('percentage', 'Percentual'),
        ('fixed', 'Valor fixo'),
        ('per_sack', 'Valor por saca'),
        ('spread', 'Spread'),
    )
    BROKERAGE_PAYER_CHOICES = (
        ('seller', 'Vendedor'),
        ('buyer', 'Comprador'),
    )

    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='negotiations')  # venda
    buy_offer = models.ForeignKey(Offer, on_delete=models.SET_NULL, null=True, blank=True, related_name='matched_buys')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    broker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='brokered')
    proposed_price = models.DecimalField(max_digits=12, decimal_places=2)
    proposed_quantity = models.DecimalField(max_digits=15, decimal_places=2)
    brokerage_mode = models.CharField(max_length=20, choices=BROKERAGE_MODE_CHOICES, default='percentage')
    brokerage_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    brokerage_value_per_sack = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    brokerage_payer = models.CharField(max_length=10, choices=BROKERAGE_PAYER_CHOICES, default='seller')
    brokerage_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pendente')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Negociacao {self.id} - {self.status}"
