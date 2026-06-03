# Vertex AI Authentication Runbook

This document captures how the Vertex authentication error was diagnosed and fixed, and how to reuse the shared auth helper across Edge Functions.

## Incident Summary

Observed runtime error in `passport-stamp-art`:

- `A credential source or subject token supplier must be specified.`

This happened while `GOOGLE_APPLICATION_CREDENTIALS_JSON` was configured as `external_account` credentials and requests were authenticated with Supabase bearer tokens.

## Root Cause

The configured `external_account` JSON did not include `credential_source`.

- `google-auth-library` external account flow expects either:
  - `credential_source`, or
  - an explicit token supplier path.
- The function was passing Supabase bearer tokens, but the environment credential shape still caused bootstrap failures before token exchange could complete.

## Resolution Implemented

1. Added structured auth diagnostics (without logging secrets) to confirm credential shape and incoming auth header state.
2. Added fallback logic for `external_account` credentials with missing `credential_source`:
   - Use incoming Supabase bearer token as the subject token.
   - Perform manual STS token exchange using `token_url`.
   - If configured, perform service-account impersonation using `service_account_impersonation_url`.
3. Kept the standard `GoogleAuth` path for:
   - properly configured `external_account` credentials, and
   - `service_account` credentials.
4. Extracted this logic into a shared helper so all Vertex-enabled functions use one implementation.

## Shared Helper

File: `supabase/functions/_shared/vertexAuth.ts`

Export:

- `getVertexAccessToken(req: Request, logPrefix?: string): Promise<string>`

Behavior:

- Reads and parses `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- Logs non-sensitive diagnostics (`credentialType`, shape flags, auth header presence/token length).
- For `external_account`:
  - Uses fallback STS+impersonation flow if `credential_source` is missing.
  - Otherwise uses `GoogleAuth` with `identityPoolTokenProvider` and Supabase bearer token.
- For other types:
  - Uses scoped `GoogleAuth` token retrieval.

## Functions Updated

- `supabase/functions/passport-stamp-art/index.ts`
  - now calls `getVertexAccessToken(req, "passport-stamp-art")`
- `supabase/functions/title-enrichment-vertex/index.ts`
  - now calls `getVertexAccessToken(req, "title-enrichment-vertex")`

## How To Reuse In New Functions

1. Import helper:

```ts
import { getVertexAccessToken } from "../_shared/vertexAuth.ts";
```

2. Resolve token inside request flow:

```ts
const accessToken = await getVertexAccessToken(req, "your-function-name");
```

3. Use token for Vertex API calls with `Authorization: Bearer <token>`.

## Required Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GCP_PROJECT_ID`
- `GCP_LOCATION`

Optional (if your federation path requires impersonation):

- `service_account_impersonation_url` inside the credentials JSON.

## Operational Notes

- This fix resolves authentication bootstrap failures.
- If responses still fail with `429 RESOURCE_EXHAUSTED`, that is quota pressure (not auth); handle with retries/fallback and/or request Vertex quota increase.
