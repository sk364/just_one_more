from django.urls import path

from .views import GamePaymentsView, PaymentSummaryView, UpdatePaymentView

urlpatterns = [
    path("games/<uuid:game_pk>/payments/", GamePaymentsView.as_view(), name="game-payments"),
    path("games/<uuid:game_pk>/payments/<uuid:user_id>/", UpdatePaymentView.as_view(), name="update-payment"),
    path("games/<uuid:game_pk>/payments/summary/", PaymentSummaryView.as_view(), name="payment-summary"),
]
