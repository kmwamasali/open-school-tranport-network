from django.http import JsonResponse
from django.urls import path


def health(_request):
    return JsonResponse({"status": "ok", "module": "identity"})


urlpatterns = [
    path("health", health, name="identity-health"),
]
