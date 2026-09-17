import uuid

from django.db import models

from apps.drivers.models import Driver
from apps.identity.models import VerificationStatus


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(
        Driver,
        on_delete=models.PROTECT,
        related_name="vehicles",
    )
    registration_reference = models.CharField(max_length=128, unique=True)
    capacity = models.PositiveSmallIntegerField()
    inspection_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    insurance_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["driver", "status"]),
            models.Index(fields=["registration_reference"]),
        ]

    def __str__(self) -> str:
        return self.registration_reference
