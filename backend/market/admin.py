from django.contrib import admin

from .models import Offer, User, Negotiation


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'type', 'company')
    search_fields = ('name', 'email', 'company')


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'offer_type', 'grain', 'price', 'quantity', 'status', 'user')
    list_filter = ('offer_type', 'shipping', 'status', 'grain')
    search_fields = ('grain', 'location', 'crop')


@admin.register(Negotiation)
class NegotiationAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'brokerage_mode', 'brokerage_fee', 'offer', 'buy_offer', 'buyer', 'seller', 'broker')
    list_filter = ('status', 'brokerage_mode')
