from django.contrib import admin

from .models import Negotiation, Offer, PasswordResetToken, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'type', 'profile_segment', 'company')
    search_fields = ('name', 'email', 'company', 'legal_name', 'document_number')


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'offer_type', 'grain', 'price', 'quantity', 'status', 'user')
    list_filter = ('offer_type', 'shipping', 'status', 'grain')
    search_fields = ('grain', 'location', 'crop')


@admin.register(Negotiation)
class NegotiationAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'brokerage_mode', 'brokerage_fee', 'offer', 'buy_offer', 'buyer', 'seller', 'broker')
    list_filter = ('status', 'brokerage_mode')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'token', 'expires_at', 'used_at', 'created_at')
    search_fields = ('user__email', 'user__name', 'token')
    list_filter = ('used_at', 'created_at')
