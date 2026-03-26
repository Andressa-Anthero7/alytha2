from rest_framework.routers import SimpleRouter

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import OfferViewSet, UserViewSet, NegotiationViewSet, RegisterView, LoginView

router = SimpleRouter(trailing_slash=False)
router.register(r'users', UserViewSet, basename='user')
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'negotiations', NegotiationViewSet, basename='negotiation')

urlpatterns = router.urls + [
    path('register/<str:role_slug>', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
]
