# MaMa John's Open School Transport Network
## Implementation Starter Kit v0.1

**Purpose:** Give an engineering team a concrete starting point for implementing the first secure, privacy-preserving school-transport vertical slice.

**Initial implementation target:**

> Guardian registration → school approval → child registration → driver verification → transport assignment → trip creation → pickup authorization → pickup → live trip → school arrival → authorized handoff → completion → audit trail.

---

# 1. Repository

Use a modular monolith initially.

```text
schoolsafe/
├── README.md
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── docker-compose.yml
├── Makefile
├── .env.example
│
├── backend/
│   ├── manage.py
│   ├── pyproject.toml
│   │
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   └── apps/
│       ├── identity/
│       ├── organizations/
│       ├── guardians/
│       ├── students/
│       ├── drivers/
│       ├── vehicles/
│       ├── routes/
│       ├── transport/
│       ├── credentials/
│       ├── safety/
│       ├── incidents/
│       ├── notifications/
│       └── audit/
│
├── mobile/
│   └── driver_app/
│
├── web/
│   ├── guardian/
│   ├── school_admin/
│   └── operations/
│
├── packages/
│   ├── api-client/
│   ├── domain-types/
│   └── protocol/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── migrations/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── privacy/
│   ├── api/
│   └── operations/
│
└── tests/
    ├── unit/
    ├── integration/
    ├── security/
    └── e2e/
```

The backend should remain one deployable application until operational scale gives a clear reason to split components.

---

# 2. Technology baseline

## Backend

```text
Python
Django
Django REST Framework
PostgreSQL
PostGIS
Redis
Celery
S3-compatible object storage
```

## Driver application

```text
Flutter
SQLite/local encrypted storage
HTTPS API
background location service
push notifications
```

## Web applications

```text
React
Next.js
TypeScript
```

## Infrastructure

```text
Docker
GitHub Actions
Nginx
PostgreSQL backups
S3-compatible object storage
Prometheus/Grafana-compatible monitoring
structured application logs
```

The architecture should keep external providers replaceable.

For example:

```text
MapProvider
NotificationProvider
StorageProvider
IdentityVerificationProvider
PaymentProvider
```

should be interfaces rather than hard-coded vendor dependencies.

---

# 3. Environment configuration

Example:

```text
APP_ENV=development
DEBUG=false

DATABASE_URL=postgres://...
REDIS_URL=redis://...

SECRET_KEY=...

OBJECT_STORAGE_ENDPOINT=...
OBJECT_STORAGE_BUCKET=...

JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...

SMS_PROVIDER=...
SMS_API_KEY=...

MAP_PROVIDER=...
MAP_API_KEY=...

LOCATION_RETENTION_DAYS=30
AUDIT_RETENTION_DAYS=365
```

Secrets must never be committed to Git.

Production secrets should come from a dedicated secret-management mechanism rather than `.env` files.

---

# 4. Django application boundaries

Each domain owns its models, services and business rules.

For example:

```text
drivers/
    models.py
    serializers.py
    permissions.py
    services.py
    selectors.py
    urls.py
    tests/

transport/
    models.py
    serializers.py
    permissions.py
    services.py
    state_machine.py
    urls.py
    tests/
```

Avoid putting business logic directly into views.

Prefer:

```python
TripService.start_trip(...)
TripService.pick_up_child(...)
TripService.complete_trip(...)
```

over:

```python
TripViewSet.start_trip()
```

containing hundreds of lines of business logic.

---

# 5. Core domain model

The minimum production entities are:

```text
User
IdentityRecord

School
SchoolStaff

Guardian
Student
GuardianRelationship

Driver
Vehicle

Route
PickupPoint
TransportPlan

Trip
TripParticipant
TripEvent
LocationEvent

Credential

VerificationCase
Incident

Notification
AuditEvent
```

---

# 6. Identity architecture

Do not create one giant user profile containing every piece of personal information.

Separate:

```text
Authentication
      ↓
User
      ↓
IdentityRecord
      ↓
Role-specific profile
```

Example:

```python
class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    phone_hash = models.CharField(max_length=128, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

Sensitive identity data should be isolated.

```python
class IdentityRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(User, on_delete=models.PROTECT)

    verification_status = models.CharField(
        max_length=32,
        choices=VerificationStatus.choices
    )

    legal_name_encrypted = models.BinaryField(null=True)
    date_of_birth_encrypted = models.BinaryField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
```

Do not use raw identity documents as ordinary application data.

---

# 7. Student privacy model

A student should receive a pseudonymous identifier.

Example:

```text
STU-7K4P9X
```

The identifier must not contain:

```text
name
school
class
date of birth
guardian phone number
location
```

Do not expose sequential IDs such as:

```text
student/123
student/124
student/125
```

Use UUIDs internally and opaque identifiers externally.

---

# 8. Guardian relationship

The critical authorization object is not merely the guardian's account.

It is the relationship:

```text
Guardian
    ↓
GuardianRelationship
    ↓
Student
```

Example:

```python
class GuardianRelationship(models.Model):
    guardian = models.ForeignKey(
        Guardian,
        on_delete=models.PROTECT
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.PROTECT
    )

    relationship_type = models.CharField(max_length=32)

    status = models.CharField(max_length=32)

    verified_at = models.DateTimeField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
```

Possible statuses:

```text
PENDING
VERIFIED
SUSPENDED
REVOKED
```

Every child-related authorization check must verify this relationship.

---

# 9. Driver verification

Driver onboarding should produce a verification case.

```text
Driver applies
      ↓
Identity verification
      ↓
Licence verification
      ↓
Vehicle association
      ↓
Insurance/inspection verification
      ↓
Safeguarding requirements
      ↓
Verification officer
      ↓
Independent reviewer
      ↓
ACTIVE
```

Driver status:

```text
APPLIED
UNDER_REVIEW
VERIFIED
ACTIVE
SUSPENDED
REVOKED
```

A driver cannot become `ACTIVE` merely because a document was uploaded.

---

# 10. Verification case

```python
class VerificationCase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    subject_type = models.CharField(max_length=64)
    subject_id = models.UUIDField()

    status = models.CharField(max_length=32)

    opened_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="verification_cases_opened"
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        related_name="verification_cases_reviewed"
    )

    decision_at = models.DateTimeField(null=True)

    created_at = models.DateTimeField(auto_now_add=True)
```

High-risk approvals should support separation of duties.

A user who submitted the verification should not be able to approve their own submission.

---

# 11. Credential architecture

Credentials represent permissions rather than identities.

Example:

```text
DRIVER_ACTIVE
SCHOOL_STAFF_ACTIVE
GUARDIAN_AUTHORIZED
PICKUP_AUTHORIZED
DROPOFF_AUTHORIZED
```

Credential:

```python
class Credential(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    credential_type = models.CharField(max_length=64)

    subject_type = models.CharField(max_length=64)
    subject_id = models.UUIDField()

    issued_at = models.DateTimeField()
    expires_at = models.DateTimeField(null=True)
    revoked_at = models.DateTimeField(null=True)

    status = models.CharField(max_length=32)

    issuer_id = models.UUIDField()
```

A credential is valid only when:

```text
issued
AND active
AND current time < expiry
AND not revoked
AND correct purpose
AND correct subject
```

---

# 12. Trip state machine

The trip state machine is a central security boundary.

```text
SCHEDULED
    ↓
DRIVER_ASSIGNED
    ↓
DRIVER_APPROACHING
    ↓
PICKUP_READY
    ↓
CHILD_PICKED_UP
    ↓
IN_TRANSIT
    ↓
ARRIVING
    ↓
CHILD_DROPPED_OFF
    ↓
COMPLETED
```

Exceptional states:

```text
CANCELLED
NO_SHOW
DRIVER_REPLACED
ROUTE_DEVIATION
INCIDENT
EMERGENCY
```

---

# 13. State-machine implementation

Do not allow arbitrary state updates.

Bad:

```http
PATCH /trips/123

{
    "status": "COMPLETED"
}
```

Instead:

```http
POST /trips/{id}/actions/start
POST /trips/{id}/actions/pickup-ready
POST /trips/{id}/actions/pickup
POST /trips/{id}/actions/start-transit
POST /trips/{id}/actions/arriving
POST /trips/{id}/actions/dropoff
POST /trips/{id}/actions/complete
```

Each action validates:

```text
current state
actor
role
trip assignment
credential
time constraints
required evidence
authorization
```

---

# 14. Example state-machine service

```python
class InvalidTripTransition(Exception):
    pass


ALLOWED_TRANSITIONS = {
    "SCHEDULED": {"DRIVER_ASSIGNED", "CANCELLED"},
    "DRIVER_ASSIGNED": {
        "DRIVER_APPROACHING",
        "DRIVER_REPLACED",
        "CANCELLED",
    },
    "DRIVER_APPROACHING": {
        "PICKUP_READY",
        "ROUTE_DEVIATION",
        "INCIDENT",
        "EMERGENCY",
    },
    "PICKUP_READY": {
        "CHILD_PICKED_UP",
        "NO_SHOW",
        "INCIDENT",
        "EMERGENCY",
    },
    "CHILD_PICKED_UP": {
        "IN_TRANSIT",
        "INCIDENT",
        "EMERGENCY",
    },
    "IN_TRANSIT": {
        "ARRIVING",
        "ROUTE_DEVIATION",
        "INCIDENT",
        "EMERGENCY",
    },
    "ARRIVING": {
        "CHILD_DROPPED_OFF",
        "INCIDENT",
        "EMERGENCY",
    },
    "CHILD_DROPPED_OFF": {
        "COMPLETED",
        "INCIDENT",
    },
}
```

Transitions should be recorded as immutable events.

---

# 15. Trip events

```python
class TripEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    trip = models.ForeignKey(
        Trip,
        on_delete=models.PROTECT
    )

    event_type = models.CharField(max_length=64)

    actor_id = models.UUIDField()

    occurred_at = models.DateTimeField()

    device_event_id = models.CharField(
        max_length=128,
        unique=True
    )

    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
```

The `device_event_id` provides idempotency for offline mobile events.

---

# 16. Offline-first driver architecture

The driver application cannot assume continuous internet connectivity.

Driver device:

```text
                ┌──────────────┐
                │ Driver App   │
                └──────┬───────┘
                       │
                 Local encrypted DB
                       │
                Event queue
                       │
                 Internet available?
                    /       \
                  NO         YES
                  │           │
               queue       upload
                              │
                           server
```

Every event gets:

```text
device_event_id
device_timestamp
server_timestamp
event_type
trip_id
payload
```

Server processing:

```text
if device_event_id already exists:
    return previous result

else:
    validate event
    process transition
    persist event
```

This prevents duplicate pickup or completion events when the driver taps twice or retries synchronization.

---

# 17. Pickup authorization protocol

Do not use a permanent QR code for a child.

Instead:

```text
Trip
  ↓
Generate random pickup token
  ↓
Hash token server-side
  ↓
Bind token to:
    trip
    child
    purpose
    expiry
    expected pickup location
  ↓
Present token
  ↓
Server validates
  ↓
Single-use consumption
  ↓
Record audit event
```

Token properties:

```text
cryptographically random
short-lived
single-use
trip-bound
child-bound
purpose-bound
non-sequential
non-guessable
```

The QR itself should contain only the random credential/token.

Never encode:

```text
child name
guardian name
phone number
school
home address
```

inside the QR.

---

# 18. Pickup protocol

Example:

```text
1. Driver arrives at authorized pickup zone.
2. Driver marks PICKUP_READY.
3. Guardian/authorized handoff person presents temporary credential.
4. Driver scans credential.
5. Server validates credential.
6. Server confirms:
      correct trip
      correct child
      correct time window
      correct driver
      credential active
7. Credential is consumed.
8. CHILD_PICKED_UP event is recorded.
9. Guardian receives confirmation.
```

For higher-risk situations, require a second factor such as a short PIN.

---

# 19. Drop-off protocol

Drop-off should be equally explicit.

Possible flow:

```text
Driver arrives at school/home destination
        ↓
ARRIVING
        ↓
Authorized recipient identified
        ↓
Temporary handoff credential validated
        ↓
Child handed over
        ↓
CHILD_DROPPED_OFF
        ↓
Recipient confirmation
        ↓
COMPLETED
```

A trip should not automatically become `COMPLETED` merely because GPS says the vehicle reached a destination.

---

# 20. Location architecture

Location events:

```python
class LocationEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    trip = models.ForeignKey(
        Trip,
        on_delete=models.PROTECT
    )

    recorded_at = models.DateTimeField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    accuracy_m = models.FloatField(null=True)

    source = models.CharField(max_length=32)
```

Use PostGIS for spatial operations.

Location collection should be purpose-limited.

Example policy:

```text
Normal transit:
    periodic updates

Pickup/drop-off:
    higher-frequency updates

Emergency:
    highest permitted operational frequency

Completed trip:
    stop live tracking
```

Do not retain detailed location histories indefinitely.

---

# 21. Route deviation

A route deviation should not immediately be treated as misconduct.

Pipeline:

```text
GPS
 ↓
route corridor comparison
 ↓
deviation detected
 ↓
driver prompt
 ↓
driver explains / confirms
 ↓
temporary deviation OR escalation
```

Possible explanations:

```text
road closure
traffic
police direction
emergency
school instruction
authorized alternate route
```

Persistent unexplained deviation can trigger an operational review.

---

# 22. API design

Base URL:

```text
/api/v1/
```

Authentication:

```http
Authorization: Bearer <access-token>
```

## Authentication

```text
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
```

## Guardians

```text
GET    /guardians/me
GET    /guardians/me/students
POST   /guardians/me/students
GET    /guardians/me/relationships
```

## Schools

```text
GET    /schools/{school_id}
POST   /schools/{school_id}/guardian-verifications
GET    /schools/{school_id}/students
GET    /schools/{school_id}/trips
```

## Drivers

```text
POST   /drivers/apply
GET    /drivers/me
GET    /drivers/me/verification
POST   /drivers/me/documents
```

## Vehicles

```text
POST   /vehicles
GET    /vehicles/{id}
POST   /vehicles/{id}/documents
```

## Routes

```text
POST   /routes
GET    /routes/{id}
POST   /routes/{id}/pickup-points
```

## Transport

```text
POST   /transport-plans
GET    /transport-plans/{id}
POST   /transport-plans/{id}/assign-driver
POST   /transport-plans/{id}/assign-vehicle
```

## Trips

```text
POST   /trips
GET    /trips/{id}
POST   /trips/{id}/actions/start
POST   /trips/{id}/actions/pickup-ready
POST   /trips/{id}/actions/pickup
POST   /trips/{id}/actions/start-transit
POST   /trips/{id}/actions/arriving
POST   /trips/{id}/actions/dropoff
POST   /trips/{id}/actions/complete
POST   /trips/{id}/actions/emergency
```

## Location

```text
POST /trips/{id}/locations
POST /trips/{id}/locations/batch
```

## Incidents

```text
POST /incidents
GET  /incidents/{id}
POST /incidents/{id}/actions/assign
POST /incidents/{id}/actions/resolve
```

---

# 23. Permission matrix

| Operation | Guardian | Driver | School | Verification | Safety | Admin |
|---|---:|---:|---:|---:|---:|---:|
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add child | ✓ | — | — | — | — | — |
| View own child | ✓ | Limited | Authorized | — | Authorized | Authorized |
| Apply as driver | — | ✓ | — | — | — | — |
| Verify driver | — | — | — | ✓ | — | ✓ |
| Assign driver | — | — | Authorized | — | — | ✓ |
| Start assigned trip | — | ✓ | — | — | — | — |
| Pickup child | — | ✓ | — | — | — | — |
| View live trip | Authorized | Own trip | Authorized | — | Authorized | Authorized |
| Declare emergency | — | ✓ | ✓ | — | ✓ | ✓ |
| Investigate incident | — | — | Limited | — | ✓ | ✓ |
| Suspend driver | — | — | — | ✓* | ✓* | ✓ |

`*` subject to separation-of-duties policy.

---

# 24. Object-level authorization

Role checks are not enough.

This is unsafe:

```python
if request.user.role == "GUARDIAN":
    return Student.objects.all()
```

Instead:

```python
Student.objects.filter(
    guardian_relationships__guardian=request.user.guardian,
    guardian_relationships__status="VERIFIED"
)
```

Authorization must consider:

```text
WHO
+
WHAT
+
WHICH OBJECT
+
WHICH RELATIONSHIP
+
WHICH CONTEXT
```

---

# 25. Anti-enumeration controls

Do not expose whether an arbitrary identifier exists.

Avoid:

```http
GET /students/STU-123456
```

for public clients.

Use scoped access.

For example:

```http
GET /guardians/me/students
```

A guardian should only receive children linked to that guardian.

API responses should also avoid leaking whether an untrusted identifier corresponds to:

```text
student
driver
guardian
school
trip
credential
```

---

# 26. Audit architecture

Security-sensitive actions generate audit events.

Examples:

```text
DRIVER_VERIFIED
DRIVER_SUSPENDED
GUARDIAN_APPROVED
CHILD_ADDED
TRIP_CREATED
DRIVER_ASSIGNED
PICKUP_CREDENTIAL_ISSUED
PICKUP_CREDENTIAL_CONSUMED
CHILD_PICKED_UP
CHILD_DROPPED_OFF
INCIDENT_CREATED
INCIDENT_VIEWED
LOCATION_ACCESS_GRANTED
LOCATION_ACCESS_REVOKED
ADMIN_PERMISSION_CHANGED
```

Audit events should contain:

```text
actor
action
object
timestamp
request ID
device/session information where appropriate
result
```

Sensitive audit records should be append-only from the application's normal interface.

---

# 27. Security logging

Do not log:

```text
passwords
OTP values
identity documents
access tokens
pickup tokens
full child profiles
unnecessary GPS coordinates
```

Instead:

```text
pickup credential issued: credential_id=...
trip: ...
actor: ...
result: success
```

---

# 28. API security baseline

Every endpoint must consider:

```text
authentication
authorization
input validation
rate limiting
CSRF where applicable
object-level authorization
replay protection
idempotency
audit logging
```

High-risk endpoints should have stronger controls.

Examples:

```text
driver approval
driver suspension removal
guardian relationship override
emergency operations
credential issuance
incident closure
```

---

# 29. Rate limiting

Apply rate limits to:

```text
OTP requests
OTP verification
login attempts
credential validation
student lookup
driver lookup
incident submission
location ingestion
admin actions
```

The exact limits should be load-tested rather than guessed permanently.

---

# 30. Database constraints

Important invariants should exist at database level where practical.

Examples:

```text
one active driver assignment per trip
one active vehicle assignment per trip
unique device_event_id
unique credential token hash
unique guardian/student active relationship
```

Do not rely exclusively on application code for critical uniqueness constraints.

---

# 31. Concurrency protection

Trip transitions should use transactional locking.

Conceptually:

```python
with transaction.atomic():
    trip = (
        Trip.objects
        .select_for_update()
        .get(id=trip_id)
    )

    validate_transition(trip, requested_state)

    trip.status = requested_state
    trip.save()

    TripEvent.objects.create(...)
```

This prevents two devices from simultaneously performing conflicting transitions.

---

# 32. Emergency mode

Emergency activation creates a high-priority event.

```text
EMERGENCY_DECLARED
```

Record:

```text
trip
driver
vehicle
timestamp
last known location
current trip state
reason/category
available connectivity status
actions taken
notifications sent
```

Emergency notifications should be asynchronous but durable.

If internet connectivity is lost:

```text
store event locally
retry transmission
```

The application should make it obvious whether the emergency was successfully transmitted or is still queued.

---

# 33. Incident management

Incident categories:

```text
ACCIDENT
MEDICAL
DRIVER_BEHAVIOR
CHILD_SAFETY
HARASSMENT
MISSING_PICKUP
UNAUTHORIZED_PERSON
VEHICLE_FAILURE
ROUTE_DEVIATION
OTHER
```

Severity:

```text
LOW
MODERATE
HIGH
CRITICAL
```

Lifecycle:

```text
OPEN
ACKNOWLEDGED
INVESTIGATING
ACTION_REQUIRED
RESOLVED
CLOSED
```

An incident should preserve an evidence chain.

---

# 34. Notifications

Notifications should be event-driven.

```text
Trip created
    ↓
notification service
    ├── guardian
    ├── driver
    └── school
```

Examples:

```text
Driver assigned
Driver approaching
Child picked up
Vehicle delayed
School arrival
Child dropped off
Emergency
Incident update
```

Do not put unnecessary personal information into SMS/push notifications.

---

# 35. Driver app minimum screens

```text
Login
Verification status
Today's trips
Trip details
Navigation
Pickup checklist
Pickup credential scanner
Passenger checklist
Start trip
Live trip
Arriving
Drop-off verification
Emergency
Incident report
Trip history
Profile
```

The driver should not need access to a child's unnecessary personal information.

---

# 36. Guardian app minimum screens

```text
Sign up
Identity verification
My children
Add child
School authorization
Transport plan
Today's trip
Driver verification status
Trip tracking
Pickup/drop-off confirmation
Emergency
Notifications
Privacy settings
```

Display:

```text
Verified driver
Vehicle verified
Trip status
Estimated arrival
```

rather than exposing sensitive verification documents.

---

# 37. School dashboard

```text
Students
Guardians
Transport plans
Today's trips
Drivers
Vehicles
Pickup/drop-off events
Incidents
Verification requests
Emergency events
Audit history
```

School staff should see only students associated with that school and only the information necessary for their role.

---

# 38. Operations dashboard

The operations team handles:

```text
driver verification
vehicle verification
route management
trip monitoring
incident response
emergency response
credential revocation
suspensions
audit review
```

Separate permissions for:

```text
verification
safety
system administration
```

rather than giving everyone unrestricted admin access.

---

# 39. First API vertical slice

Implement these endpoints first:

```text
POST /auth/request-otp
POST /auth/verify-otp

POST /schools
POST /guardians/me/students

POST /drivers/apply
POST /drivers/{id}/verification/approve

POST /vehicles

POST /transport-plans
POST /transport-plans/{id}/assign-driver

POST /trips
POST /trips/{id}/actions/start

POST /trips/{id}/actions/pickup-ready
POST /trips/{id}/actions/pickup

POST /trips/{id}/locations/batch

POST /trips/{id}/actions/arriving
POST /trips/{id}/actions/dropoff
POST /trips/{id}/actions/complete

GET /trips/{id}
GET /trips/{id}/events
```

This is enough to demonstrate the core system.

---

# 40. First database migration

The first migration should establish:

```text
users
identity_records
schools
school_staff
guardians
students
guardian_relationships
drivers
vehicles
routes
pickup_points
transport_plans
trips
trip_events
location_events
credentials
verification_cases
incidents
audit_events
```

Avoid premature database fragmentation.

---

# 41. Test strategy

The project should have four testing layers.

## Unit

Test:

```text
state transitions
credential validity
authorization rules
route calculations
token expiry
incident state
```

## Integration

Test:

```text
API → database
API → Redis
credential issuance → validation
trip → location events
offline synchronization
notifications
```

## Security

Explicitly test:

```text
IDOR
broken object authorization
credential replay
token guessing
OTP brute force
privilege escalation
admin abuse
cross-school data access
cross-student data access
expired credentials
revoked credentials
duplicate events
```

## End-to-end

Simulate:

```text
guardian
school
driver
student
trip
pickup
transit
dropoff
```

---

# 42. Critical security test

Every release should include a test equivalent to:

```text
Guardian A
    ↓
attempts to access
    ↓
Student belonging to Guardian B
```

Expected result:

```text
403 Forbidden
```

or an appropriately non-disclosing response.

Likewise:

```text
Driver A
    ↓
attempts to access
    ↓
Driver B's documents
```

must fail.

And:

```text
School A
    ↓
attempts to access
    ↓
School B's students
```

must fail.

---

# 43. Property-style security invariants

The following should always hold:

```text
A guardian cannot authorize a child they are not authorized to represent.

A driver cannot start a trip they are not assigned to.

A driver cannot pick up a child outside an authorized trip.

An expired pickup credential cannot be used.

A consumed pickup credential cannot be reused.

A revoked driver credential cannot authorize a trip.

A completed trip cannot silently return to IN_TRANSIT.

An ordinary user cannot access another user's private location history.

An administrator action must be attributable to an authenticated actor.
```

These are more important than visual polish in the first release.

---

# 44. GitHub implementation backlog

## EPIC 1 — Foundation

```text
#1 Create repository
#2 Configure Python/Django
#3 Configure PostgreSQL/PostGIS
#4 Configure Redis
#5 Docker development environment
#6 CI pipeline
#7 Code formatting/linting
#8 Dependency security scanning
```

## EPIC 2 — Identity

```text
#9 User model
#10 OTP authentication
#11 Session/token management
#12 Identity record
#13 Identity verification workflow
#14 Role model
#15 Permission framework
```

## EPIC 3 — Guardian/student

```text
#16 Guardian profile
#17 Student pseudonymous identity
#18 Guardian relationship
#19 School authorization
#20 Child access-control tests
```

## EPIC 4 — Driver

```text
#21 Driver profile
#22 Driver application
#23 Document submission
#24 Verification case
#25 Reviewer workflow
#26 Driver activation
#27 Driver suspension
```

## EPIC 5 — Vehicles

```text
#28 Vehicle model
#29 Vehicle verification
#30 Driver-vehicle assignment
#31 Vehicle expiry monitoring
```

## EPIC 6 — Transport

```text
#32 Route model
#33 Pickup points
#34 Transport plans
#35 Driver assignment
#36 Vehicle assignment
#37 Trip creation
```

## EPIC 7 — Trip engine

```text
#38 Trip state machine
#39 Trip events
#40 Idempotency
#41 Concurrency controls
#42 Pickup authorization
#43 Drop-off authorization
#44 Trip completion
```

## EPIC 8 — Mobile

```text
#45 Flutter project
#46 Secure local storage
#47 Offline event queue
#48 Background location
#49 Trip UI
#50 QR scanner
#51 Emergency UI
```

## EPIC 9 — Safety

```text
#52 Geofencing
#53 Route deviation
#54 Emergency events
#55 Incident management
#56 Safety notifications
```

## EPIC 10 — Audit/security

```text
#57 Audit event framework
#58 Admin access logging
#59 Security event logging
#60 Rate limiting
#61 IDOR test suite
#62 Credential replay tests
#63 Privilege escalation tests
```

## EPIC 11 — Guardian/school web

```text
#64 Guardian dashboard
#65 School dashboard
#66 Trip tracking
#67 Child management
#68 Verification workflow UI
```

## EPIC 12 — Operations

```text
#69 Operations dashboard
#70 Driver verification
#71 Vehicle verification
#72 Incident investigation
#73 Emergency monitoring
#74 Audit viewer
```

## EPIC 13 — Deployment

```text
#75 Production Docker configuration
#76 Database backups
#77 Monitoring
#78 Alerting
#79 Disaster recovery procedure
#80 Production security review
```

---

# 45. Definition of Done

A feature is not complete when its API works.

It is complete when:

```text
[ ] Domain logic implemented
[ ] API implemented
[ ] Authorization implemented
[ ] Object-level access tested
[ ] Audit events implemented
[ ] Error handling implemented
[ ] Idempotency considered
[ ] Concurrency considered
[ ] Offline behavior considered where applicable
[ ] Unit tests written
[ ] Integration tests written
[ ] Security tests written where applicable
[ ] Documentation updated
[ ] Database migration reviewed
[ ] Logging reviewed for sensitive-data leakage
```

---

# 46. Initial MVP acceptance scenario

A complete automated test should eventually execute this scenario:

```text
1. Create school.

2. Create guardian account.

3. Create student.

4. Establish guardian/student relationship.

5. School verifies relationship.

6. Create driver.

7. Driver submits verification information.

8. Verification officer approves driver.

9. Create verified vehicle.

10. Create transport plan.

11. Assign driver.

12. Create today's trip.

13. Driver starts trip.

14. Driver reaches pickup area.

15. System issues temporary pickup credential.

16. Authorized person presents credential.

17. Server validates credential.

18. Child is marked picked up.

19. Driver submits location events.

20. Vehicle approaches school.

21. Authorized recipient is verified.

22. Child is marked dropped off.

23. Trip is completed.

24. Guardian receives confirmation.

25. Audit log contains the complete lifecycle.

26. Attempted credential replay fails.

27. Unauthorized user cannot access the child's information.

28. Unauthorized user cannot access detailed trip location.
```

That scenario is the project's first meaningful milestone.

---

# 47. What not to build yet

Explicitly defer:

```text
Blockchain
Cryptocurrency
Facial recognition
AI driver scoring
Public driver ratings
Dynamic pricing
Complex surge pricing
Autonomous dispatch
Microservices
Zero-knowledge identity proofs
Biometric child identification
Advertising
Large-scale marketplace matching
```

These features add complexity before the core trust model has been validated.

---

# 48. Protocol layer

Once the MVP works, extract the interoperable concepts into a protocol.

The protocol should define:

```text
Identity reference
Credential
Authorization
Trip
Trip participant
Trip event
Pickup authorization
Drop-off authorization
Location event
Incident
Revocation
Audit event
```

Example conceptual event:

```json
{
  "event_type": "child.picked_up",
  "event_id": "uuid",
  "trip_id": "uuid",
  "subject": "opaque-student-id",
  "occurred_at": "timestamp",
  "credential_reference": "opaque-reference"
}
```

No unnecessary personally identifying information should be required by the protocol.

This eventually allows:

```text
SchoolSafe Mobile App
        │
        ├── School A app
        ├── School B app
        ├── Transport Operator
        └── Government/NGO deployment
```

to interoperate without requiring everyone to use the same user interface.

---

# 49. Open-source governance

The repository should contain:

```text
LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
GOVERNANCE.md
PRIVACY.md
THREAT-MODEL.md
ARCHITECTURE.md
```

Security vulnerabilities should have a private reporting process.

Do not require people to publicly disclose exploitable vulnerabilities in GitHub issues.

---

# 50. Development sequence

The engineering team should implement in this order:

```text
PHASE 1
Repository
Database
Authentication
Roles
Authorization

        ↓

PHASE 2
Guardian
Student
School
Driver
Vehicle
Verification

        ↓

PHASE 3
Routes
Transport plans
Trips
State machine
Audit

        ↓

PHASE 4
Pickup credentials
Driver mobile app
Offline synchronization
Location

        ↓

PHASE 5
Drop-off
Notifications
Emergency
Incidents

        ↓

PHASE 6
School dashboard
Operations dashboard
Security hardening

        ↓

PHASE 7
Pilot
```

Do not build the marketplace before the safety lifecycle works end-to-end.

---

# 51. First production pilot

Keep the first deployment intentionally small.

Target:

```text
1–3 schools
20–50 drivers
100–300 students
one constrained geographic area
```

Measure:

```text
successful pickups
successful drop-offs
missed pickups
late trips
route deviations
incidents
credential failures
emergency response times
offline synchronization failures
support requests
authorization failures
```

Do not optimize for user growth before the operational safety loop is reliable.

---

# 52. North-star architecture

The eventual system should look like:

```text
                         ┌───────────────────┐
                         │     Guardian      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Identity & Trust  │
                         └─────────┬─────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
        ┌─────────┐          ┌──────────┐          ┌──────────┐
        │ School  │          │  Driver  │          │ Student  │
        └────┬────┘          └────┬─────┘          └────┬─────┘
             │                    │                     │
             └────────────────────┼─────────────────────┘
                                  ▼
                         ┌───────────────────┐
                         │ Transport Engine  │
                         └─────────┬─────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
                  Routes         Trips        Credentials
                     │             │             │
                     └─────────────┼─────────────┘
                                   ▼
                         ┌───────────────────┐
                         │ Safety & Handoffs │
                         └─────────┬─────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
              Location          Incidents          Audit
```

The fundamental design principle is:

> **Every movement of a child should be authorized, observable to the right people, auditable, and privacy-preserving.**

---

# 53. Immediate engineering deliverables

The team can now begin with these five deliverables:

### Deliverable 1 — Backend skeleton

```text
Django
PostgreSQL/PostGIS
Redis
JWT/session authentication
Docker
CI
```

### Deliverable 2 — Domain models

Implement:

```text
User
School
Guardian
Student
GuardianRelationship
Driver
Vehicle
VerificationCase
Credential
TransportPlan
Trip
TripEvent
LocationEvent
Incident
AuditEvent
```

### Deliverable 3 — Authorization framework

Implement:

```text
RBAC
object-level permissions
school isolation
guardian/student isolation
driver/trip isolation
admin separation of duties
```

### Deliverable 4 — Trip engine

Implement:

```text
state machine
transactional transitions
idempotency
audit events
pickup credential
drop-off credential
```

### Deliverable 5 — Driver vertical slice

Build:

```text
login
today's trips
start trip
pickup
location
arrival
drop-off
complete
emergency
offline queue
```

Once these five pieces work together, the project moves from architecture to a genuinely testable product.

---

# 54. Engineering principle

The system should never ask:

> “Can this user see this record?”

as the only security question.

It should ask:

> **“Is this actor authorized to perform this specific action on this specific object, in this specific context, at this specific point in the trip lifecycle?”**

That principle should govern the implementation of the entire platform.