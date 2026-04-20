from rest_framework.routers import SimpleRouter

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    BrokerLinkView,
    ChangePasswordView,
    ClientDashboardView,
    LoginView,
    NegotiationViewSet,
    OfferViewSet,
    ProfileView,
    PublicBrokerLinkView,
    PublicBrokerOfferCreateView,
    PublicMarketplaceView,
    PublicMarketplaceOfferDetailView,
    PublicMarketplaceOfferListView,
    RegisterView,
    UserViewSet,
)

router = SimpleRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='user')
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'negotiations', NegotiationViewSet, basename='negotiation')

urlpatterns = router.urls + [
    path('register/<str:role_slug>', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('client-dashboard/', ClientDashboardView.as_view(), name='client_dashboard'),
    path('broker-links/me/', BrokerLinkView.as_view(), name='broker_link_me'),
    path('broker-links/<uuid:token>/', PublicBrokerLinkView.as_view(), name='broker_link_public'),
    path('broker-links/<uuid:token>/offers', PublicBrokerOfferCreateView.as_view(), name='broker_link_offer_create'),
    path('public-marketplace', PublicMarketplaceView.as_view(), name='public_marketplace'),
    path('public-marketplace/offers', PublicMarketplaceOfferListView.as_view(), name='public_marketplace_offers'),
    path('public-marketplace/offers/<int:offer_id>', PublicMarketplaceOfferDetailView.as_view(), name='public_marketplace_offer_detail'),
]
