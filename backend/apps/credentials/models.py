import uuid

from django.db import models

from apps.identity.models import User


class CredentialStatus(models.TextChoices):
    ISSUED = "ISSUED", "Issued"
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    REVOKED = "REVOKED", "Revoked"
    EXPIRED = "EXPIRED", "Expired"


class CredentialType(models.TextChoices):
    DRIVER_ACTIVE = "DRIVER_ACTIVE", "Driver active"
    SCHOOL_STAFF_ACTIVE = "SCHOOL_STAFF_ACTIVE", "School staff active"
    GUARDIAN_AUTHORIZED = "GUARDIAN_AUTHORIZED", "Guardian authorized"
    PICKUP_AUTHORIZED = "PICKUP_AUTHORIZED", "Pickup authorized"
    DROPOFF_AUTHORIZED = "DROPOFF_AUTHORIZED", "Drop-off authorized"


class Credential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    credential_type = models.CharField(
        max_length=64,
        choices=CredentialType.choices,
    )
    subject_type = models.CharField(max_length=64)
    subject_id = models.UUIDField()
    status = models.CharField(
        max_length=32,
        choices=CredentialStatus.choices,
        default=CredentialStatus.ISSUED,
    )
    issued_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="credentials_issued",
    )
    issued_at = models.DateTimeField()
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["credential_type", "subject_type", "subject_id"]),
            models.Index(fields=["status"]),
            models.Index(fields=["expires_at"]),
        ]

    def is_current(self, now) -> bool:
        if self.status != CredentialStatus.ACTIVE:
            return False
        if self.revoked_at:
            return False
        return self.expires_at is None or now < self.expires_at
