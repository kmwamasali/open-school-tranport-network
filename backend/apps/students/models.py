import uuid

from django.db import models

from apps.guardians.models import Guardian
from apps.identity.models import User
from apps.organizations.models import School


class StudentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    ACTIVE = "ACTIVE", "Active"
    SUSPENDED = "SUSPENDED", "Suspended"
    ARCHIVED = "ARCHIVED", "Archived"


class GuardianRelationshipStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    VERIFIED = "VERIFIED", "Verified"
    SUSPENDED = "SUSPENDED", "Suspended"
    REVOKED = "REVOKED", "Revoked"


class RelationshipType(models.TextChoices):
    PARENT = "PARENT", "Parent"
    GUARDIAN = "GUARDIAN", "Guardian"
    AUTHORIZED_PICKUP = "AUTHORIZED_PICKUP", "Authorized pickup"
    EMERGENCY_CONTACT = "EMERGENCY_CONTACT", "Emergency contact"


class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        School,
        on_delete=models.PROTECT,
        related_name="students",
        null=True,
        blank=True,
    )
    pseudonymous_identifier = models.CharField(max_length=32, unique=True)
    display_name_encrypted = models.BinaryField(null=True, blank=True)
    status = models.CharField(
        max_length=32,
        choices=StudentStatus.choices,
        default=StudentStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["pseudonymous_identifier"]),
            models.Index(fields=["school", "status"]),
        ]

    def __str__(self) -> str:
        return self.pseudonymous_identifier


class GuardianRelationship(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guardian = models.ForeignKey(
        Guardian,
        on_delete=models.PROTECT,
        related_name="student_relationships",
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.PROTECT,
        related_name="guardian_relationships",
    )
    relationship_type = models.CharField(
        max_length=32,
        choices=RelationshipType.choices,
    )
    status = models.CharField(
        max_length=32,
        choices=GuardianRelationshipStatus.choices,
        default=GuardianRelationshipStatus.PENDING,
    )
    verified_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="guardian_relationships_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["guardian", "student", "relationship_type"],
                name="unique_guardian_student_relationship_type",
            )
        ]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["guardian", "status"]),
        ]
