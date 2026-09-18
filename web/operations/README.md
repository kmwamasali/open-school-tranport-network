# Operations Web Application

This is the phase-1 admin/NGO verification console.

It is intentionally limited to admin verification work:

- review submitted guardian, school, driver, and vehicle evidence
- approve verified profiles under the configured verification organization
- a local audit trail

It does not include driver onboarding, guardian self-service, or school workflows. Those live in their own portals.

Run it from the repository root with:

```bash
npm run dev:operations
```

The MVP uses browser storage only. The next backend milestone should move these records behind the Django REST API under `backend/`.
