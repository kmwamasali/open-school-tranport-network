# Operations Web Application

This is the runnable phase-1 MVP console.

It currently includes:

- parent registration and document upload
- parent phone verification simulation
- school selection
- child registration
- driver registration and document submission
- vehicle document submission
- school registration
- school student verification
- admin document review and approval
- a local audit trail

Run it from the repository root with:

```bash
npm run dev:operations
```

The MVP uses browser storage only. The next backend milestone should move these records behind the Django REST API under `backend/`.
