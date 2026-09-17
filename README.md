# MaMa John Open School Trasnport Network
## Privacy-Preserving Infrastructure for Safe School Transportation

**Project status:** Concept → MVP Design  
**Initial market:** Uganda  
**License direction:** Open-source core  
**Primary users:** Parents/guardians, schools, drivers/transport operators, administrators  
**Core principle:** Minimize personal data while maximizing accountability and safety.

---

# 1. Executive Summary

Open SchoolSafe Network is an open-source platform for coordinating safe transportation of children between homes, designated pickup points and schools.

The platform does **not** primarily function as a ride-hailing marketplace. Its purpose is to provide a trusted infrastructure layer connecting:

**Parents ↔ Schools ↔ Verified Drivers ↔ Vehicles ↔ Transport Operators**

The platform provides:

- privacy-preserving identity verification
- parent/guardian authorization
- school verification
- driver and vehicle verification
- transport planning
- route management
- real-time trip monitoring
- secure child handoffs
- emergency response
- incident management
- audit trails
- role-based access control
- data minimization
- open APIs and interoperable credentials

The fundamental design principle is:

> **People should be able to prove the facts necessary for a safe transaction without unnecessarily exposing their complete identity or personal information.**

---

# 2. Problem

Parents need reliable transportation for children, but several trust problems exist simultaneously.

A parent needs to know:

- Is this actually a legitimate driver?
- Has the driver been verified?
- Is the vehicle legitimate and compliant?
- Where is my child?
- Has my child entered the vehicle?
- Has my child arrived at school?
- Who received the child?
- What happens if something goes wrong?

Schools need to know:

- Which children are being transported?
- Who is authorized to transport them?
- Which drivers are active?
- Which vehicles are being used?
- Which guardians are authorized?
- What happened during a particular trip?

Drivers need:

- legitimate transport assignments
- proof that they are dealing with an authorized guardian
- simple trip workflows
- emergency support
- clear operational instructions

Administrators need:

- verification workflows
- evidence
- auditability
- suspension/revocation mechanisms
- incident management

---

# 3. Product Vision

## Vision

Build an open, interoperable trust infrastructure for child transportation that can be operated by schools, communities, NGOs, transport organizations or governments.

## Mission

Make it possible to answer five questions for every journey:

1. **Who is authorized?**
2. **Who is responsible?**
3. **Where is the child supposed to be?**
4. **Was the handoff legitimate?**
5. **What happened if something went wrong?**

---

# 4. Core Actors

## 4.1 Parent/Guardian

Capabilities:

- create account
- verify phone
- verify identity
- establish guardian relationship
- register children
- connect children to schools
- request transportation
- approve transport plans
- monitor trips
- receive notifications
- authorize pickups
- report incidents
- revoke permissions

---

## 4.2 Child

Children should have a **minimal digital identity**.

The platform should avoid exposing unnecessary child information to drivers.

Example:

```text
Student ID: STU-72A9
School: SCH-192
Transport Plan: TP-9182
Route: R-19
```

The driver should not automatically receive:

- national ID
- parent national ID
- home address
- unnecessary medical information
- complete guardian information

---

## 4.3 Driver

Capabilities:

- apply
- submit verification documents
- complete required training
- manage availability
- receive assignments
- navigate routes
- confirm pickup
- confirm drop-off
- report incidents
- trigger emergency mode

---

## 4.4 School

Capabilities:

- register school
- verify school administrators
- manage students
- validate guardian relationships
- approve transport arrangements
- manage transport zones
- monitor trips
- investigate/report incidents

---

## 4.5 Platform Administrator

Capabilities:

- verify drivers
- verify vehicles
- verify schools
- manage credentials
- suspend accounts
- revoke authorization
- investigate incidents
- access security audit logs

Administrators should **not automatically have unrestricted access** to all information.

---

# 5. Identity Model

Do not treat identity, authentication and authorization as the same thing.

The platform should distinguish:

### Authentication

> "This person controls this account."

### Identity verification

> "Evidence supports that this person is who they claim to be."

### Authorization

> "This person is allowed to perform this action."

### Credential

> "This person has a currently valid permission."

Example:

```text
PERSON
  ↓
Identity verification
  ↓
Identity ID
  ↓
Credential
  ↓
Authorized School Driver
  ↓
Expiry / Revocation
```

This separation makes the system safer and easier to scale.

---

# 6. Privacy Model

Avoid calling the system "anonymous identity verification."

The more accurate model is:

> **Pseudonymous identity + selective disclosure + verifiable authorization.**

For example, a driver can prove:

```text
Driver verified: YES
License verified: YES
Vehicle verified: YES
School transport authorization: YES
Credential valid: YES
```

without exposing their underlying identity documents to every parent.

Similarly, a parent can prove:

```text
Authorized guardian: YES
Authorized for student STU-72A9: YES
```

without exposing unnecessary personal information to the driver.

---

# 7. Data Architecture

Use separate logical domains.

## Identity database

Highly restricted:

```text
Identity
---------
identity_id
legal_name
phone
date_of_birth
identity_document_reference
verification_status
created_at
updated_at
```

## Operational database

```text
User
School
Student
GuardianRelationship
Driver
Vehicle
Route
TransportPlan
Trip
Pickup
Dropoff
Incident
Notification
Credential
```

## Document storage

Store identity documents separately from operational data.

Example:

```text
Encrypted Object Storage
├── driver identity documents
├── licences
├── vehicle documents
├── insurance
└── verification evidence
```

## Analytics

Use aggregated information whenever possible.

Prefer:

```text
Route R19
Trips: 482
Average duration: 34 minutes
Incidents: 2
```

instead of exposing individual travel histories.

---

# 8. Recommended Technology Stack

## Mobile

**Flutter**

Applications:

```text
Parent App
Driver App
```

## Web

**React / Next.js**

Applications:

```text
School Portal
Admin Portal
Operations Dashboard
```

## Backend

Recommended initial architecture:

**Django + Django REST Framework**

Alternative:

**NestJS + TypeScript**

Start with a modular monolith rather than microservices.

## Database

**PostgreSQL + PostGIS**

PostGIS provides geospatial capabilities for:

- routes
- school zones
- pickup points
- geofencing
- spatial queries

## Cache / queues

**Redis**

Use for:

- temporary tokens
- queues
- rate limiting
- real-time operational data

## Object storage

S3-compatible encrypted storage.

## Maps

Use an abstraction layer supporting OpenStreetMap-compatible services and MapLibre.

Do not hard-code the application to a single map provider.

---

# 9. High-Level Architecture

```text
                         ┌───────────────────┐
                         │   Parent App      │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │    Driver App     │
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │    API Layer      │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      Core Application       │
                    │                             │
                    │ Identity                    │
                    │ Authorization               │
                    │ Schools                     │
                    │ Guardians                   │
                    │ Students                    │
                    │ Drivers                     │
                    │ Vehicles                    │
                    │ Routes                      │
                    │ Trips                       │
                    │ Notifications               │
                    │ Incidents                   │
                    │ Audit                       │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
      ┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
      │ PostgreSQL    │    │ Redis / Queue  │    │ Object      │
      │ + PostGIS     │    │               │    │ Storage     │
      └───────────────┘    └───────────────┘    └─────────────┘
```

---

# 10. Repository Structure

```text
open-schoolsafe/
│
├── apps/
│   ├── api/
│   ├── admin-web/
│   ├── school-web/
│   ├── parent-mobile/
│   └── driver-mobile/
│
├── packages/
│   ├── identity/
│   ├── authorization/
│   ├── credentials/
│   ├── trips/
│   ├── routing/
│   ├── notifications/
│   ├── incidents/
│   └── audit/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/
│   └── deployment/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── privacy/
│   ├── API/
│   └── operations/
│
├── tests/
│
├── SECURITY.md
├── PRIVACY.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

# 11. Core Database Model

```text
User
 ├── ParentProfile
 ├── DriverProfile
 ├── SchoolAdminProfile
 └── PlatformAdminProfile

School
 └── Student

Student
 └── GuardianRelationship
       └── User

Driver
 └── Vehicle

School
 └── Route

Route
 └── TransportPlan

TransportPlan
 └── Trip

Trip
 ├── PickupEvent
 ├── DropoffEvent
 ├── LocationEvent
 ├── Incident
 └── AuditEvent
```

---

# 12. Important Database Tables

## users

```text
id
phone
email
status
created_at
updated_at
```

## identities

```text
id
user_id
verification_status
verification_provider
verified_at
```

## schools

```text
id
name
registration_reference
location
status
created_at
```

## students

```text
id
school_id
pseudonymous_identifier
status
```

## guardian_relationships

```text
id
guardian_id
student_id
relationship_type
verification_status
verified_by
verified_at
```

## drivers

```text
id
user_id
verification_status
authorization_status
credential_expiry
```

## vehicles

```text
id
driver_id
registration_reference
capacity
inspection_status
insurance_status
status
```

## routes

```text
id
school_id
name
geometry
active
```

## trips

```text
id
transport_plan_id
driver_id
vehicle_id
route_id
scheduled_start
actual_start
actual_end
status
```

---

# 13. Trip State Machine

Every trip should follow a controlled state machine.

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

Every state transition should generate an audit event.

---

# 14. Secure Child Handoff

This is one of the most important parts of the system.

Do not rely solely on GPS.

The platform needs explicit handoff confirmation.

## Pickup

```text
Parent/Guardian
      ↓
Short-lived pickup credential
      ↓
Driver verifies credential
      ↓
Child enters vehicle
      ↓
Driver confirms pickup
      ↓
Parent receives notification
```

## School arrival

```text
Vehicle
   ↓
School zone
   ↓
School transport officer
   ↓
Child handoff
   ↓
School confirms
```

## Afternoon

```text
School
   ↓
Driver
   ↓
Trip starts
   ↓
Authorized guardian
   ↓
Guardian confirms receipt
   ↓
Trip completed
```

---

# 15. Temporary Pickup Credentials

Never place sensitive information directly in QR codes.

Bad:

```text
QR
Name: Jane Doe
Child: John Doe
School: XYZ
Phone: +256...
```

Better:

```text
QR
 ↓
Random short-lived token
 ↓
Server verification
 ↓
Authorized = YES
```

Example:

```text
Token: 8F7K29
Purpose: PICKUP
Trip: TRP-19282
Expires: 07:15
```

The token should:

- expire quickly
- be usable only for the intended trip/action
- be invalidated after successful use
- resist replay attacks

---

# 16. Location Tracking

Use privacy-aware tracking.

Normal operation:

```text
GPS update
every ~15–30 seconds
```

Higher precision can be used around:

- pickup
- drop-off
- emergency
- significant route deviations

Avoid retaining detailed location history indefinitely.

---

# 17. Geofencing

Define:

```text
Pickup Zone
School Zone
Safe Route Corridor
Dropoff Zone
```

A route deviation should initially trigger:

```text
Deviation detected
       ↓
Ask driver for confirmation
       ↓
Normal explanation?
       │
       ├── YES → continue
       │
       └── NO → escalate
```

Do not automatically treat every GPS deviation as an emergency.

---

# 18. Emergency System

Driver application:

```text
┌──────────────────────┐
│                      │
│     🚨 EMERGENCY     │
│                      │
└──────────────────────┘
```

Emergency event can notify:

- operations team
- school
- authorized guardian
- designated emergency contacts

and record:

```text
trip
driver
vehicle
location
timestamp
event type
acknowledgements
actions
resolution
```

The emergency system should be designed to work during intermittent connectivity.

---

# 19. Offline-First Driver Application

The driver application should continue functioning when connectivity is weak.

Store locally:

- assigned trip
- required pickup information
- temporary credentials
- route information
- pending events

When connectivity returns:

```text
Local events
     ↓
Signed/validated event queue
     ↓
Server synchronization
     ↓
Conflict resolution
```

Sensitive local information should be encrypted.

---

# 20. Driver Verification

Driver onboarding:

```text
APPLICATION
     ↓
IDENTITY
     ↓
LICENCE
     ↓
VEHICLE
     ↓
INSURANCE
     ↓
INSPECTION
     ↓
REQUIRED SAFEGUARDING CHECKS
     ↓
TRAINING
     ↓
ADMIN REVIEW
     ↓
APPROVED
```

Every verification decision should record:

```text
reviewer
timestamp
evidence
decision
reason
expiry
```

---

# 21. Separation of Duties

Do not allow one administrator to control every stage.

Example:

```text
Verifier
   ↓
checks evidence

Reviewer
   ↓
reviews verification

Administrator
   ↓
activates credential
```

For high-risk actions, require two-person approval.

Examples:

- driver activation
- suspension removal
- identity override
- guardian override
- incident closure
- deletion of sensitive records

---

# 22. Credential Model

Eventually implement verifiable credentials.

Example:

```text
Driver Credential

Credential ID: VC-83921
Subject: Driver-8291

Claims:
✓ Identity verified
✓ Licence verified
✓ Vehicle verified
✓ Transport authorization

Issued: 2026-09-01
Expires: 2027-09-01
Status: ACTIVE
```

The platform should support credential revocation.

A credential is trusted because it is:

```text
issued
+
valid
+
unexpired
+
not revoked
```

---

# 23. Cryptography

Use established standards and libraries.

Do not invent cryptographic protocols.

Potential primitives:

```text
TLS 1.3
Argon2id
AES-256-GCM
Ed25519
SHA-256
```

Keys should be managed through a proper key-management system.

Never:

- hard-code encryption keys
- store keys in Git
- invent encryption algorithms
- create custom authentication protocols

---

# 24. Authentication

Support:

### Primary

Passkeys/WebAuthn where practical.

### Local fallback

Phone-based OTP.

For administrators:

**mandatory MFA.**

For especially sensitive actions:

```text
authentication
+
step-up authentication
```

---

# 25. Authorization

Implement centralized authorization.

Use role + resource + action.

Example:

```text
Parent
  CAN_VIEW
  own_children

Driver
  CAN_VIEW
  assigned_trips

SchoolAdmin
  CAN_VIEW
  students_at_their_school

PlatformAdmin
  CAN_VERIFY
  drivers
```

Never rely solely on frontend controls.

Every API request must independently verify authorization.

---

# 26. Threat Model

Primary threats:

| Threat | Mitigation |
|---|---|
| Account takeover | MFA/passkeys, rate limits |
| Fake driver | identity/document verification |
| Fake school | organizational verification |
| Fake guardian | guardian relationship verification |
| QR replay | short-lived one-time tokens |
| Insider abuse | least privilege + audit logs |
| GPS stalking | minimized access + retention |
| API enumeration | opaque IDs + authorization |
| Database breach | encryption + data minimization |
| Stolen phone | encrypted local storage + session revocation |
| Credential theft | short expiry + revocation |
| Malicious administrator | separation of duties |
| Ransomware | immutable/offline backups |
| Fake documents | verification workflow |
| Collusion | independent audit trails |

---

# 27. Audit System

Important events should generate immutable audit records.

Example:

```text
AuditEvent

id
actor_id
actor_role
action
resource_type
resource_id
timestamp
ip_reference
device_reference
reason
previous_state
new_state
```

Examples:

```text
DRIVER_APPROVED
GUARDIAN_VERIFIED
CHILD_ASSIGNED
TRIP_STARTED
PICKUP_CONFIRMED
DROP_OFF_CONFIRMED
ADMIN_VIEWED_RECORD
DRIVER_SUSPENDED
INCIDENT_CREATED
```

---

# 28. Incident Management

Incident object:

```text
Incident
├── reporter
├── trip
├── student
├── driver
├── vehicle
├── school
├── category
├── severity
├── description
├── evidence
├── location
├── timestamp
├── investigator
├── status
└── resolution
```

Categories:

- late pickup
- missed pickup
- vehicle problem
- unsafe driving
- unauthorized person
- child missing
- harassment
- accident
- medical emergency
- route deviation
- safeguarding concern
- other

---

# 29. Child Safeguarding

Create a dedicated safeguarding policy.

It should cover:

- driver conduct
- adult/child interaction
- communication
- prohibited behaviour
- reporting
- escalation
- evidence
- suspension
- emergency response
- information access

The architecture should minimize direct private communication between drivers and children.

Prefer:

```text
Child
  ↓
Platform
  ↓
Guardian / School / Driver
```

rather than unrestricted:

```text
Driver ↔ Child
```

---

# 30. Privacy Principles

Adopt:

### Data minimization

Collect only what is necessary.

### Purpose limitation

Use data only for defined purposes.

### Least privilege

People see only what they need.

### Separation

Identity information is separated from operational information.

### Short retention

Delete or aggregate information when it is no longer needed.

### Transparency

Users can understand what information the platform holds.

### Accountability

Sensitive access is logged.

---

# 31. Parent Privacy Dashboard

Parent should be able to see:

```text
MY DATA

Identity
✓ Verified

Children
2

Active transport plans
2

Trip history
30 days

Documents
2

Data sharing
School: YES
Assigned driver: LIMITED
```

Provide:

- data access
- correction
- export
- consent management
- applicable deletion requests
- account closure

Subject to applicable legal retention requirements.

---

# 32. Admin Dashboard

Dashboard sections:

```text
Overview
│
├── Pending Drivers
├── Pending Schools
├── Pending Guardians
├── Active Trips
├── Emergencies
├── Incidents
├── Suspended Drivers
├── Expiring Credentials
├── Vehicles
├── Routes
└── Audit Logs
```

---

# 33. Parent App

Primary screens:

```text
Home
│
├── My Children
├── Today's Trips
├── Live Trip
├── Transport Plans
├── Notifications
├── Emergency
├── Report Issue
└── Account & Privacy
```

The UI should prioritize:

> **Where is my child and has the handoff happened?**

---

# 34. Driver App

Primary screens:

```text
Today
│
├── Next Trip
├── Route
├── Pickup
├── Students
├── Drop-off
├── Incident
├── Emergency
└── Profile
```

The driver interface should be extremely simple while driving.

Avoid unnecessary interaction while the vehicle is moving.

---

# 35. School Portal

```text
Dashboard
│
├── Students
├── Guardians
├── Drivers
├── Vehicles
├── Routes
├── Active Trips
├── Incidents
├── Transport Policies
└── Reports
```

---

# 36. API Design

Example:

```http
POST /v1/auth/start
POST /v1/auth/verify

GET /v1/me

GET /v1/students
POST /v1/students

GET /v1/transport-plans
POST /v1/transport-plans

GET /v1/trips/{id}
POST /v1/trips/{id}/pickup
POST /v1/trips/{id}/dropoff

POST /v1/incidents
GET /v1/incidents/{id}

GET /v1/drivers/{id}/credential
POST /v1/drivers/{id}/verify

POST /v1/emergency
```

API identifiers should use opaque identifiers rather than predictable sequential IDs.

Bad:

```text
/student/1
/student/2
/student/3
```

Prefer:

```text
/student/STU-7F82A9
```

Authorization remains mandatory regardless of ID format.

---

# 37. Notifications

Create a notification abstraction.

```text
NotificationService
       │
 ┌─────┼─────────┐
 │     │         │
SMS   Push     Email
```

Potential future channels:

- WhatsApp
- USSD
- voice
- school communication systems

The core application should not depend on any one vendor.

---

# 38. Low-Connectivity Strategy

Uganda-first design should account for unreliable connectivity.

Important features:

- offline trip data
- queued events
- SMS fallback
- low-bandwidth APIs
- compressed GPS messages
- retry logic
- idempotent operations
- local encrypted storage

Critical operations should not fail merely because a data connection temporarily disappears.

---

# 39. Payments

Payments are not part of the first MVP as they are not essential.

Later create:

```text
Payment abstraction
        ↓
Mobile money
Card
Bank
Cash reconciliation
```

Never store unnecessary payment credentials in the core application.

---

# 40. Business Model

The software can remain open source.

Potential revenue:

### Managed hosting

Schools/organizations pay for hosting.

### Support

Paid implementation and technical support.

### Enterprise features

Advanced:

- fleet management
- analytics
- integrations
- SLA
- dedicated infrastructure

### Messaging

Charge for external SMS/communications where necessary.

### Deployment

NGOs, schools and organizations can commission deployments.

---

# 41. Open-Source Strategy

The core platform should include:

- source code
- database schema
- API specification
- security model
- deployment configuration
- documentation
- contribution guidelines

Possible licenses to evaluate:

- Apache 2.0
- AGPLv3
- MIT

The choice should be made based on whether you want downstream hosted modifications to remain open.

---

# 42. Open Protocol

The long-term goal should be an open **School Transport Trust Protocol**.

A third-party application should eventually be able to:

```text
Register school
     ↓
Issue credential
     ↓
Verify driver
     ↓
Create trip
     ↓
Confirm pickup
     ↓
Confirm drop-off
     ↓
Report incident
```

without being forced to use your particular mobile application.

---

# 43. MVP Scope

## Parent

- account
- phone verification
- identity verification
- child registration
- school association
- transport request
- trip tracking
- notifications
- pickup/drop-off confirmation
- incident reporting

## Driver

- account
- verification application
- document submission
- approval status
- assigned trips
- navigation
- pickup confirmation
- drop-off confirmation
- incident reporting
- emergency

## School

- registration
- verification
- student management
- guardian validation
- route management
- trip monitoring
- incident management

## Admin

- driver verification
- vehicle verification
- school verification
- guardian verification
- credential management
- suspension
- incident investigation
- audit logs

---

# 44. Features Deliberately Excluded from MVP

Initial build does not have:

- blockchain
- cryptocurrency
- facial recognition
- AI driver scoring
- public driver ratings
- dynamic pricing
- autonomous dispatch
- complex social features
- advertising
- sophisticated predictive analytics
- zero-knowledge proof infrastructure

These can be evaluated after the fundamental safety workflow works.

---

# 45. Pilot

Start small.

Recommended pilot:

```text
1–3 schools
20–50 drivers
100–300 children
```

Use a geographically constrained area.

Run real trips.

Measure operational reality before expanding.

---

# 46. Key Metrics

## Safety

- successful handoffs
- unauthorized pickup attempts
- incidents
- emergency response time
- unresolved incidents

## Reliability

- on-time pickup rate
- on-time arrival rate
- missed trips
- route deviations

## Verification

- verification completion rate
- expired credentials
- revoked credentials
- verification turnaround time

## Privacy/security

- unauthorized access attempts
- account takeover attempts
- credential misuse
- sensitive-data access events

## Economics

```text
cost per child/trip
cost per route
driver earnings
SMS cost
GPS/data cost
administration cost
```

---

# 47. Development Plan

## Days 1–3 — Discovery

- interview parents
- interview schools
- interview drivers
- map transport workflows
- document legal/privacy requirements
- create threat model
- define MVP
- create UX prototypes

Deliverables:

```text
Requirements
User journeys
Threat model
Data map
Architecture v1
```

---

## Days 4–6 — Foundation

Build:

- repository
- CI/CD
- authentication
- users
- roles
- schools
- database
- API foundation
- audit system
- admin foundation

Deliverable:

> Development-ready platform skeleton.

---

## Days 7–10 — Verification

Build:

- driver application
- document submission
- admin review
- school verification
- guardian verification
- credentials
- expiry
- suspension/revocation

---

## Days 11–15 — Transportation

Build:

- routes
- transport plans
- trip engine
- driver assignments
- GPS
- pickup
- drop-off
- notifications

---

## Days 16–25 — Safety

Build:

- emergency
- incidents
- route deviations
- audit review
- security controls
- offline synchronization

---

## Days 25–60 — Pilot

- deploy
- onboard schools
- onboard drivers
- onboard parents
- run controlled journeys
- collect feedback
- perform security review
- fix operational problems

---

# 48. Definition of MVP Success

The MVP is successful if:

```text
Parent
   ↓
knows who is transporting child
   ↓
Driver
   ↓
is verified and authorized
   ↓
Child
   ↓
is picked up by authorized driver
   ↓
Trip
   ↓
can be monitored
   ↓
School
   ↓
receives child
   ↓
Authorized guardian
   ↓
receives child
   ↓
Trip
   ↓
is auditable
```

If any part of that chain fails, the system needs to make the failure visible and actionable.

---

# 49. Security Release Checklist

Before pilot:

```text
[ ] HTTPS everywhere
[ ] Secure password hashing
[ ] MFA for administrators
[ ] Rate limiting
[ ] API authorization tests
[ ] Object-level authorization
[ ] Encrypted sensitive data
[ ] Encrypted document storage
[ ] Secure mobile storage
[ ] Short-lived pickup tokens
[ ] Token replay protection
[ ] Audit logging
[ ] Admin access monitoring
[ ] Backup system
[ ] Restore testing
[ ] Dependency scanning
[ ] Secret scanning
[ ] Security headers
[ ] Input validation
[ ] File upload validation
[ ] Incident response plan
[ ] Account recovery procedure
```

---

# 50. Operational Safety Checklist

Before activating a driver:

```text
[ ] Identity verified
[ ] Licence verified
[ ] Vehicle verified
[ ] Inspection verified
[ ] Insurance verified
[ ] Required permits verified
[ ] Required safeguarding checks completed
[ ] Training completed
[ ] Emergency contacts recorded
[ ] Credential issued
[ ] Expiry configured
```

---

# 51. Legal & Compliance Workstream

Create a separate compliance package for Uganda.

It should cover at minimum:

- Data Protection and Privacy
- children's personal data
- consent/guardian authorization
- data retention
- access requests
- correction/deletion rights where applicable
- cross-border data handling
- driver requirements
- vehicle requirements
- school transport requirements
- insurance
- incident reporting
- employment/contractor classification
- platform liability
- safeguarding

Do not treat legal compliance as a feature to be added after development.

It should influence the data architecture from the beginning.

---

# 52. Fundamental Design Rules

The project should adopt these as engineering principles:

### Rule 1

**Never collect data merely because it might be useful later.**

### Rule 2

**Never expose data merely because someone has access to the application.**

### Rule 3

**Every sensitive action must have an authorization decision.**

### Rule 4

**Every important safety event must be auditable.**

### Rule 5

**Credentials expire and can be revoked.**

### Rule 6

**A GPS signal is not proof of a child handoff.**

### Rule 7

**A rating is not a safety certification.**

### Rule 8

**The platform must continue functioning under poor connectivity.**

### Rule 9

**Security must be designed into the architecture, not added later.**

### Rule 10

**The open-source protocol should outlive any individual application.**

---

# 53. Long-Term Architecture

Eventually:

```text
                 SCHOOLSAFE PROTOCOL
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   School App       Transport App    Parent App
        │                │                │
        └────────────────┼────────────────┘
                         │
                  TRUST SERVICES
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
 Identity            Credentials        Safety
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  Transport Network
```

This allows different organizations to operate compatible systems.

---

# 54. Strategic Positioning

The strongest version of the project is not:

> "An Uber alternative for children."

It is:

> **"Open-source, privacy-preserving trust infrastructure for child transportation."**

Transportation companies can use it.

Schools can use it.

Parent cooperatives can use it.

NGOs can deploy it.

Government programs can integrate with it.

Individual transport operators can build applications on top of it.

The platform therefore becomes infrastructure rather than simply another consumer application.

---

# 55. Immediate Next Engineering Artifacts

The next development package should contain:

```text
01-product-requirements.md
02-system-architecture.md
03-threat-model.md
04-privacy-model.md
05-database-schema.md
06-api-specification.yaml
07-trip-state-machine.md
08-credential-model.md
09-security-architecture.md
10-safeguarding-policy.md
11-uganda-compliance.md
12-mobile-app-spec.md
13-admin-dashboard-spec.md
14-deployment-architecture.md
15-mvp-github-backlog.md
16-contributing.md
17-security.md
18-open-source-license.md
```

These documents become the project's **technical source of truth**.

---

# 56. Recommended First Technical Milestone

Before implementing mobile applications, build a vertical slice:

```text
Parent
  ↓
Create account
  ↓
Verify
  ↓
Add child
  ↓
School validates guardian
  ↓
Verified driver
  ↓
Create transport plan
  ↓
Assign driver
  ↓
Create trip
  ↓
Driver starts trip
  ↓
Pickup token
  ↓
Pickup confirmed
  ↓
Trip tracked
  ↓
School arrival
  ↓
Drop-off confirmed
  ↓
Guardian notified
  ↓
Audit record created
```

If this complete journey works securely, you have the foundation of the product.

Everything else can grow around it.