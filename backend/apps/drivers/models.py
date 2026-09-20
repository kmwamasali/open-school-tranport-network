import uuid

from django.core.exceptions import ValidationError
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

    def activation_requirements_met(self) -> bool:
        if not self.pk:
            return False

        from apps.identity.models import (
            IdentityRecord,
            VerificationCase,
            VerificationStatus,
            VerificationSubjectType,
        )

        identity_approved = IdentityRecord.objects.filter(
            user=self.user,
            verification_status=VerificationStatus.APPROVED,
        ).exists()
        independent_case_approved = (
            VerificationCase.objects.filter(
                subject_type=VerificationSubjectType.DRIVER,
                subject_id=self.id,
                status=VerificationStatus.APPROVED,
                reviewed_by__isnull=False,
                decision_at__isnull=False,
            )
            .exclude(reviewed_by=models.F("opened_by"))
            .exists()
        )
        vehicle_approved = self.vehicles.filter(
            status=VerificationStatus.APPROVED,
            insurance_status=VerificationStatus.APPROVED,
            inspection_status=VerificationStatus.APPROVED,
        ).exists()

        return identity_approved and independent_case_approved and vehicle_approved

    def clean(self) -> None:
        if self.status == DriverStatus.ACTIVE and not self.activation_requirements_met():
            raise ValidationError(
                {
                    "status": (
                        "A driver cannot become ACTIVE until identity, independent review, "
                        "vehicle, insurance, and inspection checks are approved."
                    )
                }
            )
