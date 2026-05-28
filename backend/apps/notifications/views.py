from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.groups.models import GroupMembership

from .models import Notification, PushSubscription
from .serializers import NotificationSerializer, PushSubscriptionSerializer, SendNotificationSerializer
from .tasks import (
    send_cancellation_notification,
    send_custom_notification,
    send_game_reminder,
    send_game_starting_soon,
    send_payment_reminder,
)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related("game")


class MarkNotificationReadView(APIView):
    def patch(self, request, pk):
        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)


class MarkAllReadView(APIView):
    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})


class UnreadCountView(APIView):
    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})


class PushSubscribeView(APIView):
    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Push subscription saved."}, status=status.HTTP_201_CREATED)


class PushUnsubscribeView(APIView):
    def delete(self, request):
        endpoint = request.data.get("endpoint")
        if endpoint:
            PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SendPushView(APIView):
    def post(self, request):
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        game_id = str(serializer.validated_data["game_id"])
        notification_type = serializer.validated_data["notification_type"]
        game = get_object_or_404(Game, pk=game_id, group__memberships__user=request.user)

        if not GroupMembership.objects.filter(group=game.group, user=request.user, role=GroupMembership.ROLE_ADMIN).exists():
            return Response({"detail": "Only group admins can send notifications."}, status=status.HTTP_403_FORBIDDEN)

        task_map = {
            "cancellation": send_cancellation_notification,
            "payment_reminder": send_payment_reminder,
            "game_starting_soon": send_game_starting_soon,
            "reminder": send_game_reminder,
        }

        if notification_type == "custom":
            title = serializer.validated_data.get("title", "Message from organiser")
            body = serializer.validated_data.get("body", "")
            send_custom_notification.delay(game_id, title, body, str(request.user.id))
        elif notification_type in task_map:
            task_map[notification_type].delay(game_id)
        else:
            return Response({"detail": "Unknown notification type."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": f"Notification of type '{notification_type}' queued."})
