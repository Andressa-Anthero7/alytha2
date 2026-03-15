from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    USER_TYPES = (
        ('COMPRADOR', 'Comprador'),
        ('VENDEDOR', 'Vendedor'),
        ('CORRETOR', 'Corretor/Intermediário'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    phone = models.CharField(max_length=20)
    company_name = models.CharField(max_length=200, blank=True)
    cnpj_cpf = models.CharField(max_length=20, unique=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)

class GrainType(models.Model):
    name = models.CharField(max_length=50) # Soja, Milho, Sorgo
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Offer(models.Model):
    OFFER_TYPES = (
        ('COMPRA', 'Ordem de Compra'),
        ('VENDA', 'Oferta de Venda'),
    )
    SHIPPING_TYPES = (
        ('FOB', 'FOB (Retirada)'),
        ('CIF', 'CIF (Entrega)'),
    )
    
    user = models.ForeignKey(User, on_express_delete=models.CASCADE, related_name='offers')
    grain_type = models.ForeignKey(GrainType, on_delete=models.PROTECT)
    offer_type = models.CharField(max_length=10, choices=OFFER_TYPES)
    
    quantity = models.DecimalField(max_digits=15, decimal_places=2)
    unit = models.CharField(max_length=20, default='Sacas (60kg)') # Sacas, Toneladas
    price = models.DecimalField(max_digits=12, decimal_places=2)
    
    crop_year = models.CharField(max_length=10) # Ex: 23/24
    location_city = models.CharField(max_length=100)
    location_state = models.CharField(max_length=2)
    
    shipping_type = models.CharField(max_length=3, choices=SHIPPING_TYPES)
    payment_terms = models.TextField() # Ex: 30 dias, À vista
    
    # Especificações de Qualidade
    moisture = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Umidade %")
    impurities = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Impurezas %")
    broken_grains = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Quebrados %")
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.offer_type} - {self.grain_type.name} - {self.quantity} {self.unit}"

class Negotiation(models.Model):
    STATUS = (
        ('ABERTA', 'Em Negociação'),
        ('FECHADA', 'Negócio Fechado'),
        ('CANCELADA', 'Cancelada'),
    )
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE)
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    broker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='intermediated_deals')
    
    final_price = models.DecimalField(max_digits=12, decimal_places=2)
    final_quantity = models.DecimalField(max_digits=15, decimal_places=2)
    
    brokerage_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='ABERTA')
    
    contract_file = models.FileField(upload_to='contracts/', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
