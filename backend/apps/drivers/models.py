import uuid

from django.db import models

from apps.identity.models import User


class DriverStatus(models.TextChoices):
    APPLIED = "APPLIED", "Applied"
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    VERIFIED = "VERIFIED", "Verified"
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    REVOKED = "REVOKED", "Revoked"


class Driver(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name="driver_profile",
    )
    status = models.CharField(
        max_length=32,
        choices=DriverStatus.choices,
        default=DriverStatus.APPLIED,
    )
    licence_reference = models.CharField(max_length=128, blank=True)
    credential_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["credential_expires_at"]),
        ]

    def __str__(self) -> str:
        return f"Driver:{self.id}"
