# Driver Web Application

This app owns standalone phase-1 driver and fleet-operator onboarding:

- driver application
- driver document submission
- approval status tracking
- vehicle document submission after driver identity approval
- vehicle verification status tracking

Run it from the repository root with:

```bash
npm run dev:driver
```

The app uses the shared browser-local MVP store so `web/operations` can approve submitted driver and vehicle evidence during prototyping.
