# Deployment Playbook

This project is already configured for Vercel via [`vercel.json`](/Users/yuanqiwen/Desktop/shipany-template-two-dev/vercel.json).

## Recommended Path

Use Vercel for the first stable production URL.

Why:
- Native fit for Next.js app routes and server functions.
- Lowest setup overhead for this repository.
- Easy preview and production promotion flow.

## Demo-Only Deployment

Use this mode when you want a stable public URL for the interview scheduler before wiring up auth and database.

Required environment variables:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `AUTH_URL`
- `AUTH_SECRET`
- `EVOLINK_API_KEY`
- `EVOLINK_BASE_URL`
- `INTERVIEW_SCHEDULER_PUBLIC_DEMO_ENABLED=true`

Behavior:
- The public landing page works normally.
- `/api/interview-scheduler/plan` accepts anonymous requests.
- The interview scheduler can call the Evolink model without requiring sign-in.
- Other authenticated product areas still need a database-backed auth setup.

## Full Production Deployment

Use this mode when you want sign-in, saved settings, and authenticated agent flows.

Additional environment variables:
- `DATABASE_PROVIDER`
- `DATABASE_URL`
- `DB_SINGLETON_ENABLED`
- `DB_MAX_CONNECTIONS`

Recommended additions depending on your setup:
- Resend or SMTP email credentials
- OAuth provider credentials
- Payment credentials if billing is enabled

## Vercel CLI Flow

From the repository root:

```bash
npx vercel login
npx vercel
npx vercel --prod
```

Then set environment variables in the Vercel project settings and redeploy.

## First Stable URL Checklist

1. Set `NEXT_PUBLIC_APP_URL` to the final production domain.
2. Set `AUTH_URL` to the same public URL.
3. Generate a strong `AUTH_SECRET`.
4. Add `EVOLINK_API_KEY`.
5. For demo launch, set `INTERVIEW_SCHEDULER_PUBLIC_DEMO_ENABLED=true`.
6. Redeploy production.

## Current Recommendation

For the fastest launch of the interview scheduler:

- Deploy on Vercel
- Use demo-only mode first
- Turn on database-backed auth in the next pass
