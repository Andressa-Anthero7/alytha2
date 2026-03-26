from django.db import models


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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Offer(models.Model):
    OFFER_TYPES = (
        ('venda', 'Oferta de Venda'),
        ('compra', 'Ordem de Compra'),
    )
    SHIPPING_CHOICES = (
        ('FOB', 'FOB'),
        ('CIF', 'CIF'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers')
    offer_type = models.CharField(max_length=10, choices=OFFER_TYPES)
    grain = models.CharField(max_length=50)
    quantity = models.DecimalField(max_digits=15, decimal_places=2)
    unit = models.CharField(max_length=20, default='Sacas')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=120)
    crop = models.CharField(max_length=10)
    shipping = models.CharField(max_length=3, choices=SHIPPING_CHOICES)
    quality = models.JSONField(default=dict)
    payment_terms = models.CharField(max_length=120)
    status = models.CharField(max_length=12, default='ativa')
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
