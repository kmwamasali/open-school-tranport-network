import uuid

from django.db import models

from apps.identity.models import User, VerificationStatus


class School(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    registration_reference = models.CharField(max_length=128, unique=True)
    contact_email_hash = models.CharField(max_length=128, blank=True)
    contact_phone_hash = models.CharField(max_length=128, blank=True)
    verification_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="schools_created",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["verification_status"]),
            models.Index(fields=["registration_reference"]),
        ]

    def __str__(self) -> str:
        return self.name
