# Backend

Django REST Framework modular monolith for the Open School Transport Network.

Phase-1 modules are organized by domain under `backend/apps/`:

- `identity`: users, roles, authentication, verification records
- `organizations`: schools and school staff
- `guardians`: guardian profiles and authorization state
- `students`: student pseudonymous identity and guardian relationships
- `drivers`: driver applications and approval status
- `vehicles`: vehicle registration and verification
- `credentials`: issued permissions and revocation state
- `transport`: transport plans, trips, and trip events
- `audit`: immutable security and operational audit events

The current runnable MVP is still browser-local in `web/operations`. The next implementation step is to replace that local store with DRF endpoints here.
