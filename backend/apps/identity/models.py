import uuid

from django.db import models
from django.core.exceptions import ValidationError


class VerificationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    SUSPENDED = "SUSPENDED", "Suspended"
    REVOKED = "REVOKED", "Revoked"


class UserRole(models.TextChoices):
    GUARDIAN = "GUARDIAN", "Guardian"
    DRIVER = "DRIVER", "Driver"
    SCHOOL_STAFF = "SCHOOL_STAFF", "School staff"
    VERIFICATION_OFFICER = "VERIFICATION_OFFICER", "Verification officer"
    SAFETY_OFFICER = "SAFETY_OFFICER", "Safety officer"
    ADMIN = "ADMIN", "Admin"


class VerificationSubjectType(models.TextChoices):
    IDENTITY = "IDENTITY", "Identity"
    GUARDIAN = "GUARDIAN", "Guardian"
    DRIVER = "DRIVER", "Driver"
    VEHICLE = "VEHICLE", "Vehicle"
    SCHOOL = "SCHOOL", "School"
    STUDENT_RELATIONSHIP = "STUDENT_RELATIONSHIP", "Student relationship"


class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_hash = models.CharField(max_length=128, unique=True)
    email_hash = models.CharField(max_length=128, blank=True)
    primary_role = models.CharField(max_length=32, choices=UserRole.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["primary_role"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.primary_role}:{self.id}"


class IdentityRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.PROTECT,
        related_name="identity_record",
    )
    verification_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    legal_name_encrypted = models.BinaryField(null=True, blank=True)
    date_of_birth_encrypted = models.BinaryField(null=True, blank=True)
    identity_document_reference = models.CharField(max_length=512, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["verification_status"]),
        ]


class VerificationCase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject_type = models.CharField(
        max_length=64,
        choices=VerificationSubjectType.choices,
    )
    subject_id = models.UUIDField()
    status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    evidence_reference = models.CharField(max_length=512, blank=True)
    opened_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="verification_cases_opened",
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="verification_cases_reviewed",
    )
    decision_reason = models.TextField(blank=True)
    decision_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["subject_type", "subject_id"]),
            models.Index(fields=["status"]),
        ]

    def clean(self) -> None:
        if self.reviewed_by_id and self.opened_by_id == self.reviewed_by_id:
            raise ValidationError("A verification case cannot be approved by its submitter.")
        if self.status == VerificationStatus.APPROVED:
            if not self.reviewed_by_id:
                raise ValidationError("An approved verification case requires an independent reviewer.")
            if not self.decision_at:
                raise ValidationError("An approved verification case requires a decision timestamp.")
