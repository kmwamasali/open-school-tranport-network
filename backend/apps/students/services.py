from django.core.exceptions import PermissionDenied

from apps.guardians.models import Guardian

from .models import GuardianRelationship, GuardianRelationshipStatus, Student


def guardian_has_verified_relationship(guardian: Guardian, student: Student) -> bool:
    return GuardianRelationship.objects.filter(
        guardian=guardian,
        student=student,
        status=GuardianRelationshipStatus.VERIFIED,
    ).exists()


def students_accessible_to_guardian(guardian: Guardian):
    return Student.objects.filter(
        guardian_relationships__guardian=guardian,
        guardian_relationships__status=GuardianRelationshipStatus.VERIFIED,
    ).distinct()


def require_guardian_student_access(guardian: Guardian, student: Student) -> None:
    if not guardian_has_verified_relationship(guardian, student):
        raise PermissionDenied("A verified guardian relationship is required for child access.")
